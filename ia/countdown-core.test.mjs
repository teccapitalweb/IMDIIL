import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync(new URL("./countdown-core.js", import.meta.url), "utf8");

function loadCore() {
  const context = vm.createContext({});
  vm.runInContext(source, context, { filename: "countdown-core.js" });
  return context.IMDIIL_COUNTDOWN;
}

test("calcula días, horas, minutos y segundos desde un instante absoluto", () => {
  const core = loadCore();
  const start = "2026-11-26T09:00:00-06:00";
  const now = Date.parse(start) - (((1 * 24 + 2) * 60 + 3) * 60 + 4) * 1_000;

  assert.deepEqual(
    { ...core.remainingUntil(start, now) },
    {
      totalMilliseconds: 93_784_000,
      days: 1,
      hours: 2,
      minutes: 3,
      seconds: 4,
      started: false
    }
  );
});

test("se detiene exactamente en cero cuando inicia el evento", () => {
  const core = loadCore();
  const start = "2026-11-26T09:00:00-06:00";
  const result = core.remainingUntil(start, Date.parse(start));

  assert.deepEqual(
    { ...result },
    { totalMilliseconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, started: true }
  );
  assert.equal(Object.isFrozen(result), true);
});

test("nunca devuelve valores negativos después del inicio", () => {
  const core = loadCore();
  const start = "2026-11-26T09:00:00-06:00";
  const result = core.remainingUntil(start, Date.parse(start) + 86_400_000);

  assert.deepEqual(
    { ...result },
    { totalMilliseconds: 0, days: 0, hours: 0, minutes: 0, seconds: 0, started: true }
  );
});

test("el resultado no depende de la zona horaria del navegador", () => {
  const core = loadCore();
  const now = Date.parse("2026-11-26T14:59:59Z");
  const mexico = core.remainingUntil("2026-11-26T09:00:00-06:00", now);
  const utc = core.remainingUntil("2026-11-26T15:00:00Z", now);

  assert.deepEqual({ ...mexico }, { ...utc });
  assert.equal(mexico.seconds, 1);
  assert.equal(mexico.started, false);
});

test("exige que el llamador proporcione el reloj actual", () => {
  const core = loadCore();

  assert.throws(
    () => core.remainingUntil("2026-11-26T09:00:00-06:00"),
    /nowMs debe ser un número finito/
  );
  assert.doesNotMatch(source, /Date\.now\s*\(/);
});

test("rechaza fechas sin zona o inválidas", () => {
  const core = loadCore();

  assert.throws(
    () => core.remainingUntil("2026-11-26T09:00:00", 0),
    /instante absoluto con zona horaria/
  );
  assert.throws(
    () => core.remainingUntil("fecha-invalidaZ", 0),
    /no contiene una fecha válida/
  );
});

test("expone una API global inmutable sin sobrescribir una existente", () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const first = context.IMDIIL_COUNTDOWN;
  vm.runInContext(source, context);

  assert.equal(context.IMDIIL_COUNTDOWN, first);
  assert.equal(Object.isFrozen(first), true);
  assert.equal(typeof first.remainingUntil, "function");
});
