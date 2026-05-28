// ═══════════════════════════════════════════════════════════════════
// routes/stripe.js · endpoints relacionados con Stripe
// ═══════════════════════════════════════════════════════════════════

import express from 'express';
import {
  verifyWebhookSignature, processWebhookEvent,
  createCheckoutSession, retrieveSession,
  cancelSubscriptionAtPeriodEnd, reactivateSubscription,
  createBillingPortalSession
} from '../services/stripe.js';

const router = express.Router();

// ───────────────────────────────────────────────────────────────
// POST /stripe/webhook
// Recibe eventos de Stripe. Necesita raw body (sin JSON parser).
// El raw body se configura en index.js antes de express.json()
// ───────────────────────────────────────────────────────────────
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = verifyWebhookSignature(req.body, sig);
  } catch (err) {
    console.error('⚠️  Webhook signature invalid:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await processWebhookEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error('❌ Error procesando webhook:', err);
    res.status(500).send('Error interno');
  }
});

// ───────────────────────────────────────────────────────────────
// POST /stripe/checkout
// Crea una sesión de Embedded Checkout y devuelve el clientSecret
// ───────────────────────────────────────────────────────────────
router.post('/checkout', express.json(), async (req, res) => {
  try {
    const { plan, uid, email } = req.body;
    const result = await createCheckoutSession({ plan, uid, email });
    res.json(result);
  } catch (err) {
    console.error('❌ /stripe/checkout error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// GET /stripe/session/:id
// Consulta el estado de una sesión (para la página de éxito)
// ───────────────────────────────────────────────────────────────
router.get('/session/:id', async (req, res) => {
  try {
    const result = await retrieveSession(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /stripe/cancel-subscription
// Cancela la suscripción al final del periodo pagado.
// El usuario mantiene acceso hasta fechaFinAcceso, después se desactiva.
// Body: { uid, email }
// ───────────────────────────────────────────────────────────────
router.post('/cancel-subscription', express.json(), async (req, res) => {
  try {
    const { uid, email } = req.body || {};
    const result = await cancelSubscriptionAtPeriodEnd({ uid, email });
    res.json(result);
  } catch (err) {
    console.error('❌ /stripe/cancel-subscription error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /stripe/reactivate-subscription
// Si el usuario canceló y se arrepiente antes de que termine el periodo,
// reactiva la suscripción para que siga renovando automáticamente.
// Body: { uid, email }
// ───────────────────────────────────────────────────────────────
router.post('/reactivate-subscription', express.json(), async (req, res) => {
  try {
    const { uid, email } = req.body || {};
    const result = await reactivateSubscription({ uid, email });
    res.json(result);
  } catch (err) {
    console.error('❌ /stripe/reactivate-subscription error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ───────────────────────────────────────────────────────────────
// POST /stripe/create-billing-portal
// Crea sesión del Billing Portal de Stripe (gestión de tarjeta,
// historial de facturas, etc.). Devuelve URL para redirigir.
// Body: { uid, email, returnUrl }
// ───────────────────────────────────────────────────────────────
router.post('/create-billing-portal', express.json(), async (req, res) => {
  try {
    const { uid, email, returnUrl } = req.body || {};
    const result = await createBillingPortalSession({ uid, email, returnUrl });
    res.json(result);
  } catch (err) {
    console.error('❌ /stripe/create-billing-portal error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

export default router;
