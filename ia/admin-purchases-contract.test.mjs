import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../vip-admin.html", import.meta.url), "utf8");
const app = readFileSync(new URL("../assets/imdiil-admin-ia-purchases.js", import.meta.url), "utf8");
const css = readFileSync(new URL("../assets/imdiil-admin-ia-purchases.css", import.meta.url), "utf8");

test("compras IA vive dentro del panel real y es accesible en móvil", () => {
  assert.match(html, /class="nav-item" data-section="compras-ia"/);
  assert.match(html, /class="mobile-nav__item" data-section="compras-ia"/);
  assert.match(html, /imdiil-admin-ia-purchases\.css/);
  assert.match(html, /imdiil-admin-ia-purchases\.js/);
  assert.match(app, /pages\['compras-ia'\]/);
});

test("el contrato admin separa live y test y usa estados canónicos", () => {
  assert.match(app, /API_ROOT \+ '\/orders\?'/);
  assert.match(app, /query\.set\('mode', state\.mode\)|new URLSearchParams\(\{ mode:state\.mode/);
  assert.match(app, /pending_payment/);
  assert.match(app, /checkout_open/);
  assert.match(app, /creating_checkout/);
  assert.match(app, /params\.set\('state', state\.filter\)/);
  assert.match(app, /params\.set\('search', state\.search\.trim\(\)\)/);
});

test("listado, detalle y CSV reutilizan la autenticación admin", () => {
  assert.match(app, /Authorization:'Bearer ' \+ token/);
  assert.match(app, /API_ROOT \+ '\/orders\/' \+ encodeURIComponent\(id\)/);
  assert.match(app, /API_ROOT \+ '\/orders\.csv\?'/);
  assert.match(app, /order\.passes\.map\(pass\)/);
  assert.match(app, /stripe\.sessionId/);
  assert.match(app, /stripe\.paymentIntentId/);
});

test("la carga directa espera una sola restauración de Firebase Auth", () => {
  assert.match(app, /function waitForAuthReady\(\)/);
  assert.match(app, /if \(!window\._fb\?\.auth\?\.currentUser\) await waitForAuthReady\(\)/);
  assert.match(app, /window\.addEventListener\('adminready', onReady, \{ once:true \}\)/);
  assert.match(app, /window\.removeEventListener\('adminready', onReady\)/);
  assert.match(app, /if \(authReadyPromise\) return authReadyPromise/);
  assert.match(app, /window\.setTimeout\([\s\S]*6000\)/);
  assert.doesNotMatch(app, /localStorage[^\n]*(?:token|auth)/i);
});

test("los datos de compradores se escapan y no se exponen secretos", () => {
  assert.match(app, /function esc\(value\)/);
  assert.match(app, /esc\(order\.buyer\.name/);
  assert.match(app, /esc\(order\.buyer\.email/);
  assert.doesNotMatch(app, /tokenHash|requestHash|requestFingerprint|checkoutUrl/);
});

test("la vista usa tarjetas móviles y controles táctiles", () => {
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /\.iaa-table-wrap\{display:none\}/);
  assert.match(css, /\.iaa-mobile-list\{display:grid/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /\.mobile-nav__item\{flex:1 1 0!important/);
});

test("la inscripción usa la hora pagada de Ciudad de México también en móvil", () => {
  assert.match(app, /timeZone:'America\/Mexico_City'/);
  assert.match(app, /date\(order\.paidAt \|\| order\.createdAt\)/);
  assert.match(app, /date\(order\.paidAt \|\| order\.createdAt, true\)/);
  assert.match(app, /Inscripción · hora CDMX/);
  assert.match(app, /Pago confirmado · hora CDMX/);
});

test("un error de recarga no conserva indicadores financieros anteriores", () => {
  assert.match(app, /if \(!append\) \{[\s\S]*state\.orders = \[\];[\s\S]*state\.summary = null;[\s\S]*state\.truncated = false;/);
});

test("avisa cuando el listado o la exportación alcanzan límites seguros", () => {
  assert.match(app, /state\.truncated = data\.truncated === true/);
  assert.match(app, /data\.limitReached === true/);
  assert.match(app, /data\.dataLimits \|\| null/);
  assert.match(app, /X-Data-Truncated/);
  assert.match(app, /X-Data-Limit/);
  assert.match(app, /X-Pass-Data-Limit/);
  assert.match(app, /Exportación parcial/);
  assert.match(app, /function truncationWarning\(\)/);
  assert.match(css, /\.iaa-data-warning/);
});
