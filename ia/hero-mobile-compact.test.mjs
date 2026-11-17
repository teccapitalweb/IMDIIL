import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const css = readFileSync(new URL("./styles.css", import.meta.url), "utf8");

test("el hero conserva el mensaje principal y elimina el párrafo redundante", () => {
  assert.match(html, /IA[\s\S]*PARA[\s\S]*EMPRESARIOS/);
  assert.match(html, /Cómo aumentar ventas, reducir costos y automatizar tu negocio con IA\./);
  assert.doesNotMatch(html, /id="heroDescription"/);
  assert.doesNotMatch(app, /\$\("#heroDescription"\)/);
});

test("móvil recibe fecha, horario y modalidad desde la configuración oficial", () => {
  for (const id of ["heroMobileDate", "heroMobileSchedule", "heroMobileModality"]) {
    assert.match(html, new RegExp(`id="${id}"`));
    assert.match(app, new RegExp(`#${id}`));
  }
  assert.match(app, /config\.course\.dateLong/);
  assert.match(app, /config\.course\.schedule\.replace\(" — ", " a "\)/);
  assert.match(app, /Presencial en \$\{config\.course\.city\}/);
});

test("la composición móvil prioriza el retrato y compacta los datos", () => {
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.hero-copy \{ order: 1;/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*?\.hero-portrait \{ order: 2;/);
  assert.match(css, /\.hero-mobile-summary \{ margin: 14px 0 0;[\s\S]*?display: grid;/);
  assert.match(css, /\.hero-facts, \.hero-countdown \{ display: none;/);
});

test("la acción principal permanece completa y la secundaria reduce protagonismo", () => {
  assert.match(html, /<button class="button button-primary checkout-trigger" type="button">Reservar mi lugar/);
  assert.match(html, /<a class="button button-ghost" href="#programa">Conocer el programa/);
  assert.match(css, /\.hero-actions \.button-primary \{ width: 100%; min-height: 48px;/);
  assert.match(css, /\.hero-actions \.button-ghost \{ width: max-content; min-height: 36px;/);
});

test("la corrección no elimina el montaje ni los controles de Stripe", () => {
  for (const id of ["inscripcion", "checkoutForm", "seatQuantity", "checkoutSubmit", "paymentElementPanel", "paymentElement", "paymentSubmit"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(app, /setupCheckout\(setupToasts\(\)\)/);
});
