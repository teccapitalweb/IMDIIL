(function exposeCountdownCore(root) {
  "use strict";

  const SECOND_MS = 1_000;
  const MINUTE_MS = 60 * SECOND_MS;
  const HOUR_MS = 60 * MINUTE_MS;
  const DAY_MS = 24 * HOUR_MS;
  const ABSOLUTE_ISO = /(?:Z|[+-]\d{2}:\d{2})$/i;

  function absoluteMilliseconds(value, label) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value !== "string" || !ABSOLUTE_ISO.test(value.trim())) {
      throw new TypeError(`${label} debe ser un instante absoluto con zona horaria.`);
    }
    const milliseconds = Date.parse(value);
    if (!Number.isFinite(milliseconds)) {
      throw new RangeError(`${label} no contiene una fecha válida.`);
    }
    return milliseconds;
  }

  function nowMilliseconds(value) {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      throw new TypeError("nowMs debe ser un número finito proporcionado por el llamador.");
    }
    return value;
  }

  function remainingUntil(startInstant, nowMs) {
    const startMs = absoluteMilliseconds(startInstant, "startInstant");
    const currentMs = nowMilliseconds(nowMs);
    const totalMilliseconds = Math.max(0, startMs - currentMs);

    return Object.freeze({
      totalMilliseconds,
      days: Math.floor(totalMilliseconds / DAY_MS),
      hours: Math.floor(totalMilliseconds / HOUR_MS) % 24,
      minutes: Math.floor(totalMilliseconds / MINUTE_MS) % 60,
      seconds: Math.floor(totalMilliseconds / SECOND_MS) % 60,
      started: totalMilliseconds === 0
    });
  }

  const api = Object.freeze({ remainingUntil });

  if (!Object.prototype.hasOwnProperty.call(root, "IMDIIL_COUNTDOWN")) {
    Object.defineProperty(root, "IMDIIL_COUNTDOWN", {
      value: api,
      enumerable: true,
      configurable: false,
      writable: false
    });
  }
})(typeof window !== "undefined" ? window : globalThis);
