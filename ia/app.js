(() => {
  "use strict";
  const config = window.SITE_CONFIG;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  const money = amount => new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 }).format(amount);

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

  function setupPreviewActions() {
    const toast = $("#toast");
    const text = $("#toastText");
    let timer;
    const show = message => {
      text.textContent = message;
      toast.classList.add("show");
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove("show"), 7000);
    };
    $("#toastClose").addEventListener("click", () => toast.classList.remove("show"));
    $$(".checkout-trigger").forEach(button => button.addEventListener("click", () => {
      if (config.checkout.enabled && config.checkout.url) location.href = config.checkout.url;
      else show(config.checkout.notice);
    }));
    $("#videoButton").addEventListener("click", () => {
      if (config.video.source) show("El reproductor oficial se abrirá aquí.");
      else show(config.video.description);
    });
  }

  applyContent();
  setupAccordions();
  setupNavigation();
  setupMotion();
  setupScroll();
  setupPreviewActions();
})();
