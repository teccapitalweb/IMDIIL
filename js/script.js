const courseData = [
  {
    title: 'Analista de compras',
    image: 'assets/img/courses/analista-de-compras-1.jpg',
    description: 'Programa orientado a fortalecer criterios de evaluación, abastecimiento eficiente y control en procesos de compra.',
    modules: ['Proceso de compras y abastecimiento', 'Evaluación de proveedores', 'Cotizaciones y negociación', 'Control documental y seguimiento'],
    includes: ['Certificado con folio', 'Material de apoyo', 'Clases online', 'Aplicación práctica a industria']
  },
  {
    title: 'Auxiliar de embarques',
    image: 'assets/img/courses/auxiliar-de-embarques-1.jpg',
    description: 'Capacitación para la organización, documentación y seguimiento de embarques en operaciones logísticas.',
    modules: ['Documentación de embarques', 'Coordinación de salida y recepción', 'Rastreo y seguimiento', 'Buenas prácticas logísticas'],
    includes: ['Certificado con folio', 'Formación teórico-práctica', 'Acceso a clases', 'Acompañamiento profesional']
  },
  {
    title: 'Calidad en inspección visual',
    image: 'assets/img/courses/calidad-en-inspecci-u00f3n-visual-1.jpg',
    description: 'Enfocado en criterios de inspección, detección de defectos y mejora de estándares de calidad visual en procesos industriales.',
    modules: ['Fundamentos de calidad', 'Criterios de inspección visual', 'Identificación de defectos', 'Reportes y trazabilidad'],
    includes: ['Certificado con folio', 'Material descargable', 'Casos prácticos', 'Enfoque aplicado']
  },
  {
    title: 'Capacitación ante la STPS y uso de la SIRCE',
    image: 'assets/img/courses/capacitaci-u00f3n-ante-la-stps-y-uso-de-la-sirce-1.jpeg',
    description: 'Curso para comprender obligaciones de capacitación, cumplimiento ante STPS y uso correcto de SIRCE.',
    modules: ['Marco normativo STPS', 'Obligaciones patronales', 'Uso de SIRCE', 'Evidencia y cumplimiento'],
    includes: ['Certificado con folio', 'Guía normativa', 'Clases en línea', 'Enfoque de cumplimiento']
  },
  {
    title: 'Clasificación de mercancías',
    image: 'assets/img/courses/clasificacion-de-mercancias-1.jpg',
    description: 'Desarrolla habilidades para clasificar correctamente mercancías y mejorar procesos logísticos y aduanales.',
    modules: ['Fundamentos arancelarios', 'Criterios de clasificación', 'Interpretación de mercancías', 'Casos aplicados'],
    includes: ['Certificado con folio', 'Material de estudio', 'Aplicación práctica', 'Asesoría profesional']
  },
  {
    title: 'Controller Jr',
    image: 'assets/img/courses/controller-jr-1.jpg',
    description: 'Capacitación inicial para control operativo, seguimiento de indicadores y soporte en la toma de decisiones.',
    modules: ['Funciones del controller', 'Indicadores operativos', 'Control presupuestal', 'Reportes de gestión'],
    includes: ['Certificado con folio', 'Material de apoyo', 'Ejercicios aplicados', 'Acceso a clases']
  },
  {
    title: 'Enfermería industrial',
    image: 'assets/img/courses/enfermeria-industrial-1.jpeg',
    description: 'Formación en atención primaria, respuesta en planta y protocolos de salud ocupacional en entornos industriales.',
    modules: ['Salud ocupacional', 'Atención inicial en planta', 'Primeros auxilios', 'Protocolos y registros'],
    includes: ['Certificado con folio', 'Clases online', 'Enfoque industrial', 'Material práctico']
  },
  {
    title: 'Fundición a presión',
    image: 'assets/img/courses/fundici-u00f3n-a-presion.jpg',
    description: 'Programa para comprender procesos de fundición a presión, control de variables y buenas prácticas de operación.',
    modules: ['Proceso de fundición', 'Control de parámetros', 'Defectos comunes', 'Seguridad y calidad'],
    includes: ['Certificado con folio', 'Temario técnico', 'Aplicación industrial', 'Acompañamiento']
  },
  {
    title: 'Ingeniería de Procesos Lean, Six Sigma',
    image: 'assets/img/courses/ingenier-u00eda-de-procesos-lean-six-sigma-1.jpg',
    description: 'Curso enfocado en optimización de procesos, reducción de variación y mejora continua con herramientas Lean y Six Sigma.',
    modules: ['Principios Lean', 'DMAIC y Six Sigma', 'Mapeo de procesos', 'Proyectos de mejora'],
    includes: ['Certificado con folio', 'Herramientas de mejora', 'Casos reales', 'Material descargable']
  },
  {
    title: 'Kaizen',
    image: 'assets/img/courses/kaizen-1.jpg',
    description: 'Capacitación para implementar cultura de mejora continua y estandarización en equipos de trabajo.',
    modules: ['Principios Kaizen', 'Detección de oportunidades', 'Estandarización', 'Seguimiento de mejoras'],
    includes: ['Certificado con folio', 'Clases online', 'Aplicación práctica', 'Material de apoyo']
  },
  {
    title: 'Lean Manufacturing',
    image: 'assets/img/courses/lean-manufacturing-1.jpg',
    description: 'Enfocado en reducción de desperdicios, productividad y eficiencia operativa en manufactura.',
    modules: ['Desperdicios en manufactura', 'Flujo de valor', 'Herramientas Lean', 'Productividad operativa'],
    includes: ['Certificado con folio', 'Casos industriales', 'Enfoque práctico', 'Acceso a clases']
  },
  {
    title: 'Logística internacional y cruces fronterizos',
    image: 'assets/img/courses/logistica-internacional-y-cruces-fronterizos.jpg',
    description: 'Curso especializado para operaciones internacionales, documentación y coordinación de cruces fronterizos.',
    modules: ['Cadena logística internacional', 'Requisitos documentales', 'Cruces fronterizos', 'Seguimiento de operaciones'],
    includes: ['Certificado con folio', 'Material técnico', 'Escenarios reales', 'Asesoría']
  },
  {
    title: 'Logística y control de inventarios',
    image: 'assets/img/courses/logistica-y-control-de-inventarios.jpg',
    description: 'Desarrolla habilidades para el control eficiente de inventarios, almacenaje y abastecimiento.',
    modules: ['Tipos de inventario', 'Métodos de control', 'Almacenes y rotación', 'Indicadores logísticos'],
    includes: ['Certificado con folio', 'Formación teórico-práctica', 'Ejercicios', 'Acceso online']
  },
  {
    title: 'Manejo seguro de sustancias químicas',
    image: 'assets/img/courses/manejor-seguro-de-sustancias-quimicas.jpg',
    description: 'Formación orientada a seguridad, identificación de riesgos y procedimientos para manejo responsable de sustancias químicas.',
    modules: ['Identificación de riesgos', 'Etiquetado y hojas de seguridad', 'Almacenamiento y manejo', 'Respuesta a incidentes'],
    includes: ['Certificado con folio', 'Cumplimiento normativo', 'Material de apoyo', 'Casos de seguridad']
  },
  {
    title: 'Moldeo por inyección de plástico',
    image: 'assets/img/courses/modeo-por-inyecci-u00f3n-de-plastico.jpeg',
    description: 'Curso técnico sobre operación, parámetros clave y calidad en procesos de moldeo por inyección.',
    modules: ['Proceso de inyección', 'Parámetros de máquina', 'Defectos y ajustes', 'Control de calidad'],
    includes: ['Certificado con folio', 'Formación aplicada', 'Material técnico', 'Clases online']
  },
  {
    title: 'Planificación y control de costos',
    image: 'assets/img/courses/planificaci-u00f3n-y-control-de-costos-1.jpg',
    description: 'Capacitación para analizar costos, planificar recursos y fortalecer la rentabilidad operativa.',
    modules: ['Fundamentos de costos', 'Planeación presupuestal', 'Control y variaciones', 'Análisis para decisiones'],
    includes: ['Certificado con folio', 'Ejercicios prácticos', 'Material descargable', 'Enfoque empresarial']
  },
  {
    title: 'Project management',
    image: 'assets/img/courses/project-management-1.jpeg',
    description: 'Desarrolla habilidades para planear, ejecutar y controlar proyectos con enfoque profesional.',
    modules: ['Inicio y planeación', 'Cronogramas y recursos', 'Control de riesgos', 'Cierre y seguimiento'],
    includes: ['Certificado con folio', 'Herramientas de gestión', 'Casos prácticos', 'Clases online']
  },
  {
    title: 'Pruebas No Destructivas Avanzadas',
    image: 'assets/img/courses/pruebas-no-destructivas-avanzadas.jpg',
    description: 'Curso técnico para comprender métodos avanzados de evaluación sin dañar materiales o componentes.',
    modules: ['Fundamentos PND', 'Métodos avanzados', 'Interpretación de resultados', 'Seguridad y calidad'],
    includes: ['Certificado con folio', 'Temario especializado', 'Material técnico', 'Aplicación industrial']
  },
  {
    title: 'Regulación sanitaria y normatividad COFEPRIS',
    image: 'assets/img/courses/regulacion-sanitaria-y-normatividad-cofepris.jpeg',
    description: 'Programa dirigido a comprender lineamientos regulatorios, cumplimiento y documentación sanitaria.',
    modules: ['Marco regulatorio', 'Normatividad aplicable', 'Procesos de cumplimiento', 'Documentación y evidencias'],
    includes: ['Certificado con folio', 'Guía regulatoria', 'Clases online', 'Soporte técnico']
  },
  {
    title: 'Supervisión de Producción (Nivel Avanzado)',
    image: 'assets/img/courses/supervisi-u00f3n-de-producci-u00f3n-nivel-avanzado.jpg',
    description: 'Enfocado en liderazgo operativo, control de producción y mejora del desempeño en planta.',
    modules: ['Rol del supervisor', 'Control de producción', 'Gestión de equipos', 'Indicadores y mejora'],
    includes: ['Certificado con folio', 'Aplicación industrial', 'Formación práctica', 'Material de apoyo']
  },
  {
    title: 'Trámites ambientales ante SEMARNAT',
    image: 'assets/img/courses/tramites-ambientales-ante-semarnat.jpeg',
    description: 'Capacitación para comprender procesos, requisitos y documentación en trámites ambientales.',
    modules: ['Marco ambiental', 'Trámites ante SEMARNAT', 'Documentación requerida', 'Seguimiento de cumplimiento'],
    includes: ['Certificado con folio', 'Guía normativa', 'Clases online', 'Casos aplicados']
  }
];

const galleryImages = Array.from({ length: 12 }, (_, i) => `assets/img/gallery/gallery-${i + 1}.jpg`);
const opinionImages = Array.from({ length: 10 }, (_, i) => `assets/img/opinions/opinion-${i + 1}.png`);

const coursesGrid = document.getElementById('coursesGrid');
const opinionsTrack = document.getElementById('opinionsTrack');
const galleryGrid = document.getElementById('galleryGrid');
const modal = document.getElementById('courseModal');
const modalBody = document.getElementById('modalBody');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');

function renderCourses() {
  coursesGrid.innerHTML = courseData.map((course, index) => `
    <article class="course-card reveal" style="transition-delay:${(index % 3) * 0.06}s">
      <img src="${course.image}" alt="${course.title}">
      <div class="course-card__body">
        <h3>${course.title}</h3>
        <p>${course.description}</p>
        <button data-course="${index}">Ver detalles</button>
      </div>
    </article>
  `).join('');
}

function openCourseModal(index) {
  const course = courseData[index];
  const whatsappUrl = `https://wa.me/522211832603?text=${encodeURIComponent(`Hola, me interesa inscribirme al curso: ${course.title}. Quiero recibir más información.`)}`;
  modalBody.innerHTML = `
    <article class="modal-course">
      <div>
        <img src="${course.image}" alt="${course.title}">
      </div>
      <div>
        <h3>${course.title}</h3>
        <div class="tags">
          <span>Online</span>
          <span>Certificación</span>
          <span>Aplicación industrial</span>
        </div>
        <p>${course.description}</p>
        <div class="modal-course__columns">
          <div class="modal-course__box">
            <h4>Temario general</h4>
            <ul>${course.modules.map(item => `<li>${item}</li>`).join('')}</ul>
          </div>
          <div class="modal-course__box">
            <h4>Incluye</h4>
            <ul>${course.includes.map(item => `<li>${item}</li>`).join('')}</ul>
          </div>
        </div>
        <div class="modal-course__actions">
          <a href="${whatsappUrl}" target="_blank" rel="noopener" class="btn btn--primary modal-course__cta">Inscribirme por WhatsApp</a>
          <a href="#contacto" class="btn btn--ghost" data-close="true">Solicitar más información</a>
        </div>
      </div>
    </article>
  `;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderGallery() {
  galleryGrid.innerHTML = galleryImages.map((src, index) => `
    <button class="gallery-item reveal" style="transition-delay:${(index % 4) * 0.05}s" data-src="${src}" aria-label="Abrir imagen ${index + 1}">
      <img src="${src}" alt="Galería IMDIIL ${index + 1}">
    </button>
  `).join('');
}

let currentGalleryIndex = 0;

function openLightbox(src) {
  currentGalleryIndex = galleryImages.indexOf(src);
  if (currentGalleryIndex < 0) currentGalleryIndex = 0;
  updateLightbox();
  lightbox.classList.add('is-open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function updateLightbox() {
  const src = galleryImages[currentGalleryIndex];
  lightboxImage.src = src;
  lightboxCaption.textContent = `Imagen ${currentGalleryIndex + 1} de ${galleryImages.length}`;
}

function nextLightboxImage() {
  currentGalleryIndex = (currentGalleryIndex + 1) % galleryImages.length;
  updateLightbox();
}

function prevLightboxImage() {
  currentGalleryIndex = (currentGalleryIndex - 1 + galleryImages.length) % galleryImages.length;
  updateLightbox();
}

function closeLightbox() {
  lightbox.classList.remove('is-open');
  lightbox.setAttribute('aria-hidden', 'true');
  lightboxImage.src = '';
  lightboxCaption.textContent = '';
  document.body.style.overflow = '';
}

function renderOpinions() {
  opinionsTrack.innerHTML = opinionImages.map((src, index) => `
    <div class="carousel__slide">
      <div class="carousel__card">
        <img src="${src}" alt="Opinión de alumno ${index + 1}">
      </div>
    </div>
  `).join('');
}

let currentSlide = 0;
let autoSlide;

function updateCarousel() {
  opinionsTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
}

function nextSlide() {
  currentSlide = (currentSlide + 1) % opinionImages.length;
  updateCarousel();
}

function prevSlide() {
  currentSlide = (currentSlide - 1 + opinionImages.length) % opinionImages.length;
  updateCarousel();
}

function startAutoSlide() {
  clearInterval(autoSlide);
  autoSlide = setInterval(nextSlide, 3500);
}

function setupEvents() {
  document.addEventListener('click', (event) => {
    const courseBtn = event.target.closest('[data-course]');
    if (courseBtn) openCourseModal(Number(courseBtn.dataset.course));

    if (event.target.closest('[data-close="true"]') || event.target.closest('.modal__close')) closeModal();
    if (event.target.closest('[data-close="true"]') || event.target.closest('.lightbox__close')) closeLightbox();
    if (event.target.closest('.lightbox__nav--next')) nextLightboxImage();
    if (event.target.closest('.lightbox__nav--prev')) prevLightboxImage();

    const galleryBtn = event.target.closest('.gallery-item');
    if (galleryBtn) openLightbox(galleryBtn.dataset.src);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeModal();
      closeLightbox();
    }
    if (!lightbox.classList.contains('is-open')) return;
    if (event.key === 'ArrowRight') nextLightboxImage();
    if (event.key === 'ArrowLeft') prevLightboxImage();
  });

  document.querySelector('.carousel__btn--next').addEventListener('click', () => {
    nextSlide();
    startAutoSlide();
  });
  document.querySelector('.carousel__btn--prev').addEventListener('click', () => {
    prevSlide();
    startAutoSlide();
  });

  const navToggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  navToggle.addEventListener('click', () => nav.classList.toggle('is-open'));
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => nav.classList.remove('is-open')));
}

function animateCounter(el, target) {
  const duration = target >= 100 ? 2400 : 1800;
  const start = performance.now();
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = Math.floor(target * easeOutCubic(progress));
    el.textContent = `+${value}`;

    if (progress < 1) {
      requestAnimationFrame(frame);
    } else {
      el.textContent = `+${target}`;
    }
  }

  requestAnimationFrame(frame);
}

function setupCounter() {
  const counters = document.querySelectorAll('.counter');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = Number(el.dataset.target);
      animateCounter(el, target);
      observer.unobserve(el);
    });
  }, { threshold: 0.45 });
  counters.forEach(counter => observer.observe(counter));
}

function setupReveal() {
  const items = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('is-visible');
    });
  }, { threshold: 0.15 });
  items.forEach(item => observer.observe(item));
}

// Carrusel infinito de empresas: duplicar imágenes
function setupEmpresasCarousel() {
  const track = document.querySelector('.empresas-track');
  if (!track) return;
  const imgs = Array.from(track.children);
  imgs.forEach(img => {
    const clone = img.cloneNode(true);
    track.appendChild(clone);
  });
}

renderCourses();
renderGallery();
renderOpinions();
setupEvents();
setupCounter();
setupReveal();
updateCarousel();
startAutoSlide();
setupEmpresasCarousel();
