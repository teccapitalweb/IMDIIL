import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const config = readFileSync(new URL("./site-config.js", import.meta.url), "utf8");

test("la estructura pública sintetiza títulos y elimina estados internos", () => {
  assert.match(html, /APLICA IA[\s\S]*EN TU EMPRESA/);
  assert.match(html, /PROGRAMA EN[\s\S]*6 MÓDULOS/);
  assert.match(html, /RESERVA[\s\S]*TU LUGAR/);
  assert.doesNotMatch(html, /class="pending-panel"/);
  assert.doesNotMatch(html, /PENDIENTE DE CONFIRMACIÓN/);
  assert.doesNotMatch(html, /NO SE TRATA DE USAR MÁS IA/);
});

test("el video pendiente conserva su integración sin ocupar espacio público", () => {
  assert.match(html, /<section class="video-section[^>]+id="experiencia"[^>]+hidden>/);
  assert.match(html, /id="videoButton"/);
  assert.match(app, /#experiencia"\)\.hidden = !config\.video\.source/);
  assert.match(config, /source:\s*null/);
});

test("el programa conserva seis acordeones y todos inician cerrados", () => {
  assert.match(app, /config\.modules\.map/);
  assert.match(app, /aria-expanded="false"/);
  assert.match(app, /aria-hidden="true"/);
  assert.doesNotMatch(app, /index === 0/);
  assert.doesNotMatch(app, /firstModule/);
});

test("la trayectoria usa una tarjeta compacta sin duplicar la fotografía", () => {
  assert.match(html, /class="speaker speaker-compact/);
  assert.match(html, /class="speaker-card/);
  assert.match(html, /Conoce su trayectoria/);
  assert.match(html, /5\+[\s\S]*15\+[\s\S]*100\+/);
  assert.equal((html.match(/ricardo-olmos-rivera\.png/g) || []).length, 1);
  assert.match(config, /inteligencia artificial aplicada a empresas/);
  assert.match(css, /\.speaker-biography\[open\] summary i::before \{ content: "−";/);
});

test("la foto conserva el PNG autorizado y ofrece una alternativa WebP ligera", () => {
  assert.match(html, /<source srcset="\.\/assets\/ricardo-olmos-rivera\.webp" type="image\/webp">/);
  assert.match(html, /<img[^>]+src="\.\/assets\/ricardo-olmos-rivera\.png"/);
});

test("el carrusel queda listo en tres filas sin publicar testimonios ficticios", () => {
  for (const id of ["testimonialRowA", "testimonialRowB", "testimonialRowC"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /id="testimonialPause"/);
  assert.match(css, /testimonial-row:nth-child\(2\)[\s\S]*animation-direction: reverse/);
  assert.match(css, /testimonial-row:hover[\s\S]*animation-play-state: paused/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*testimonial-marquee/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*scroll-snap-type: x mandatory/);
  assert.match(config, /testimonials:\s*\[\]/);
  assert.doesNotMatch(config, /quote\s*:/);
});

test("contador móvil y contratos de compra permanecen disponibles", () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.hero-countdown \{ order: 3;[\s\S]*display: grid/);
  for (const id of ["checkoutForm", "seatQuantity", "checkoutSubmit", "paymentElement", "paymentSubmit", "attendeesForm", "recoveryForm"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /setupCheckout\(setupToasts\(\)\)/);
  assert.match(app, /is-interaction-hidden/);
  assert.match(app, /syncMobileCtaAccessibility/);
  assert.match(app, /cta\.inert = hidden/);
  assert.match(css, /\.mobile-cta\.is-interaction-hidden/);
  assert.match(css, /\.hero-countdown\.has-started \.countdown-units \{ display: none; \}/);
});

test("la numeración se adapta si más adelante se habilitan testimonios", () => {
  assert.match(html, /id="enrollmentSectionNumber">05/);
  assert.match(html, /id="faqSectionNumber">06/);
  assert.match(app, /enrollmentSectionNumber[\s\S]*testimonials\.length \? "06" : "05"/);
  assert.match(app, /faqSectionNumber[\s\S]*testimonials\.length \? "07" : "06"/);
});

test("el correo de soporte confirmado se publica como enlace", () => {
  assert.match(config, /email:\s*"imdiilmx@gmail\.com"/);
  assert.match(html, /id="contactEmail"[^>]+mailto:imdiilmx@gmail\.com/);
});
