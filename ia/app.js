(() => {
  "use strict";
  const config = window.SITE_CONFIG;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const money = amount => {
    const value = Number(amount) || 0;
    return new Intl.NumberFormat("es-MX", {
      minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
      maximumFractionDigits: 2
    }).format(value);
  };
  const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  })[character]);
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
    configVersion: null,
    publishableKey: String(config.checkout.publishableKey || ""),
    reservationId: null,
    token: null,
    reservation: null,
    polling: false,
    stripe: null,
    elements: null,
    paymentElement: null,
    clientSecret: null
  };

  const formatMinor = amount => `$${money((Number(amount) || 0) / 100)} ${config.course.currency}`;
  const session = {
    get(key) { try { return sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { sessionStorage.setItem(key, value); } catch { /* private mode */ } },
    remove(key) { try { sessionStorage.removeItem(key); } catch { /* private mode */ } }
  };

  function syncMobileCtaAccessibility() {
    const cta = $(".mobile-cta");
    if (!cta) return;
    const hidden = document.body.classList.contains("menu-open")
      || cta.classList.contains("is-context-hidden")
      || cta.classList.contains("is-interaction-hidden");
    cta.inert = hidden;
    if (hidden) cta.setAttribute("aria-hidden", "true");
    else cta.removeAttribute("aria-hidden");
  }

  function setMobileCtaState(className, hidden) {
    const cta = $(".mobile-cta");
    if (!cta) return;
    cta.classList.toggle(className, hidden);
    syncMobileCtaAccessibility();
  }

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
    $("#heroSpeakerName").textContent = config.speaker.name;
    $("#heroSpeakerPhoto").src = config.speaker.photo;
    $("#heroSpeakerPhoto").alt = config.speaker.name;
    $("#metaDate").textContent = config.course.dateShort;
    $("#metaSchedule").textContent = config.course.scheduleShort;
    $("#metaModality").textContent = config.course.modality;
    $("#metaLocation").textContent = config.course.city.toUpperCase();
    $("#metaDuration").textContent = config.course.duration.toUpperCase();
    $("#metaPrice").textContent = `$${money(config.course.price)} ${config.course.currency}`;
    $("#heroMobileDate").textContent = config.course.dateLong;
    $("#heroMobileSchedule").textContent = config.course.schedule.replace(" — ", " a ");
    $("#heroMobileModality").textContent = `Presencial en ${config.course.city}`;
    const eventStart = new Date(config.course.startDate);
    const countdownDate = $("#countdownDate");
    if (countdownDate && Number.isFinite(eventStart.getTime())) {
      const datePart = new Intl.DateTimeFormat("es-MX", {
        day: "2-digit", month: "long", year: "numeric", timeZone: config.course.timeZone
      }).format(eventStart).toUpperCase();
      const timePart = new Intl.DateTimeFormat("es-MX", {
        hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: config.course.timeZone
      }).format(eventStart);
      countdownDate.textContent = `${datePart} · ${timePart} H`;
    }

    $("#videoState").textContent = config.video.status;
    $("#videoDescription").textContent = config.video.description;
    const videoSection = $("#experiencia");
    videoSection.hidden = false;
    videoSection.dataset.videoState = config.video.source ? "ready" : "placeholder";
    $("#videoButton").setAttribute(
      "aria-label",
      config.video.source ? config.video.title : `${config.video.status}. ${config.video.description}`
    );
    $("#speakerName").textContent = config.speaker.name.toUpperCase();
    $("#speakerRole").textContent = config.speaker.role;
    $("#speakerBrief").textContent = config.speaker.summary || config.speaker.bio[0] || "";
    $("#speakerBio").innerHTML = config.speaker.bio.map(paragraph => `<p>${paragraph}</p>`).join("");
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
    const contactEmail = $("#contactEmail");
    contactEmail.textContent = config.contact.email || "";
    contactEmail.href = config.contact.email ? `mailto:${config.contact.email}` : "#";
    contactEmail.hidden = !config.contact.email;
    $("#certificateTitle").innerHTML = "CERTIFICADO<br><em>INCLUIDO.</em>";
    $("#certificateDescription").textContent = config.certificate.description;
    $("#certificateFeatures").innerHTML = config.certificate.features.map(item => `<li>${item}</li>`).join("");

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
        <button class="program-trigger" type="button" aria-expanded="false" aria-controls="module-${index}">
          <span class="program-number">${item.number}</span>
          <span class="program-time">${item.duration}</span>
          <span class="program-title"><strong>${item.title}</strong><small>${item.summary}</small></span>
          <span class="program-plus" aria-hidden="true">+</span>
        </button>
        <div class="program-panel" id="module-${index}" aria-hidden="true">
          <div><div class="program-panel-content">
            <ol>${item.topics.map(topic => `<li>${topic}</li>`).join("")}</ol>
            <p class="program-objective"><strong>EJERCICIO PRÁCTICO</strong>${item.exercise}</p>
          </div></div>
        </div>
      </article>`).join("");
    const testimonialsSection = $("#testimonials");
    const testimonials = Array.isArray(config.testimonials) ? config.testimonials : [];
    testimonialsSection.hidden = testimonials.length === 0;
    $("#enrollmentSectionNumber").textContent = testimonials.length ? "06" : "05";
    $("#faqSectionNumber").textContent = testimonials.length ? "07" : "06";
    if (testimonials.length) {
      const cardMarkup = items => items.map(item => `
        <figure class="testimonial-card">
          <blockquote>${escapeHtml(item.quote)}</blockquote>
          <figcaption><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.role || "")}</span></figcaption>
        </figure>`).join("");
      ["testimonialRowA", "testimonialRowB", "testimonialRowC"].forEach((id, rowIndex) => {
        const ordered = testimonials.map((_, itemIndex) => testimonials[(itemIndex + rowIndex) % testimonials.length]);
        const cards = cardMarkup(ordered);
        $(`#${id}`).innerHTML = `<div class="testimonial-marquee"><div class="testimonial-group">${cards}</div><div class="testimonial-group" aria-hidden="true">${cards}</div></div>`;
      });
      const pauseButton = $("#testimonialPause");
      pauseButton.addEventListener("click", () => {
        const paused = !testimonialsSection.classList.contains("is-paused");
        testimonialsSection.classList.toggle("is-paused", paused);
        pauseButton.setAttribute("aria-pressed", String(paused));
        pauseButton.textContent = paused ? "Reanudar movimiento" : "Pausar movimiento";
      });
    }

    $("#faqList").innerHTML = config.faq.map((item, index) => `
      <article class="faq-item reveal">
        <button class="faq-trigger" type="button" aria-expanded="false" aria-controls="faq-${index}">
          <span class="index">0${index + 1}</span><span class="question">${item[0]}</span><span class="plus" aria-hidden="true">+</span>
        </button>
        <div class="faq-answer" id="faq-${index}" aria-hidden="true"><div><p>${item[1]}</p></div></div>
      </article>`).join("");
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

  function applyRuntimePrice() {
    const major = checkoutRuntime.unitAmount / 100;
    config.course.price = major;
    const full = `$${money(major)} ${config.course.currency}`;
    const short = `$${money(major)}`;
    const meta = $("#metaPrice");
    const ticket = $("#ticketPrice");
    const mobile = $("#mobilePrice");
    if (meta) meta.textContent = full;
    if (ticket) ticket.textContent = money(major);
    if (mobile) mobile.textContent = short;
    const priceFaqIndex = config.faq.findIndex(item => /cu[aá]nto cuesta/i.test(String(item[0] || "")));
    if (priceFaqIndex >= 0) {
      config.faq[priceFaqIndex][1] = `${full}. El cupo inicial es de 25 personas y puede ampliarse según la demanda.`;
      const answer = $(`#faq-${priceFaqIndex} p`);
      if (answer) answer.textContent = config.faq[priceFaqIndex][1];
    }
    const structured = $("#structuredData");
    if (structured?.textContent) {
      try {
        const data = JSON.parse(structured.textContent);
        if (data.offers) data.offers.price = major;
        structured.textContent = JSON.stringify(data);
      } catch { /* el JSON-LD se vuelve a generar al recargar */ }
    }
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

  function setupCountdown() {
    const countdown = window.IMDIIL_COUNTDOWN;
    const section = $(".hero-countdown");
    const title = $("#countdownTitle");
    const status = $("#countdownStatus");
    const fields = {
      days: $("#countdownDays"),
      hours: $("#countdownHours"),
      minutes: $("#countdownMinutes"),
      seconds: $("#countdownSeconds")
    };
    if (!countdown?.remainingUntil || !section || Object.values(fields).some(field => !field)) return;

    let timer = null;
    let available = true;
    const render = () => {
      try {
        const remaining = countdown.remainingUntil(config.course.startDate, Date.now());
        fields.days.textContent = String(remaining.days).padStart(3, "0");
        fields.hours.textContent = String(remaining.hours).padStart(2, "0");
        fields.minutes.textContent = String(remaining.minutes).padStart(2, "0");
        fields.seconds.textContent = String(remaining.seconds).padStart(2, "0");
        if (remaining.started) {
          section.classList.add("has-started");
          $(".countdown-units", section)?.setAttribute("aria-hidden", "true");
          title.textContent = "El evento ha comenzado";
          status.textContent = "El evento ha comenzado";
          if (timer) clearInterval(timer);
        }
      } catch {
        available = false;
        section.hidden = true;
        if (timer) clearInterval(timer);
      }
    };

    render();
    if (available && !section.classList.contains("has-started")) timer = setInterval(render, 1000);
  }

  function setupAccordions() {
    const syncInteractionCta = () => {
      const readingDetails = Boolean($(".program-item.open") || $(".speaker-biography[open]"));
      setMobileCtaState("is-interaction-hidden", readingDetails);
    };
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
      syncInteractionCta();
    }));
    $$(".faq-trigger").forEach(trigger => trigger.addEventListener("click", () => {
      const item = trigger.closest(".faq-item");
      const open = item.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open));
      $(".faq-answer", item).setAttribute("aria-hidden", String(!open));
    }));
    $(".speaker-biography")?.addEventListener("toggle", syncInteractionCta);
  }

  function setupNavigation() {
    const toggle = $("#menuToggle");
    const nav = $("#siteNav");
    const close = () => {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
      document.body.classList.remove("menu-open");
      syncMobileCtaAccessibility();
    };
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("open", open);
      document.body.classList.toggle("menu-open", open);
      syncMobileCtaAccessibility();
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
    const hero = $(".hero");
    if (!cta || !hero || !enrollment) return;
    const visibleSections = new Set();
    setMobileCtaState("is-context-hidden", true);
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) visibleSections.add(entry.target);
        else visibleSections.delete(entry.target);
      });
      setMobileCtaState("is-context-hidden", visibleSections.size > 0);
    }, { threshold: 0.04 });
    observer.observe(hero);
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
    const transient = ["token", "payment", "checkout", "reservation", "reservation_id", "payment_intent", "payment_intent_client_secret", "redirect_status"];
    if (!transient.some(key => url.searchParams.has(key))) return;
    transient.forEach(key => url.searchParams.delete(key));
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  function destroyPaymentElement() {
    if (checkoutRuntime.paymentElement) {
      try { checkoutRuntime.paymentElement.destroy(); } catch { /* ya desmontado */ }
    }
    checkoutRuntime.paymentElement = null;
    checkoutRuntime.elements = null;
    checkoutRuntime.clientSecret = null;
    const mount = $("#paymentElement");
    if (mount) mount.replaceChildren();
  }

  function showCheckoutForm() {
    destroyPaymentElement();
    $("#checkoutForm").hidden = false;
    $("#paymentElementPanel").hidden = true;
    $("#paymentResult").hidden = true;
    $("#recoveryPanel").hidden = false;
  }

  function setPaymentLoading(loading) {
    const panel = $("#paymentElementPanel");
    const button = $("#paymentSubmit");
    panel.setAttribute("aria-busy", String(loading));
    button.disabled = loading;
    button.classList.toggle("is-loading", loading);
    $("#paymentSubmitText").textContent = loading ? "Confirmando pago" : "Confirmar y pagar";
    $("#paymentBack").disabled = loading;
  }

  function setPaymentNotice(message, state = "") {
    const notice = $("#paymentNotice");
    notice.textContent = message;
    notice.className = `checkout-notice${state ? ` is-${state}` : ""}`;
  }

  async function mountPaymentElement(data, quantity) {
    const clientSecret = String(data.clientSecret || "");
    if (!/^pi_[^_]+.*_secret_/.test(clientSecret)) throw new Error("Stripe no devolvió una autorización de pago válida.");
    if (!checkoutRuntime.publishableKey || !/^pk_(test|live)_/.test(checkoutRuntime.publishableKey)) {
      throw new Error("La llave pública de Stripe no está configurada.");
    }
    if (typeof window.Stripe !== "function") throw new Error("Stripe no terminó de cargar. Recarga la página e inténtalo nuevamente.");
    destroyPaymentElement();
    checkoutRuntime.stripe ||= window.Stripe(checkoutRuntime.publishableKey);
    checkoutRuntime.clientSecret = clientSecret;
    checkoutRuntime.elements = checkoutRuntime.stripe.elements({
      clientSecret,
      appearance: {
        theme: "stripe",
        variables: {
          colorPrimary: "#f59d1a",
          colorText: "#151412",
          colorBackground: "#f6f3ee",
          colorDanger: "#b84034",
          fontFamily: "Manrope, Arial, sans-serif",
          borderRadius: "10px"
        }
      }
    });
    checkoutRuntime.paymentElement = checkoutRuntime.elements.create("payment", {
      layout: { type: "tabs" }
    });
    checkoutRuntime.paymentElement.mount("#paymentElement");
    $("#checkoutForm").hidden = true;
    $("#paymentResult").hidden = true;
    $("#paymentElementPanel").hidden = false;
    $("#paymentOrderPlaces").textContent = `${quantity} ${quantity === 1 ? "lugar" : "lugares"}`;
    $("#paymentOrderTotal").textContent = formatMinor(checkoutRuntime.unitAmount * quantity);
    setPaymentLoading(false);
    setPaymentNotice("Stripe procesa tus datos de tarjeta; IMDIIL no los almacena.", "ready");
    $("#paymentElementTitle").focus?.({ preventScroll: true });
  }

  function setResult(state, title, message, data = null) {
    destroyPaymentElement();
    const panel = $("#paymentResult");
    panel.hidden = false;
    panel.dataset.state = state;
    $("#checkoutForm").hidden = true;
    $("#paymentElementPanel").hidden = true;
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
    const stripeReference = data.stripePaymentIntentId || data.paymentIntentId || data.stripeSessionId || data.checkoutSessionId || data.stripe?.paymentIntentId || data.stripe?.sessionId;
    if (!stripeReference && ["checkout_error", "checkout_failed", "payment_intent_failed"].includes(errorCode)) return "checkout_error";
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
    const redirectStatus = String(params.get("redirect_status") || "").toLowerCase();
    const payment = String(params.get("payment") || params.get("checkout") || (redirectStatus ? "return" : "")).toLowerCase();
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
      const remoteVersion = Number(remote.configVersion ?? remote.version ?? remote.price?.version);
      checkoutRuntime.configVersion = Number.isSafeInteger(remoteVersion) && remoteVersion >= 0 ? remoteVersion : null;
      const remotePublishableKey = String(remote.publishableKey || remote.stripePublishableKey || "");
      if (/^pk_(test|live)_/.test(remotePublishableKey)) checkoutRuntime.publishableKey = remotePublishableKey;
      const remoteMax = Math.trunc(Number(remote.maxPerOrder ?? remote.limits?.maxPerOrder ?? config.checkout.maxPerOrder));
      if (remoteMax > 0) checkoutRuntime.maxPerOrder = remoteMax;
      const available = remote.availability?.available ?? remote.available;
      if (available !== null && available !== undefined && Number.isFinite(Number(available))) {
        checkoutRuntime.maxPerOrder = Math.max(1, Math.min(checkoutRuntime.maxPerOrder, Number(available)));
      }
      checkoutRuntime.mode = String(remote.mode || config.checkout.mode || "test") === "live" ? "live" : "test";
      checkoutRuntime.enabled = remote.enabled === true && Number(available ?? 1) !== 0;
      applyRuntimePrice();
      updateQuantity($("#seatQuantity").value);
      setCheckoutLoading(false);
      if (checkoutRuntime.enabled) {
        const modeNote = checkoutRuntime.mode === "test" ? "Modo de prueba activo. No utilices una tarjeta real." : "Pago seguro con Stripe habilitado.";
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
      $("#purchasePanel").scrollIntoView({ behavior: "smooth", block: "start" });
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
        requestToken,
        ...(checkoutRuntime.configVersion !== null ? { configVersion: checkoutRuntime.configVersion } : {})
      };
      try {
        const data = await apiRequest("/checkout", { method: "POST", body: JSON.stringify(payload) });
        const reservationId = data.reservationId || data.reservation?.id;
        const token = data.statusToken || data.token || data.reservationToken;
        rememberReservation(reservationId, token);
        if (data.clientSecret && reservationId && token) {
          await mountPaymentElement(data, payload.quantity);
          return;
        }
        if (reservationId && token) {
          setResult("pending", "Tu reserva se está preparando.", "Evita crear otra compra mientras terminamos de abrir el formulario seguro de Stripe.", data);
          await pollReservation(8);
          return;
        }
        throw new Error("No pudimos preparar Stripe. Inténtalo nuevamente.");
      } catch (error) {
        if (error.code === "price_changed") await loadCheckoutConfig();
        setCheckoutNotice(error.message, "error");
        setCheckoutLoading(false);
      }
    });

    $("#paymentSubmit").addEventListener("click", async () => {
      if (!checkoutRuntime.stripe || !checkoutRuntime.elements || !checkoutRuntime.reservationId || !checkoutRuntime.token) {
        setPaymentNotice("No pudimos recuperar la autorización de pago. Edita los datos e inténtalo nuevamente.", "error");
        return;
      }
      setPaymentLoading(true);
      setPaymentNotice("Validando el pago directamente con Stripe.");
      const returnUrl = new URL(location.href);
      returnUrl.search = "";
      returnUrl.searchParams.set("payment", "return");
      returnUrl.searchParams.set("reservation", checkoutRuntime.reservationId);
      returnUrl.hash = "inscripcion";
      try {
        const result = await checkoutRuntime.stripe.confirmPayment({
          elements: checkoutRuntime.elements,
          confirmParams: { return_url: returnUrl.href },
          redirect: "if_required"
        });
        if (result.error) {
          setPaymentNotice(result.error.message || "Stripe no pudo confirmar el pago. Revisa los datos e inténtalo nuevamente.", "error");
          setPaymentLoading(false);
          return;
        }
        setResult("pending", "Comprobando tu pago…", "Stripe recibió la operación. La inscripción quedará confirmada únicamente cuando el servidor valide el pago.", {
          reservationId: checkoutRuntime.reservationId,
          quantity: normalizeQuantity(quantity.value),
          totalAmount: checkoutRuntime.unitAmount * normalizeQuantity(quantity.value),
          state: result.paymentIntent?.status || "pending_payment"
        });
        await pollReservation();
      } catch (error) {
        setPaymentNotice(error.message || "No pudimos conectar con Stripe. Inténtalo nuevamente.", "error");
        setPaymentLoading(false);
      }
    });

    $("#paymentBack").addEventListener("click", async () => {
      const reservationId = checkoutRuntime.reservationId;
      const token = checkoutRuntime.token;
      setPaymentLoading(true);
      if (reservationId && token) {
        try {
          await apiRequest(`/reservations/${encodeURIComponent(reservationId)}/cancel`, {
            method: "POST",
            body: JSON.stringify({ token }),
            headers: { "X-Reservation-Token": token }
          });
        } catch { /* el servidor conciliará cualquier intento ya finalizado */ }
      }
      checkoutRuntime.reservationId = null;
      checkoutRuntime.token = null;
      session.remove(storageKeys.request);
      session.remove(storageKeys.reservation);
      session.remove(storageKeys.token);
      showCheckoutForm();
      setCheckoutLoading(false);
      setCheckoutNotice("Puedes ajustar los datos antes de generar una nueva autorización.", "ready");
    });

    $("#resultRetry").addEventListener("click", () => {
      checkoutRuntime.polling = false;
      checkoutRuntime.reservationId = null;
      checkoutRuntime.token = null;
      session.remove(storageKeys.request);
      session.remove(storageKeys.reservation);
      session.remove(storageKeys.token);
      const url = new URL(location.href);
      ["payment", "checkout", "reservation", "reservation_id", "token", "payment_intent", "payment_intent_client_secret", "redirect_status"].forEach(key => url.searchParams.delete(key));
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
  setupCountdown();
  setupAccordions();
  setupNavigation();
  setupMotion();
  setupScroll();
  setupMobileCheckoutCta();
  setupCheckout(setupToasts());
})();
