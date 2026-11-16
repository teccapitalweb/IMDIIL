(() => {
  "use strict";
  const config = window.SITE_CONFIG;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const money = amount => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(amount);
  const storageKeys = {
    request: "imdiil:ia:checkout-request",
    reservation: "imdiil:ia:reservation",
    token: "imdiil:ia:reservation-token"
  };
  const checkoutRuntime = {
    enabled: false,
    mode: config.checkout.mode || "test",
    unitAmount: Math.round(config.course.price * 100),
    maxPerOrder: Math.max(1, Number(config.checkout.maxPerOrder) || 5),
    reservationId: null,
    token: null,
    reservation: null,
    polling: false
  };

  const formatMinor = amount => `$${money(Math.round((Number(amount) || 0) / 100))} ${config.course.currency}`;
  const session = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* private mode */ } },
    remove(key) { try { sessionStorage.removeItem(key); } catch { /* private mode */ } }
  };

  function randomToken() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    if (globalThis.crypto?.getRandomValues) {
      const bytes = new Uint8Array(16);
      globalThis.crypto.getRandomValues(bytes);
      return [...bytes].map(value => value.toString(16).padStart(2, "0")).join("");
    }
    throw new Error("Este navegador no puede iniciar una reserva segura. Actualízalo e inténtalo nuevamente.");
  }

  async function apiRequest(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(config.checkout.requestTimeoutMs) || 15000);
    try {
      const headers = { Accept: "application/json", ...(options.headers || {}) };
      if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
      const response = await fetch(`${String(config.checkout.apiBase || "").replace(/\/$/, "")}${path}`, {
        ...options,
        headers,
        signal: controller.signal,
        cache: "no-store"
      });
      let data = {};
      try { data = await response.json(); } catch { data = {}; }
      if (!response.ok) {
        const messages = {
          400: "Revisa la cantidad y los datos antes de continuar.",
          401: "El enlace seguro ya no es válido.",
          403: "No fue posible autorizar esta operación.",
          404: "No encontramos esa reserva.",
          409: "La disponibilidad cambió. Actualiza e inténtalo nuevamente.",
          410: "Esta reserva ya venció. Puedes iniciar una nueva.",
          422: "Hay datos que necesitan corrección.",
          429: "Recibimos varios intentos. Espera un momento y vuelve a intentar.",
          503: "Las inscripciones todavía no están habilitadas."
        };
        const fallback = messages[response.status] || "No pudimos completar la operación. Inténtalo nuevamente.";
        const message = data.code === "checkout_failed"
          ? "No pudimos abrir el pago en este momento. Inténtalo nuevamente en unos segundos."
          : fallback;
        const error = new Error(message);
        error.status = response.status;
        error.code = String(data.code || "request_failed");
        throw error;
      }
      return data;
    } catch (error) {
      if (error.name === "AbortError") throw new Error("La conexión tardó demasiado. Inténtalo nuevamente.");
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  function applyContent() {
    document.title = config.seo.title;
    $("meta[name='description']").content = config.seo.description;
    $("meta[property='og:title']").content = config.seo.title;
    $("meta[property='og:description']").content = config.seo.description;
    $("meta[property='og:image']").content = config.seo.image;

    $("#reviewLabel").textContent = config.status.label;
    $("#reviewNote").textContent = config.status.note;
    $("#brandName").textContent = config.brand.name;
    $("#heroEyebrow").textContent = config.course.eyebrow;
    $("#heroTagline").textContent = config.course.tagline;
    $("#heroDescription").textContent = config.course.description;
    $(".editorial-topline span:first-child").textContent = `CURSO PRESENCIAL · ${config.course.capacity.toUpperCase()}`;
    $(".editorial-topline span:last-child").textContent = `${config.course.city.toUpperCase()} · 2026`;
    $(".editorial-byline strong").textContent = config.speaker.name.toUpperCase();
    $("#metaDate").textContent = config.course.dateShort;
    $("#metaSchedule").textContent = config.course.scheduleShort;
    $("#metaModality").textContent = config.course.modality;
    $("#metaPrice").textContent = `$${money(config.course.price)} ${config.course.currency}`;

    $("#videoState").textContent = config.video.status;
    $("#videoDescription").textContent = config.video.description;
    $("#speakerName").innerHTML = `${config.speaker.name.replace("Ing. ", "").split(" ").slice(0, 2).join(" ").toUpperCase()}<br><em>${config.speaker.name.replace("Ing. ", "").split(" ").slice(2).join(" ").toUpperCase()}</em>`;
    $("#speakerRole").textContent = config.speaker.role;
    $("#speakerBio").innerHTML = config.speaker.bio.map(paragraph => `<p>${paragraph}</p>`).join("");
    $("#speakerPhoto").src = config.speaker.photo;
    $("#speakerPhoto").alt = config.speaker.name;
    const disclaimer = $("#speakerDisclaimer");
    disclaimer.textContent = config.speaker.disclaimer;
    disclaimer.hidden = !config.speaker.disclaimer;

    $("#enrollDate").textContent = config.course.dateShort;
    $("#enrollTime").textContent = config.course.schedule;
    $("#enrollLocation").textContent = config.course.city.toUpperCase();
    $("#ticketPrice").textContent = money(config.course.price);
    $("#ticketBenefits").innerHTML = config.course.ticketBenefits.map(item => `<li>${item}</li>`).join("");
    $("#checkoutNotice").textContent = config.checkout.notice;
    $("#mobilePrice").textContent = `$${money(config.course.price)}`;
    $("#contactLocation").textContent = config.contact.location;
    $("#venueNote").textContent = config.contact.venueNote;

    $("#valueRows").innerHTML = config.valuePillars.map((item, index) => `
      <article class="value-row reveal" data-delay="${Math.min(index, 3)}">
        <span class="number">${item.number}</span>
        <span class="label">${item.label}</span>
        <h3>${item.title}</h3>
        <p>${item.body}</p>
        <span class="arrow" aria-hidden="true">→</span>
      </article>`).join("");

    $("#programList").innerHTML = config.modules.map((item, index) => `
      <article class="program-item reveal" data-delay="${Math.min(index, 3)}">
        <button class="program-trigger" type="button" aria-expanded="${index === 0}" aria-controls="module-${index}">
          <span class="program-number">${item.number}</span>
          <span class="program-time">${item.duration}</span>
          <span class="program-title">${item.title}</span>
          <span class="program-plus" aria-hidden="true">+</span>
        </button>
        <div class="program-panel" id="module-${index}" aria-hidden="${index !== 0}">
          <div><div class="program-panel-content">
            <ol>${item.topics.map(topic => `<li>${topic}</li>`).join("")}</ol>
            <p class="program-objective"><strong>EJERCICIO PRÁCTICO</strong>${item.exercise}</p>
          </div></div>
        </div>
      </article>`).join("");
    const firstModule = $(".program-item");
    if (firstModule) firstModule.classList.add("open");

    $("#outcomeTrack").innerHTML = config.outcomes.map((item, index) => `
      <article class="outcome-card reveal" data-delay="${index % 3}">
        <span class="index">0${index + 1}</span>
        <div><h3>${item[0]}</h3><p>${item[1]}</p></div>
      </article>`).join("");

    $("#audienceGrid").innerHTML = config.course.audience.map((item, index) => `
      <article class="audience-card reveal" data-delay="${index}">
        <span>0${index + 1}</span>
        <div><h3>${item}</h3><p>${audienceCopy(item)}</p></div>
      </article>`).join("");

    $("#faqList").innerHTML = config.faq.map((item, index) => `
      <article class="faq-item reveal">
        <button class="faq-trigger" type="button" aria-expanded="false" aria-controls="faq-${index}">
          <span class="index">0${index + 1}</span><span class="question">${item[0]}</span><span class="plus" aria-hidden="true">+</span>
        </button>
        <div class="faq-answer" id="faq-${index}" aria-hidden="true"><div><p>${item[1]}</p></div></div>
      </article>`).join("");
    $("#pendingList").innerHTML = config.pending.map(item => `<li>${item}</li>`).join("");

    $("#structuredData").textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "EducationEvent",
      name: config.course.title,
      description: config.course.description,
      startDate: config.course.startDate,
      endDate: config.course.endDate,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: {
        "@type": "Place",
        name: "Recinto por confirmar",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Tehuacán",
          addressRegion: "Puebla",
          addressCountry: "MX"
        }
      },
      organizer: { "@type": "Organization", name: config.brand.fullName },
      performer: { "@type": "Person", name: config.speaker.name, jobTitle: config.speaker.role },
      offers: {
        "@type": "Offer",
        price: config.course.price,
        priceCurrency: config.course.currency,
        availability: "https://schema.org/LimitedAvailability",
        url: config.brand.eventUrl
      },
      image: config.seo.image,
      url: config.brand.eventUrl
    });
  }

  function audienceCopy(label) {
    const copy = {
      Empresarios: "Decisiones, costos y crecimiento con una nueva lectura.",
      Emprendedores: "Procesos claros para convertir ideas en acciones.",
      Gerentes: "Herramientas para mejorar operación, equipos y métricas.",
      Directivos: "Criterio para priorizar recursos, riesgos e impacto."
    };
    return copy[label] || "Aplicación empresarial con criterio.";
  }

  function setupAccordions() {
    $$(".program-trigger").forEach(trigger => trigger.addEventListener("click", () => {
      const item = trigger.closest(".program-item");
      const willOpen = !item.classList.contains("open");
      $$(".program-item.open").forEach(openItem => {
        openItem.classList.remove("open");
        $(".program-trigger", openItem).setAttribute("aria-expanded", "false");
        $(".program-panel", openItem).setAttribute("aria-hidden", "true");
      });
      if (willOpen) {
        item.classList.add("open");
        trigger.setAttribute("aria-expanded", "true");
        $(".program-panel", item).setAttribute("aria-hidden", "false");
      }
    }));
    $$(".faq-trigger").forEach(trigger => trigger.addEventListener("click", () => {
      const item = trigger.closest(".faq-item");
      const open = item.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open));
      $(".faq-answer", item).setAttribute("aria-hidden", String(!open));
    }));
  }

  function setupNavigation() {
    const toggle = $("#menuToggle");
    const nav = $("#siteNav");
    const mobileCta = $(".mobile-cta");
    const syncMobileCta = open => {
      mobileCta.inert = open;
      if (open) mobileCta.setAttribute("aria-hidden", "true");
      else mobileCta.removeAttribute("aria-hidden");
    };
    const close = () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
      document.body.classList.remove("menu-open");
      syncMobileCta(false);
    };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
      document.body.classList.toggle("menu-open", open);
      syncMobileCta(open);
    });
    $$("a", nav).forEach(link => link.addEventListener("click", close));
    document.addEventListener("keydown", event => { if (event.key === "Escape") close(); });
  }

  function setupMotion() {
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const reveals = $$(".reveal");
    if (reduced || !("IntersectionObserver" in window)) reveals.forEach(element => element.classList.add("visible"));
    else {
      const observer = new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      }), { threshold: 0.12, rootMargin: "0px 0px -7%" });
      reveals.forEach(element => observer.observe(element));
    }
  }

  function setupScroll() {
    const header = $(".site-header");
    const progress = $("#scrollProgress");
    const onScroll = () => {
      header.classList.toggle("is-fixed", scrollY > 420);
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.width = `${max > 0 ? (scrollY / max) * 100 : 0}%`;
    };
    addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function setupToasts() {
    const toast = $("#toast");
    const text = $("#toastText");
    const title = $("#toastTitle");
    let timer;
    const show = (message, heading = "Información del curso") => {
      title.textContent = heading;
      text.textContent = message;
      toast.classList.add("show");
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove("show"), 7000);
    };
    $("#toastClose").addEventListener("click", () => toast.classList.remove("show"));
    $("#videoButton").addEventListener("click", () => {
      if (config.video.source) show("El reproductor oficial se abrirá aquí.");
      else show(config.video.description);
    });
    return show;
  }

  function normalizeQuantity(value) {
    const parsed = Math.trunc(Number(value) || 1);
    return Math.min(checkoutRuntime.maxPerOrder, Math.max(1, parsed));
  }

  function updateQuantity(value) {
    const quantity = normalizeQuantity(value);
    const input = $("#seatQuantity");
    input.value = String(quantity);
    input.max = String(checkoutRuntime.maxPerOrder);
    $("#quantityMax").textContent = String(checkoutRuntime.maxPerOrder);
    $("#quantityDecrease").disabled = quantity <= 1;
    $("#quantityIncrease").disabled = quantity >= checkoutRuntime.maxPerOrder;
    $("#unitPriceSummary").textContent = formatMinor(checkoutRuntime.unitAmount);
    $("#checkoutTotal").textContent = formatMinor(checkoutRuntime.unitAmount * quantity);
    $("#mobilePrice").textContent = `$${money((checkoutRuntime.unitAmount * quantity) / 100)}`;
  }

  function setCheckoutNotice(message, state = "") {
    const notice = $("#checkoutNotice");
    notice.textContent = message;
    notice.className = `checkout-notice${state ? ` is-${state}` : ""}`;
  }

  function setReviewBanner(state, label, note) {
    const labelNode = $("#reviewLabel");
    const noteNode = $("#reviewNote");
    const bar = labelNode?.closest(".review-bar");
    if (labelNode) labelNode.textContent = label;
    if (noteNode) noteNode.textContent = note;
    if (bar) bar.dataset.checkoutState = state;
  }

  function setCheckoutLoading(loading) {
    const form = $("#checkoutForm");
    const button = $("#checkoutSubmit");
    form.setAttribute("aria-busy", String(loading));
    button.disabled = loading || !checkoutRuntime.enabled;
    button.classList.toggle("is-loading", loading);
    $("#checkoutSubmitText").textContent = loading
      ? "Preparando pago"
      : checkoutRuntime.enabled ? "Continuar a pago seguro" : "Pago en preparación";
  }

  function setupMobileCheckoutCta() {
    const cta = $(".mobile-cta");
    const enrollment = $("#inscripcion");
    if (!cta || !enrollment || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      cta.classList.toggle("is-context-hidden", entries.some(entry => entry.isIntersecting));
    }, { threshold: 0.04 });
    observer.observe(enrollment);
  }

  function rememberReservation(reservationId, token) {
    checkoutRuntime.reservationId = reservationId || checkoutRuntime.reservationId;
    checkoutRuntime.token = token || checkoutRuntime.token;
    if (reservationId) session.set(storageKeys.reservation, reservationId);
    if (token) session.set(storageKeys.token, token);
  }

  function clearReturnParameters() {
    const url = new URL(location.href);
    if (!url.searchParams.has("token")) return;
    url.searchParams.delete("token");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function showCheckoutForm() {
    $("#checkoutForm").hidden = false;
    $("#paymentResult").hidden = true;
    $("#recoveryPanel").hidden = false;
  }

  function setResult(state, title, message, data = null) {
    const panel = $("#paymentResult");
    panel.hidden = false;
    panel.dataset.state = state;
    $("#checkoutForm").hidden = true;
    $("#resultTitle").textContent = title;
    $("#resultMessage").textContent = message;
    $("#resultKicker").textContent = state === "paid" ? "COMPRA CONFIRMADA" : "ESTADO DE LA RESERVA";
    $("#resultRetry").hidden = !["canceled", "error"].includes(state);
    $("#resultRefresh").hidden = state !== "pending";
    const summary = $("#resultSummary");
    if (!data) {
      summary.hidden = true;
      return;
    }
    summary.hidden = false;
    const quantity = Number(data.quantity || data.places || data.seats || 0);
    const total = Number(data.totalAmount ?? data.amountTotal ?? data.totalAmountMinor ?? 0);
    $("#resultDate").textContent = config.course.dateShort;
    $("#resultQuantity").textContent = quantity ? `${quantity} ${quantity === 1 ? "lugar" : "lugares"}` : "—";
    $("#resultTotalLabel").textContent = state === "paid" ? "Total pagado" : "Total";
    $("#resultTotal").textContent = total ? formatMinor(total) : "Pendiente de confirmar";
    $("#resultReservation").textContent = data.publicId || data.reservationCode || data.reservationId || checkoutRuntime.reservationId || "—";
  }

  function attendeeField(label, type, value, options = {}) {
    const wrapper = document.createElement("label");
    wrapper.className = "form-field";
    const caption = document.createElement("span");
    caption.textContent = label;
    const input = document.createElement("input");
    input.type = type;
    input.value = value || "";
    input.maxLength = options.maxLength || 180;
    input.autocomplete = options.autocomplete || "off";
    if (options.required) input.required = true;
    if (options.name) input.name = options.name;
    wrapper.append(caption, input);
    return { wrapper, input };
  }

  function renderAttendees(data) {
    const form = $("#attendeesForm");
    const fields = $("#attendeesFields");
    const quantity = Math.max(0, Number(data.quantity || data.places || 0));
    const records = Array.isArray(data.attendees) ? data.attendees : Array.isArray(data.passes) ? data.passes : [];
    fields.replaceChildren();
    if (!quantity) {
      form.hidden = true;
      return;
    }
    for (let index = 0; index < quantity; index += 1) {
      const record = records[index] || {};
      const attendee = record.attendee || record;
      const entry = document.createElement("fieldset");
      entry.className = "attendee-entry";
      entry.dataset.passId = String(record.passId || record.id || attendee.passId || "");
      entry.dataset.index = String(index);
      const legend = document.createElement("legend");
      legend.textContent = `ASISTENTE ${index + 1}`;
      const name = attendeeField("Nombre completo", "text", attendee.name || attendee.nombre || "", { name: `attendeeName${index}`, autocomplete: "name", maxLength: 140, required: true });
      const email = attendeeField("Correo electrónico · opcional", "email", attendee.email || attendee.correo || "", { name: `attendeeEmail${index}`, autocomplete: "email", maxLength: 180 });
      entry.append(legend, name.wrapper, email.wrapper);
      fields.append(entry);
    }
    form.hidden = false;
  }

  function reservationState(data) {
    const explicitState = String(data.status || data.state || data.paymentStatus || "pending").toLowerCase();
    const errorCode = String(data.errorCode || data.code || "").toLowerCase();
    const stripeSessionId = data.stripeSessionId || data.checkoutSessionId || data.stripe?.sessionId;
    if (!stripeSessionId && ["checkout_error", "checkout_failed"].includes(errorCode)) return "checkout_error";
    return explicitState;
  }

  function renderReservation(data) {
    checkoutRuntime.reservation = data;
    const state = reservationState(data);
    if (["paid", "confirmed", "pagado", "confirmada"].includes(state)) {
      checkoutRuntime.polling = false;
      session.remove(storageKeys.request);
      setResult("paid", "Tu compra está confirmada.", "El pago fue verificado por el servidor. Completa los datos de cada asistente para dejar listos tus lugares.", data);
      renderAttendees(data);
      return "paid";
    }
    $("#attendeesForm").hidden = true;
    if (["canceled", "cancelled", "cancelado"].includes(state)) {
      checkoutRuntime.polling = false;
      setResult("canceled", "La compra no se completó.", "No se confirmó ningún cobro. Puedes revisar la cantidad e iniciar una nueva reserva.", data);
      return "canceled";
    }
    if (["expired", "payment_failed", "checkout_error", "failed", "expirada", "fallido"].includes(state)) {
      checkoutRuntime.polling = false;
      setResult("error", "La reserva ya no está activa.", "No confirmamos un pago. Inicia una nueva reserva o utiliza la recuperación si necesitas consultar una operación anterior.", data);
      return "error";
    }
    setResult("pending", "Estamos verificando tu pago.", "Tu inscripción todavía no está confirmada. Esta pantalla se actualizará cuando el webhook de Stripe valide el resultado.", data);
    return "pending";
  }

  async function getReservationStatus() {
    if (!checkoutRuntime.reservationId || !checkoutRuntime.token) throw new Error("No encontramos los datos seguros de esta reserva.");
    return apiRequest(`/reservations/${encodeURIComponent(checkoutRuntime.reservationId)}`, {
      headers: { "X-Reservation-Token": checkoutRuntime.token }
    });
  }

  function validatedCheckoutUrl(value) {
    let url;
    try { url = new URL(String(value || "")); }
    catch { throw new Error("El destino de pago no es válido. Inténtalo nuevamente."); }
    if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com") {
      throw new Error("El destino de pago no es válido. Inténtalo nuevamente.");
    }
    return url.href;
  }

  async function pollReservation(attempts = 18) {
    if (checkoutRuntime.polling) return;
    checkoutRuntime.polling = true;
    for (let attempt = 0; attempt < attempts && checkoutRuntime.polling; attempt += 1) {
      try {
        const state = renderReservation(await getReservationStatus());
        if (state !== "pending") return;
      } catch (error) {
        if (attempt === 0) setResult("pending", "Seguimos esperando confirmación.", error.message);
      }
      await new Promise(resolve => setTimeout(resolve, Number(config.checkout.pollIntervalMs) || 2500));
    }
    checkoutRuntime.polling = false;
    $("#resultRefresh").hidden = false;
  }

  async function handleReturnState() {
    const params = new URLSearchParams(location.search);
    const payment = String(params.get("payment") || params.get("checkout") || "").toLowerCase();
    const reservationId = params.get("reservation") || params.get("reservation_id") || session.get(storageKeys.reservation);
    const token = params.get("token") || session.get(storageKeys.token);
    rememberReservation(reservationId, token);
    clearReturnParameters();
    if (!payment) return;
    $("#inscripcion").scrollIntoView({ behavior: "smooth", block: "start" });
    if (!checkoutRuntime.reservationId || !checkoutRuntime.token) {
      setResult("error", "No pudimos localizar la reserva.", "Usa la opción de recuperación con tu correo y el identificador de reserva.");
      return;
    }
    if (["canceled", "cancelled", "cancelado"].includes(payment)) {
      try {
        const data = await apiRequest(`/reservations/${encodeURIComponent(checkoutRuntime.reservationId)}/cancel`, {
          method: "POST",
          body: JSON.stringify({ token: checkoutRuntime.token }),
          headers: { "X-Reservation-Token": checkoutRuntime.token }
        });
        renderReservation(data);
      } catch {
        setResult("canceled", "La compra no se completó.", "No declaramos ningún pago como exitoso. Puedes intentarlo nuevamente o actualizar el estado de la reserva.");
        $("#resultRefresh").hidden = false;
      }
      return;
    }
    if (payment === "error") {
      setResult("error", "No pudimos completar la operación.", "Conserva tu identificador de reserva y vuelve a intentar. No se confirmó un cobro desde esta pantalla.");
      return;
    }
    setResult("pending", "Comprobando tu pago…", "La página de regreso no confirma la inscripción: estamos consultando el estado verificado del servidor.");
    await pollReservation();
  }

  async function loadCheckoutConfig() {
    try {
      const remote = await apiRequest("/config");
      const remoteUnit = Number(remote.unitAmount ?? remote.unitAmountMinor ?? remote.price?.unitAmount ?? 0);
      if (remoteUnit > 0) checkoutRuntime.unitAmount = remoteUnit;
      const remoteMax = Math.trunc(Number(remote.maxPerOrder ?? remote.limits?.maxPerOrder ?? config.checkout.maxPerOrder));
      if (remoteMax > 0) checkoutRuntime.maxPerOrder = remoteMax;
      const available = remote.availability?.available ?? remote.available;
      if (available !== null && available !== undefined && Number.isFinite(Number(available))) {
        checkoutRuntime.maxPerOrder = Math.max(1, Math.min(checkoutRuntime.maxPerOrder, Number(available)));
      }
      checkoutRuntime.mode = String(remote.mode || config.checkout.mode || "test") === "live" ? "live" : "test";
      checkoutRuntime.enabled = remote.enabled === true && Number(available ?? 1) !== 0;
      updateQuantity($("#seatQuantity").value);
      setCheckoutLoading(false);
      if (checkoutRuntime.enabled) {
        const modeNote = checkoutRuntime.mode === "test" ? "Modo de prueba activo. No utilices una tarjeta real." : "El pago se realizará en la página segura de Stripe.";
        setCheckoutNotice(modeNote, "ready");
        if (checkoutRuntime.mode === "test") {
          setReviewBanner("test", "Modo de prueba", "Checkout de prueba habilitado · no utilices una tarjeta real.");
        } else {
          setReviewBanner("live", "Inscripción disponible", "Compra segura habilitada · Stripe en modo producción.");
        }
      } else {
        const disabledNotice = remote.soldOut ? "Por el momento no hay lugares disponibles." : config.checkout.notice;
        setCheckoutNotice(disabledNotice);
        if (remote.soldOut) setReviewBanner("sold-out", "Cupo agotado", "No hay lugares disponibles en este momento.");
        else setReviewBanner("disabled", "Inscripción en preparación", "El sistema de pago permanece desactivado.");
      }
    } catch {
      checkoutRuntime.enabled = false;
      setCheckoutLoading(false);
      setCheckoutNotice("No pudimos verificar la disponibilidad en este momento. Recarga la página e inténtalo nuevamente.", "error");
      setReviewBanner("unavailable", "Disponibilidad no confirmada", "No pudimos verificar el sistema de inscripción. Inténtalo nuevamente.");
    }
  }

  function setupCheckout(showToast) {
    const form = $("#checkoutForm");
    const quantity = $("#seatQuantity");
    updateQuantity(quantity.value);
    setCheckoutLoading(false);

    $$(".checkout-trigger").forEach(button => button.addEventListener("click", () => {
      $("#inscripcion").scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => quantity.focus({ preventScroll: true }), 650);
      if (!checkoutRuntime.enabled) showToast(config.checkout.notice, "Inscripción preparada");
    }));
    $("#quantityDecrease").addEventListener("click", () => updateQuantity(Number(quantity.value) - 1));
    $("#quantityIncrease").addEventListener("click", () => updateQuantity(Number(quantity.value) + 1));
    quantity.addEventListener("input", () => updateQuantity(quantity.value));
    quantity.addEventListener("blur", () => updateQuantity(quantity.value));

    form.addEventListener("input", () => {
      if (form.getAttribute("aria-busy") !== "true") session.remove(storageKeys.request);
    });
    form.addEventListener("submit", async event => {
      event.preventDefault();
      if (!checkoutRuntime.enabled) {
        setCheckoutNotice(config.checkout.notice, "error");
        return;
      }
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      setCheckoutLoading(true);
      setCheckoutNotice("Validando cantidad, disponibilidad e importe en el servidor.");
      const requestToken = session.get(storageKeys.request) || randomToken();
      session.set(storageKeys.request, requestToken);
      const payload = {
        quantity: normalizeQuantity(quantity.value),
        buyer: {
          name: $("#buyerName").value.trim(),
          email: $("#buyerEmail").value.trim(),
          phone: $("#buyerPhone").value.trim()
        },
        buyerAttends: $("#buyerAttends").checked,
        requestToken
      };
      try {
        const data = await apiRequest("/checkout", { method: "POST", body: JSON.stringify(payload) });
        const reservationId = data.reservationId || data.reservation?.id;
        const token = data.statusToken || data.token || data.reservationToken;
        rememberReservation(reservationId, token);
        if (data.checkoutUrl || data.url) {
          location.assign(validatedCheckoutUrl(data.checkoutUrl || data.url));
          return;
        }
        if (reservationId && token) {
          setResult("pending", "Tu reserva se está preparando.", "Evita crear otra compra mientras terminamos de abrir la sesión segura de Stripe.", data);
          await pollReservation(8);
          return;
        }
        throw new Error("No pudimos abrir Stripe. Inténtalo nuevamente.");
      } catch (error) {
        setCheckoutNotice(error.message, "error");
        setCheckoutLoading(false);
      }
    });

    $("#resultRetry").addEventListener("click", () => {
      checkoutRuntime.polling = false;
      session.remove(storageKeys.request);
      const url = new URL(location.href);
      ["payment", "checkout", "reservation", "reservation_id", "token"].forEach(key => url.searchParams.delete(key));
      history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
      showCheckoutForm();
      setCheckoutLoading(false);
      updateQuantity(quantity.value);
    });
    $("#resultRefresh").addEventListener("click", async () => {
      $("#resultRefresh").hidden = true;
      await pollReservation(1);
    });

    $("#attendeesForm").addEventListener("submit", async event => {
      event.preventDefault();
      const attendeesForm = event.currentTarget;
      if (!attendeesForm.checkValidity()) {
        attendeesForm.reportValidity();
        return;
      }
      const entries = $$(".attendee-entry", attendeesForm);
      const attendees = entries.map((entry, index) => ({
        passId: entry.dataset.passId || undefined,
        index,
        name: $("input[type='text']", entry).value.trim(),
        email: $("input[type='email']", entry).value.trim()
      }));
      attendeesForm.setAttribute("aria-busy", "true");
      $("#attendeesSubmit").disabled = true;
      $("#attendeesNotice").textContent = "Guardando datos…";
      $("#attendeesNotice").className = "attendees-notice";
      try {
        const data = await apiRequest(`/reservations/${encodeURIComponent(checkoutRuntime.reservationId)}/attendees`, {
          method: "PUT",
          headers: { "X-Reservation-Token": checkoutRuntime.token },
          body: JSON.stringify({ token: checkoutRuntime.token, attendees })
        });
        $("#attendeesNotice").textContent = "Datos guardados correctamente.";
        renderAttendees({ ...checkoutRuntime.reservation, ...data });
      } catch (error) {
        $("#attendeesNotice").textContent = error.message;
        $("#attendeesNotice").className = "attendees-notice is-error";
      } finally {
        attendeesForm.setAttribute("aria-busy", "false");
        $("#attendeesSubmit").disabled = false;
      }
    });

    $("#recoveryForm").addEventListener("submit", async event => {
      event.preventDefault();
      const recoveryForm = event.currentTarget;
      if (!recoveryForm.checkValidity()) {
        recoveryForm.reportValidity();
        return;
      }
      const button = $("#recoverySubmit");
      button.disabled = true;
      try {
        await apiRequest("/recover", {
          method: "POST",
          body: JSON.stringify({
            reservationId: $("#recoveryReservation").value.trim(),
            email: $("#recoveryEmail").value.trim()
          })
        });
      } catch { /* respuesta deliberadamente indistinguible */ }
      $("#recoveryNotice").textContent = "Si los datos coinciden con una compra, enviaremos un enlace seguro al correo registrado cuando el proveedor de mensajes esté disponible.";
      button.disabled = false;
    });

    loadCheckoutConfig();
    handleReturnState();
  }

  applyContent();
  setupAccordions();
  setupNavigation();
  setupMotion();
  setupScroll();
  setupMobileCheckoutCta();
  setupCheckout(setupToasts());
})();
