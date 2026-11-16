import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const siteConfig = readFileSync(new URL("./site-config.js", import.meta.url), "utf8");

test("la compra múltiple conserva el precio como dato del servidor", () => {
  assert.match(app, /remote\.unitAmount/);
  assert.match(app, /checkoutRuntime\.unitAmount \* quantity/);
  assert.match(app, /quantity: normalizeQuantity/);
  assert.doesNotMatch(app, /unitAmount:\s*payload/);
  assert.doesNotMatch(app, /price:\s*payload/);
});

test("la interfaz incluye comprador, cantidad y asistentes pospago", () => {
  for (const id of [
    "seatQuantity", "quantityDecrease", "quantityIncrease", "buyerName",
    "buyerEmail", "buyerPhone", "buyerAttends", "paymentResult",
    "attendeesForm", "recoveryForm"
  ]) assert.match(html, new RegExp(`id=["']${id}["']`));
  assert.match(app, /POST|method:\s*"POST"/);
  assert.match(app, /\/attendees/);
  assert.match(app, /\/recover/);
});

test("el navegador no persiste PII y no declara éxito por la URL", () => {
  assert.doesNotMatch(app, /localStorage/);
  assert.doesNotMatch(app, /Math\.random/);
  assert.match(app, /sessionStorage/);
  assert.match(app, /getReservationStatus\(\)/);
  assert.match(app, /"X-Reservation-Token": checkoutRuntime\.token/);
  assert.doesNotMatch(app, /\?token=\$\{encodeURIComponent\(checkoutRuntime\.token\)\}/);
  assert.match(app, /payment_status|paymentStatus|reservationState/);
  assert.match(html, /name="referrer" content="no-referrer"/);
});

test("la capacidad desconocida no reduce la compra múltiple a un lugar", () => {
  assert.match(app, /available !== null && available !== undefined/);
  assert.match(app, /checkoutRuntime\.maxPerOrder = Math\.max\(1, Math\.min/);
});

test("el cobro real no está activado en la configuración estática", () => {
  assert.match(siteConfig, /enabled:\s*false/);
  assert.match(siteConfig, /mode:\s*"test"/);
  assert.match(siteConfig, /imdiil-webhook-production\.up\.railway\.app\/ia-event/);
});

test("la composición de compra tiene ajustes móviles", () => {
  assert.match(css, /@media \(max-width: 720px\)/);
  assert.match(css, /\.buyer-fields, \.attendee-entry, \.recovery-panel form/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*\.quantity-row/);
});

test("el resultado y la redirección no anticipan un pago", () => {
  assert.match(html, /id="resultTotalLabel">Total</);
  assert.match(app, /state === "paid" \? "Total pagado" : "Total"/);
  assert.match(app, /url\.protocol !== "https:" \|\| url\.hostname !== "checkout\.stripe\.com"/);
  assert.match(app, /#mobilePrice/);
});

test("los errores recuperables no quedan como pago pendiente", () => {
  assert.match(app, /"checkout_error"/);
  assert.match(app, /data\.code === "checkout_failed"/);
  assert.match(app, /error\.code = String\(data\.code/);
  assert.match(app, /!stripeSessionId && \["checkout_error", "checkout_failed"\]\.includes\(errorCode\)/);
  assert.match(app, /return "checkout_error"/);
  assert.match(app, /No pudimos abrir el pago en este momento/);
});

test("el banner refleja solo la configuración confirmada por el backend", () => {
  assert.match(app, /function setReviewBanner\(state, label, note\)/);
  assert.match(app, /setReviewBanner\("live", "Inscripción disponible"/);
  assert.match(app, /setReviewBanner\("test", "Modo de prueba"/);
  assert.match(app, /setReviewBanner\("disabled", "Inscripción en preparación"/);
  assert.match(app, /setReviewBanner\("unavailable", "Disponibilidad no confirmada"/);
  assert.match(app, /remote\.enabled === true/);
});

test("la llamada móvil no cubre el formulario de inscripción", () => {
  assert.match(app, /setupMobileCheckoutCta/);
  assert.match(app, /IntersectionObserver/);
  assert.match(css, /\.mobile-cta\.is-context-hidden/);
});
