// ═══════════════════════════════════════════════════════════════════
// services/stripe.js · handlers de eventos de Stripe
// Cada función procesa un tipo específico de evento del webhook
// ═══════════════════════════════════════════════════════════════════

import { stripe, STRIPE_CONFIG } from '../config/stripe.js';
import {
  upsertMiembro, updateMiembroBySubscription, registrarPago
} from './firestore.js';

// ───────────────────────────────────────────────────────────────
// checkout.session.completed
// Se dispara cuando un usuario completa el pago.
// Activa la membresía en Firestore.
// ───────────────────────────────────────────────────────────────
export async function handleCheckoutCompleted(session) {
  const uid = session.client_reference_id || session.metadata?.uid;
  const email = session.customer_email || session.customer_details?.email;
  const customerId = session.customer;
  const subscriptionId = session.subscription;
  const plan = session.metadata?.plan || 'desconocido';

  if (!uid && !email) {
    console.warn('⚠️  Checkout sin uid ni email · session:', session.id);
    return;
  }

  // Obtener detalles de la suscripción para período de renovación
  let periodoFin = null;
  if (subscriptionId) {
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      periodoFin = new Date(sub.current_period_end * 1000);
    } catch (e) {
      console.warn('⚠️  No pudimos obtener detalles de suscripción:', e.message);
    }
  }

  const docId = await upsertMiembro({
    uid, email, plan, customerId, subscriptionId, periodoFin
  });

  console.log('✅ Miembro activado:', docId, '·', plan, '·', email);
}

// ───────────────────────────────────────────────────────────────
// customer.subscription.updated / deleted
// Se dispara cuando cambia el estado de una suscripción
// (renovación, cancelación, pago fallido reiterado, etc.)
// ───────────────────────────────────────────────────────────────
export async function handleSubscriptionChange(subscription) {
  const subId = subscription.id;
  const status = subscription.status;
  const activo = ['active', 'trialing'].includes(status);

  const docId = await updateMiembroBySubscription(subId, {
    activo,
    estado: status,
    fechaProximaRenovacion: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000)
      : null
  });

  if (!docId) {
    console.warn('⚠️  Subscription cambió pero no hay miembro:', subId);
    return;
  }
  console.log('🔄 Suscripción actualizada:', docId, '·', status, '· activo:', activo);
}

// ───────────────────────────────────────────────────────────────
// invoice.payment_succeeded
// Se dispara con cada cobro exitoso (mensual o anual recurrente)
// ───────────────────────────────────────────────────────────────
export async function handleInvoicePaid(invoice) {
  if (!invoice.subscription) return;

  await registrarPago({
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    customerId: invoice.customer,
    email: invoice.customer_email,
    monto: (invoice.amount_paid || 0) / 100,
    moneda: invoice.currency,
    estado: 'pagado',
    fechaPago: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000) : new Date()
  });

  console.log('💰 Pago registrado:', invoice.id, '·',
    (invoice.amount_paid / 100), invoice.currency);
}

// ───────────────────────────────────────────────────────────────
// invoice.payment_failed
// Se dispara cuando una renovación automática falla
// ───────────────────────────────────────────────────────────────
export async function handleInvoiceFailed(invoice) {
  if (!invoice.subscription) return;

  await registrarPago({
    invoiceId: invoice.id,
    subscriptionId: invoice.subscription,
    customerId: invoice.customer,
    email: invoice.customer_email,
    monto: (invoice.amount_due || 0) / 100,
    moneda: invoice.currency,
    estado: 'fallido',
    fechaPago: new Date()
  });

  console.log('⚠️  Pago falló:', invoice.id);
}

// ───────────────────────────────────────────────────────────────
// Crear sesión de Embedded Checkout
// ───────────────────────────────────────────────────────────────
export async function createCheckoutSession({ plan, uid, email }) {
  if (!['mensual', 'anual'].includes(plan)) {
    throw new Error('Plan inválido (debe ser mensual o anual)');
  }
  const price = plan === 'mensual'
    ? STRIPE_CONFIG.priceMensual
    : STRIPE_CONFIG.priceAnual;
  if (!price) throw new Error('Stripe price IDs no configurados');

  const session = await stripe.checkout.sessions.create({
    ui_mode: 'embedded',
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    client_reference_id: uid || undefined,
    customer_email: email || undefined,
    metadata: { plan, uid: uid || '', source: 'imdiil-panel' },
    subscription_data: {
      metadata: { plan, uid: uid || '' }
    },
    return_url: `${STRIPE_CONFIG.panelUrl}/vip-panel.html?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    locale: 'es-419',
    payment_method_types: ['card'],
    // Habilitar campo de código de descuento en el Embedded Checkout
    allow_promotion_codes: true
  });

  return { clientSecret: session.client_secret, sessionId: session.id };
}

export async function retrieveSession(sessionId) {
  const s = await stripe.checkout.sessions.retrieve(sessionId);
  return {
    status: s.status,
    payment_status: s.payment_status,
    customer_email: s.customer_details?.email,
    plan: s.metadata?.plan
  };
}

// ───────────────────────────────────────────────────────────────
// Verificar la firma del webhook (seguridad)
// ───────────────────────────────────────────────────────────────
export function verifyWebhookSignature(rawBody, signature) {
  return stripe.webhooks.constructEvent(
    rawBody, signature, STRIPE_CONFIG.webhookSecret
  );
}

// ───────────────────────────────────────────────────────────────
// Cancelar suscripción (cancel_at_period_end: true)
// El usuario sigue teniendo acceso hasta el final del periodo pagado,
// pero después NO se le cobra ni renueva.
// ───────────────────────────────────────────────────────────────
export async function cancelSubscriptionAtPeriodEnd({ uid, email }) {
  // 1. Validación de input
  if (!uid && !email) {
    throw new Error('Se requiere uid o email para identificar al miembro');
  }

  // 2. Importar getMembership y buscar al miembro en Firestore
  const { getMembership } = await import('./firestore.js');
  const member = await getMembership(uid);

  if (!member) {
    throw new Error('No encontramos tu membresía. Contacta soporte por WhatsApp.');
  }

  if (!member.stripeSubscriptionId) {
    throw new Error('Esta membresía no tiene suscripción de Stripe activa.');
  }

  if (member.activo === false) {
    throw new Error('Esta membresía ya está inactiva.');
  }

  // 3. Llamar a Stripe para programar cancelación al final del periodo
  const subscription = await stripe.subscriptions.update(
    member.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
      metadata: {
        canceled_by_user_at: new Date().toISOString(),
        canceled_uid: uid || 'unknown',
        canceled_email: email || 'unknown'
      }
    }
  );

  // 4. Calcular fecha de fin de acceso (último día pagado)
  const finAcceso = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  console.log(`🚫 Cancelación programada · ${email || uid} · subId ${member.stripeSubscriptionId} · finAcceso ${finAcceso?.toISOString()}`);

  // 5. Marcar en Firestore que tiene cancelación pendiente
  // (El webhook customer.subscription.updated también lo hará, pero esto es inmediato)
  try {
    const { db, FieldValue } = await import('../config/firebase.js');
    await db.collection('miembros').doc(uid).set({
      cancelacionProgramada: true,
      fechaCancelacionProgramada: FieldValue.serverTimestamp(),
      fechaFinAcceso: finAcceso,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('⚠️  No pudimos marcar cancelación programada en Firestore:', e.message);
    // No tiramos error, la cancelación en Stripe ya está hecha
  }

  return {
    success: true,
    finAcceso: finAcceso?.toISOString(),
    cancelAtPeriodEnd: true,
    subscriptionId: member.stripeSubscriptionId
  };
}

// ───────────────────────────────────────────────────────────────
// Reactivar suscripción (cancel_at_period_end: false)
// Si el usuario cambió de opinión antes de que termine el periodo,
// puede reactivar y seguir pagando como si nada hubiera pasado.
// ───────────────────────────────────────────────────────────────
export async function reactivateSubscription({ uid, email }) {
  if (!uid && !email) {
    throw new Error('Se requiere uid o email');
  }

  const { getMembership } = await import('./firestore.js');
  const member = await getMembership(uid);

  if (!member || !member.stripeSubscriptionId) {
    throw new Error('No encontramos tu suscripción.');
  }

  const subscription = await stripe.subscriptions.update(
    member.stripeSubscriptionId,
    { cancel_at_period_end: false }
  );

  console.log(`✅ Suscripción reactivada · ${email || uid} · subId ${member.stripeSubscriptionId}`);

  try {
    const { db, FieldValue } = await import('../config/firebase.js');
    await db.collection('miembros').doc(uid).set({
      cancelacionProgramada: false,
      fechaCancelacionProgramada: null,
      fechaFinAcceso: null,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
  } catch (e) {
    console.warn('⚠️  No pudimos limpiar cancelación en Firestore:', e.message);
  }

  return {
    success: true,
    cancelAtPeriodEnd: false,
    subscriptionId: member.stripeSubscriptionId
  };
}

// ───────────────────────────────────────────────────────────────
// Crear sesión del Billing Portal de Stripe
// (para que el usuario actualice tarjeta, vea facturas, etc.)
// ───────────────────────────────────────────────────────────────
export async function createBillingPortalSession({ uid, email, returnUrl }) {
  if (!uid && !email) {
    throw new Error('Se requiere uid o email');
  }

  const { getMembership } = await import('./firestore.js');
  const member = await getMembership(uid);

  if (!member || !member.stripeCustomerId) {
    throw new Error('No encontramos tu cliente de Stripe.');
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: member.stripeCustomerId,
    return_url: returnUrl || 'https://www.imdiil.com/vip-panel.html'
  });

  return {
    success: true,
    url: portalSession.url
  };
}

// ───────────────────────────────────────────────────────────────
// Dispatcher: enruta cada tipo de evento a su handler
// ───────────────────────────────────────────────────────────────
export async function processWebhookEvent(event) {
  console.log('📥 Stripe event:', event.type, '·', event.id);

  switch (event.type) {
    case 'checkout.session.completed':
      await handleCheckoutCompleted(event.data.object);
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await handleSubscriptionChange(event.data.object);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaid(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handleInvoiceFailed(event.data.object);
      break;
    default:
      console.log('   (sin handler para este evento)');
  }
}
