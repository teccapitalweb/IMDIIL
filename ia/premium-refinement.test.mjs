import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import vm from "node:vm";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const siteConfigSource = readFileSync(new URL("./site-config.js", import.meta.url), "utf8");

const context = vm.createContext({ window: {} });
vm.runInContext(siteConfigSource, context, { filename: "site-config.js" });
const config = JSON.parse(JSON.stringify(context.window.SITE_CONFIG));

function visibleText(fragment) {
  return String(fragment)
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/[↗↓↑→]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

test("la fotografía real autorizada aparece en el hero y en la sección del ponente", () => {
  assert.equal(config.speaker.photo, "./assets/ricardo-olmos-rivera.png");
  const photo = new URL(config.speaker.photo, import.meta.url);
  assert.equal(existsSync(photo), true);
  assert.ok(statSync(photo).size > 100_000, "la fotografía no debe sustituirse por un placeholder");

  assert.match(html, /<img[^>]+id="heroSpeakerPhoto"[^>]+src="\.\/assets\/ricardo-olmos-rivera\.png"[^>]*>/);
  assert.match(html, /<img[^>]+id="speakerPhoto"[^>]+src="\.\/assets\/ricardo-olmos-rivera\.png"[^>]*>/);
  assert.match(app, /#heroSpeakerPhoto[\s\S]*config\.speaker\.photo/);
  assert.match(app, /#speakerPhoto[\s\S]*config\.speaker\.photo/);
});

test("la cuenta regresiva parte de un instante absoluto del evento", () => {
  assert.equal(config.course.startDate, "2026-11-26T09:00:00-06:00");
  assert.equal(config.course.timeZone, "America/Mexico_City");
  assert.equal(Number.isNaN(Date.parse(config.course.startDate)), false);
  assert.match(html, /<script src="\.\/countdown-core\.js" defer><\/script>/);
  for (const id of ["countdownDays", "countdownHours", "countdownMinutes", "countdownSeconds", "countdownStatus"]) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
  assert.match(app, /remainingUntil\(config\.course\.startDate, Date\.now\(\)\)/);
  assert.match(app, /El evento ha comenzado/);
  assert.doesNotMatch(app, /new Date\(\s*2026\s*,/);
});

test("la propuesta comercial se resume en cuatro beneficios confirmados", () => {
  assert.equal(config.valuePillars.length, 4);
  assert.deepEqual(
    config.valuePillars.map(item => item.label),
    ["Vende más", "Ahorra tiempo", "Controla tu negocio", "Implementa IA"]
  );
  for (const item of config.valuePillars) {
    assert.ok(item.title.length > 10);
    assert.ok(item.body.length > 20);
  }
  assert.match(app, /config\.valuePillars\.map/);
});

test("el programa conserva seis módulos con resumen, duración y ejercicio", () => {
  const expectedTitles = [
    "Haz que tu empresa venda más con IA",
    "Automatiza tareas y recupera tu tiempo",
    "Controla tus números y detecta fugas",
    "Dirige y supervisa tu equipo con IA",
    "Crea asistentes de IA para tu empresa",
    "Implementa IA en los próximos 30 días"
  ];

  assert.equal(config.modules.length, 6);
  assert.deepEqual(config.modules.map(module => module.title), expectedTitles);
  config.modules.forEach((module, index) => {
    assert.equal(module.number, String(index + 1).padStart(2, "0"));
    assert.equal(module.duration, "60 MIN");
    assert.ok(module.summary.length > 20);
    assert.ok(module.exercise.length > 15);
    assert.ok(Array.isArray(module.topics) && module.topics.length > 0);
  });
  assert.match(app, /<small>\$\{item\.summary\}<\/small>/);
  assert.match(app, /EJERCICIO PRÁCTICO/);
});

test("la landing publica un único pase general y cuatro inclusiones", () => {
  const passLabels = html.match(/PASE\s+(?:GENERAL|VIP|PREMIUM|PRO|B[ÁA]SICO)[^<]*/gi) || [];
  assert.equal(passLabels.length, 1);
  assert.match(passLabels[0], /PASE GENERAL — IA PARA EMPRESARIOS/i);
  assert.doesNotMatch(html, /PASE\s+(?:VIP|PREMIUM|PRO|B[ÁA]SICO)/i);

  assert.deepEqual(config.course.ticketBenefits, [
    "Acceso presencial al curso",
    "6 horas efectivas de formación",
    "Seis módulos con ejercicios prácticos",
    "Certificado digital con folio verificable"
  ]);
  assert.equal(config.course.ticketBenefits.length, 4);
  assert.match(app, /config\.course\.ticketBenefits\.map/);
});

test("el certificado se destaca sin inventar un folio, QR o verificador activo", () => {
  assert.match(config.certificate.title, /Certificado digital con folio verificable/i);
  assert.match(config.certificate.description, /folio individual/i);
  assert.equal(config.certificate.verificationUrl, null);
  assert.match(html, /id="certificateTitle"/);
  assert.match(app, /CERTIFICADO DIGITAL<br><em>CON FOLIO VERIFICABLE\.<\/em>/);

  const certificateCopy = `${html}\n${JSON.stringify(config.certificate)}`;
  assert.doesNotMatch(certificateCopy, /\bIPCIL\b|c[oó]digo\s+QR|\bQR\b/i);
  assert.doesNotMatch(certificateCopy, /folio(?:\s+de\s+ejemplo)?\s*[:#]\s*[A-Z0-9-]{4,}/i);
});

test("los testimonios permanecen vacíos y la sección no se publica", () => {
  assert.deepEqual(config.testimonials, []);
  assert.match(html, /<section[^>]+id="testimonials"[^>]+hidden>/);
  assert.match(app, /testimonialsSection\.hidden\s*=\s*testimonials\.length\s*===\s*0/);
  assert.doesNotMatch(siteConfigSource, /quote\s*:\s*["']/i);
});

test("la semblanza completa está detrás de un control desplegable", () => {
  assert.match(html, /<details class="speaker-biography">/);
  assert.match(html, /<summary>Conoce su trayectoria[\s\S]*<\/summary>/);
  assert.match(html, /id="speakerBrief"/);
  assert.match(html, /id="speakerBio"/);
  assert.match(app, /config\.speaker\.bio\[0\]/);
  assert.match(app, /config\.speaker\.bio\.slice\(1\)/);
});

test("los CTA de marketing usan únicamente los tres textos aprobados", () => {
  const fragments = [
    ...[...html.matchAll(/<button\b[^>]*class="[^"]*\bcheckout-trigger\b[^"]*"[^>]*>([\s\S]*?)<\/button>/gi)].map(match => match[1]),
    ...[...html.matchAll(/<a\b(?=[^>]*class="[^"]*\bbutton\b[^"]*")(?=[^>]*href="#programa")[^>]*>([\s\S]*?)<\/a>/gi)].map(match => match[1])
  ];
  const labels = fragments.map(visibleText);
  const approved = ["Reservar mi lugar", "Conocer el programa", "Inscribirme ahora"];

  assert.ok(labels.length >= 4);
  for (const label of labels) {
    assert.ok(approved.some(text => label.toLocaleLowerCase("es-MX").includes(text.toLocaleLowerCase("es-MX"))), `CTA no aprobado: ${label}`);
  }
  for (const text of approved) {
    assert.ok(labels.some(label => label.toLocaleLowerCase("es-MX").includes(text.toLocaleLowerCase("es-MX"))), `falta CTA: ${text}`);
  }
  assert.doesNotMatch(labels.join(" | "), /revisar inscripci[oó]n|elegir (?:mi )?pase|comprar ahora|apartar/i);
});

test("el refinamiento conserva los IDs públicos del checkout Stripe", () => {
  const ids = [
    "checkoutForm", "seatQuantity", "quantityDecrease", "quantityIncrease",
    "buyerName", "buyerEmail", "buyerPhone", "buyerAttends", "checkoutSubmit",
    "checkoutSubmitText", "paymentElementPanel", "paymentElement", "paymentSubmit",
    "paymentSubmitText", "paymentBack", "paymentResult", "attendeesForm", "recoveryForm"
  ];
  for (const id of ids) assert.match(html, new RegExp(`id=["']${id}["']`), `falta #${id}`);

  assert.match(app, /apiRequest\("\/checkout"/);
  assert.match(app, /stripe\.confirmPayment/);
  assert.match(app, /quantity:\s*normalizeQuantity/);
  assert.match(app, /#seatQuantity/);
  assert.match(app, /#paymentElement/);
});
