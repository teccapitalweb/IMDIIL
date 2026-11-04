/* Guía virtual de IMDIIL · configuración (cursos reales del sitio y ruta de 7 preguntas).
   Mismo motor que la guía de SYNOVA. Las respuestas de la ruta se guardan sin datos personales
   en el webhook (/api/encuesta/ruta) y se ven en el admin: Encuestas → Ruta de la guía. */
window.IMDIIL_GUIDE_CONFIG = Object.freeze({
  id: 'imdiil-guia-industrial',
  assistantName: 'Guía IMDIIL',
  assistantLabel: 'Asistente virtual · Ingeniería industrial',
  apiBase: 'https://imdiil-webhook-production.up.railway.app',
  image: 'assets/img/guia/guia.webp',
  blinkImage: 'assets/img/guia/guia-parpadeo.webp',
  bustImage: 'assets/img/guia/busto-guia.webp',
  bustBlinkImage: 'assets/img/guia/busto-guia-parpadeo.webp',
  privacyUrl: '',
  whatsappUrl: 'https://wa.me/522211832603?text=Hola%2C%20vengo%20de%20la%20gu%C3%ADa%20virtual%20de%20IMDIIL%20y%20necesito%20orientaci%C3%B3n.',
  catalogUrl: 'vip-auth.html?origen=guia-imdiil',
  welcome: 'Hola, soy la guía virtual de IMDIIL. Puedo explicarte conceptos de ingeniería industrial y logística, ayudarte a encontrar un curso o preparar una ruta personalizada en 7 preguntas.',
  courses: [
    {"id": "analista-de-compras", "title": "Analista de compras", "area": "Compras y abastecimiento", "classes": 4, "detail": "Programa orientado a fortalecer criterios de evaluación, abastecimiento eficiente y control en procesos de compra.", "tags": ["compras", "proveedores", "abastecimiento", "negociacion", "administracion", "fundamentos"], "image": "assets/img/courses/analista-de-compras-1.jpg"},
    {"id": "auxiliar-de-embarques", "title": "Auxiliar de embarques", "area": "Logística", "classes": 4, "detail": "Capacitación para la organización, documentación y seguimiento de embarques en operaciones logísticas.", "tags": ["logistica", "embarques", "documentacion", "fundamentos", "empleo"], "image": "assets/img/courses/auxiliar-de-embarques-1.jpg"},
    {"id": "calidad-en-inspeccion-visual", "title": "Calidad en inspección visual", "area": "Calidad", "classes": 4, "detail": "Enfocado en criterios de inspección, detección de defectos y mejora de estándares de calidad visual en procesos industriales.", "tags": ["calidad", "inspeccion", "defectos", "produccion", "fundamentos", "tecnica"], "image": "assets/img/courses/calidad-en-inspecci-u00f3n-visual-1.jpg"},
    {"id": "capacitacion-ante-la-stps-y-uso-de-la-sirce", "title": "Capacitación ante la STPS y uso de la SIRCE", "area": "Normatividad y seguridad", "classes": 4, "detail": "Curso para comprender obligaciones de capacitación, cumplimiento ante STPS y uso correcto de SIRCE.", "tags": ["normatividad", "stps", "cumplimiento", "seguridad", "rh", "documentacion"], "image": "assets/img/courses/capacitaci-u00f3n-ante-la-stps-y-uso-de-la-sirce-1.jpeg"},
    {"id": "clasificacion-de-mercancias", "title": "Clasificación de mercancías", "area": "Comercio exterior", "classes": 4, "detail": "Desarrolla habilidades para clasificar correctamente mercancías y mejorar procesos logísticos y aduanales.", "tags": ["comercio-exterior", "aduanas", "logistica", "normatividad", "documentacion"], "image": "assets/img/courses/clasificacion-de-mercancias-1.jpg"},
    {"id": "controller-jr", "title": "Controller Jr", "area": "Finanzas y control", "classes": 4, "detail": "Capacitación inicial para control operativo, seguimiento de indicadores y soporte en la toma de decisiones.", "tags": ["costos", "indicadores", "finanzas", "gestion", "administracion"], "image": "assets/img/courses/controller-jr-1.jpg"},
    {"id": "enfermeria-industrial", "title": "Enfermería industrial", "area": "Salud ocupacional", "classes": 4, "detail": "Formación en atención primaria, respuesta en planta y protocolos de salud ocupacional en entornos industriales.", "tags": ["seguridad", "salud-ocupacional", "primeros-auxilios", "normatividad"], "image": "assets/img/courses/enfermeria-industrial-1.jpeg"},
    {"id": "fundicion-a-presion", "title": "Fundición a presión", "area": "Procesos de manufactura", "classes": 4, "detail": "Programa para comprender procesos de fundición a presión, control de variables y buenas prácticas de operación.", "tags": ["manufactura", "procesos", "tecnica", "defectos", "calidad", "produccion"], "image": "assets/img/courses/fundici-u00f3n-a-presion.jpg"},
    {"id": "ingenieria-de-procesos-lean-six-sigma", "title": "Ingeniería de Procesos Lean, Six Sigma", "area": "Mejora continua", "classes": 4, "detail": "Curso enfocado en optimización de procesos, reducción de variación y mejora continua con herramientas Lean y Six Sigma.", "tags": ["lean", "six-sigma", "mejora", "procesos", "productividad", "calidad", "avanzado"], "image": "assets/img/courses/ingenier-u00eda-de-procesos-lean-six-sigma-1.jpg"},
    {"id": "kaizen", "title": "Kaizen", "area": "Mejora continua", "classes": 4, "detail": "Capacitación para implementar cultura de mejora continua y estandarización en equipos de trabajo.", "tags": ["kaizen", "mejora", "lean", "productividad", "equipos", "fundamentos"], "image": "assets/img/courses/kaizen-1.jpg"},
    {"id": "lean-manufacturing", "title": "Lean Manufacturing", "area": "Mejora continua", "classes": 4, "detail": "Enfocado en reducción de desperdicios, productividad y eficiencia operativa en manufactura.", "tags": ["lean", "mejora", "productividad", "manufactura", "desperdicios", "produccion"], "image": "assets/img/courses/lean-manufacturing-1.jpg"},
    {"id": "logistica-internacional-y-cruces-fronterizos", "title": "Logística internacional y cruces fronterizos", "area": "Comercio exterior", "classes": 4, "detail": "Curso especializado para operaciones internacionales, documentación y coordinación de cruces fronterizos.", "tags": ["logistica", "comercio-exterior", "aduanas", "documentacion", "avanzado"], "image": "assets/img/courses/logistica-internacional-y-cruces-fronterizos.jpg"},
    {"id": "logistica-y-control-de-inventarios", "title": "Logística y control de inventarios", "area": "Logística", "classes": 4, "detail": "Desarrolla habilidades para el control eficiente de inventarios, almacenaje y abastecimiento.", "tags": ["logistica", "inventarios", "almacen", "indicadores", "abastecimiento"], "image": "assets/img/courses/logistica-y-control-de-inventarios.jpg"},
    {"id": "manejo-seguro-de-sustancias-quimicas", "title": "Manejo seguro de sustancias químicas", "area": "Normatividad y seguridad", "classes": 4, "detail": "Formación orientada a seguridad, identificación de riesgos y procedimientos para manejo responsable de sustancias químicas.", "tags": ["seguridad", "quimicos", "normatividad", "riesgos", "cumplimiento"], "image": "assets/img/courses/manejor-seguro-de-sustancias-quimicas.jpg"},
    {"id": "moldeo-por-inyeccion-de-plastico", "title": "Moldeo por inyección de plástico", "area": "Procesos de manufactura", "classes": 4, "detail": "Curso técnico sobre operación, parámetros clave y calidad en procesos de moldeo por inyección.", "tags": ["manufactura", "procesos", "plasticos", "tecnica", "defectos", "produccion"], "image": "assets/img/courses/modeo-por-inyecci-u00f3n-de-plastico.jpeg"},
    {"id": "planificacion-y-control-de-costos", "title": "Planificación y control de costos", "area": "Finanzas y control", "classes": 4, "detail": "Capacitación para analizar costos, planificar recursos y fortalecer la rentabilidad operativa.", "tags": ["costos", "finanzas", "presupuesto", "indicadores", "gestion"], "image": "assets/img/courses/planificaci-u00f3n-y-control-de-costos-1.jpg"},
    {"id": "project-management", "title": "Project management", "area": "Gestión de proyectos", "classes": 4, "detail": "Desarrolla habilidades para planear, ejecutar y controlar proyectos con enfoque profesional.", "tags": ["proyectos", "gestion", "liderazgo", "planeacion", "equipos"], "image": "assets/img/courses/project-management-1.jpeg"},
    {"id": "pruebas-no-destructivas-avanzadas", "title": "Pruebas No Destructivas Avanzadas", "area": "Calidad", "classes": 4, "detail": "Curso técnico para comprender métodos avanzados de evaluación sin dañar materiales o componentes.", "tags": ["calidad", "inspeccion", "tecnica", "avanzado", "materiales"], "image": "assets/img/courses/pruebas-no-destructivas-avanzadas.jpg"},
    {"id": "regulacion-sanitaria-y-normatividad-cofepris", "title": "Regulación sanitaria y normatividad COFEPRIS", "area": "Normatividad y seguridad", "classes": 4, "detail": "Programa dirigido a comprender lineamientos regulatorios, cumplimiento y documentación sanitaria.", "tags": ["normatividad", "cofepris", "cumplimiento", "documentacion", "regulacion"], "image": "assets/img/courses/regulacion-sanitaria-y-normatividad-cofepris.jpeg"},
    {"id": "supervision-de-produccion-nivel-avanzado", "title": "Supervisión de Producción (Nivel Avanzado)", "area": "Producción", "classes": 4, "detail": "Enfocado en liderazgo operativo, control de producción y mejora del desempeño en planta.", "tags": ["produccion", "supervision", "liderazgo", "indicadores", "equipos", "avanzado", "mejora"], "image": "assets/img/courses/supervisi-u00f3n-de-producci-u00f3n-nivel-avanzado.jpg"},
    {"id": "tramites-ambientales-ante-semarnat", "title": "Trámites ambientales ante SEMARNAT", "area": "Normatividad y seguridad", "classes": 4, "detail": "Capacitación para comprender procesos, requisitos y documentación en trámites ambientales.", "tags": ["normatividad", "ambiental", "semarnat", "cumplimiento", "documentacion"], "image": "assets/img/courses/tramites-ambientales-ante-semarnat.jpeg"}
  ],
  survey: {
    eyebrow: 'TU RUTA IMDIIL',
    title: 'Encuentra una ruta de capacitación hecha para ti.',
    detail: 'Son 7 preguntas sencillas, sin nombre ni teléfono. Recibirás una recomendación inmediata con cursos reales del Club VIP.',
    questions: [
  {
    "id": "profile",
    "overline": "SOBRE TI",
    "title": "¿Cuál de estas opciones te describe mejor hoy?",
    "detail": "No hay respuestas correctas: queremos entender desde dónde comienzas.",
    "options": [
      {
        "icon": "🎓",
        "label": "Estoy estudiando",
        "detail": "Me formo en ingeniería, logística o un área afín.",
        "tags": [
          "fundamentos",
          "empleo"
        ]
      },
      {
        "icon": "🔧",
        "label": "Operador o técnico",
        "detail": "Trabajo en piso de planta o en un proceso.",
        "tags": [
          "tecnica",
          "produccion",
          "calidad"
        ]
      },
      {
        "icon": "📋",
        "label": "Supervisor o líder de turno",
        "detail": "Coordino personas, metas y turnos.",
        "tags": [
          "supervision",
          "liderazgo",
          "indicadores",
          "equipos"
        ]
      },
      {
        "icon": "🏭",
        "label": "Ingeniero o analista",
        "detail": "Analizo procesos, calidad, costos o logística.",
        "tags": [
          "procesos",
          "mejora",
          "indicadores",
          "avanzado"
        ]
      },
      {
        "icon": "💼",
        "label": "Gerente o dueño de empresa",
        "detail": "Tomo decisiones de operación y cumplimiento.",
        "tags": [
          "gestion",
          "costos",
          "normatividad",
          "proyectos"
        ]
      },
      {
        "icon": "✨",
        "label": "Busco cambiar de área",
        "detail": "Quiero entrar a la industria o crecer en otra área.",
        "tags": [
          "fundamentos",
          "empleo",
          "logistica"
        ]
      }
    ]
  },
  {
    "id": "experience",
    "overline": "TU EXPERIENCIA",
    "title": "¿Cuánta experiencia tienes en la industria?",
    "detail": "Ajustaremos la ruta a tu punto de partida.",
    "options": [
      {
        "icon": "🌱",
        "label": "Comenzar desde cero",
        "detail": "Aún no trabajo en el sector industrial.",
        "tags": [
          "fundamentos",
          "empleo"
        ]
      },
      {
        "icon": "📈",
        "label": "Menos de 3 años",
        "detail": "Conozco lo básico y quiero consolidarlo.",
        "tags": [
          "fundamentos",
          "tecnica"
        ]
      },
      {
        "icon": "🏗️",
        "label": "De 3 a 10 años",
        "detail": "Tengo práctica y busco el siguiente nivel.",
        "tags": [
          "mejora",
          "supervision",
          "indicadores"
        ]
      },
      {
        "icon": "🏆",
        "label": "Más de 10 años",
        "detail": "Quiero actualizarme y profundizar.",
        "tags": [
          "avanzado",
          "gestion",
          "mejora"
        ]
      }
    ]
  },
  {
    "id": "interest",
    "overline": "TU ÁREA",
    "title": "¿Qué área quieres fortalecer primero?",
    "detail": "Después podrás explorar todas las demás dentro del Club.",
    "options": [
      {
        "icon": "⚙️",
        "label": "Producción y mejora continua",
        "detail": "Lean, Kaizen, Six Sigma y supervisión.",
        "tags": [
          "lean",
          "mejora",
          "produccion",
          "kaizen",
          "six-sigma"
        ]
      },
      {
        "icon": "🔍",
        "label": "Calidad e inspección",
        "detail": "Defectos, inspección y pruebas.",
        "tags": [
          "calidad",
          "inspeccion",
          "defectos"
        ]
      },
      {
        "icon": "🚚",
        "label": "Logística y comercio exterior",
        "detail": "Inventarios, embarques y aduanas.",
        "tags": [
          "logistica",
          "inventarios",
          "comercio-exterior",
          "aduanas"
        ]
      },
      {
        "icon": "🛡️",
        "label": "Seguridad y normatividad",
        "detail": "STPS, COFEPRIS, SEMARNAT y químicos.",
        "tags": [
          "normatividad",
          "seguridad",
          "cumplimiento"
        ]
      },
      {
        "icon": "💰",
        "label": "Costos, compras y proyectos",
        "detail": "Presupuestos, proveedores y gestión.",
        "tags": [
          "costos",
          "compras",
          "proyectos",
          "finanzas"
        ]
      },
      {
        "icon": "🧪",
        "label": "Procesos de manufactura",
        "detail": "Inyección, fundición y materiales.",
        "tags": [
          "manufactura",
          "procesos",
          "plasticos",
          "materiales"
        ]
      }
    ]
  },
  {
    "id": "goal",
    "overline": "TU OBJETIVO",
    "title": "¿Qué quieres lograr con tu capacitación?",
    "detail": "Nos ayuda a priorizar lo que más impacto tendrá.",
    "options": [
      {
        "icon": "🚀",
        "label": "Crecer o conseguir un ascenso",
        "detail": "Prepararme para un puesto de más responsabilidad.",
        "tags": [
          "liderazgo",
          "supervision",
          "gestion"
        ]
      },
      {
        "icon": "🏅",
        "label": "Certificar lo que sé",
        "detail": "Contar con una constancia con folio verificable.",
        "tags": [
          "documentacion",
          "cumplimiento"
        ]
      },
      {
        "icon": "📉",
        "label": "Reducir costos y desperdicios",
        "detail": "Mejorar resultados medibles en planta.",
        "tags": [
          "lean",
          "costos",
          "mejora",
          "desperdicios"
        ]
      },
      {
        "icon": "✅",
        "label": "Cumplir una auditoría o norma",
        "detail": "Estar listo ante STPS, clientes o autoridades.",
        "tags": [
          "normatividad",
          "cumplimiento",
          "calidad"
        ]
      },
      {
        "icon": "💼",
        "label": "Conseguir empleo en la industria",
        "detail": "Tener bases sólidas para entrar al sector.",
        "tags": [
          "fundamentos",
          "empleo"
        ]
      }
    ]
  },
  {
    "id": "need",
    "overline": "TU RETO",
    "title": "¿Qué situación quieres resolver mejor?",
    "detail": "Esto nos ayuda a elegir el enfoque, no solo el tema.",
    "options": [
      {
        "icon": "⏱️",
        "label": "Cumplir metas de producción",
        "detail": "Entregar a tiempo con el equipo que tengo.",
        "tags": [
          "produccion",
          "supervision",
          "indicadores"
        ]
      },
      {
        "icon": "🧩",
        "label": "Encontrar la causa de los problemas",
        "detail": "Dejar de apagar fuegos y corregir de raíz.",
        "tags": [
          "mejora",
          "calidad",
          "six-sigma",
          "defectos"
        ]
      },
      {
        "icon": "🧰",
        "label": "Dominar una técnica o proceso",
        "detail": "Operar y ajustar con seguridad.",
        "tags": [
          "tecnica",
          "procesos",
          "manufactura"
        ]
      },
      {
        "icon": "📑",
        "label": "Ordenar documentos y evidencias",
        "detail": "Formatos, registros y trazabilidad.",
        "tags": [
          "documentacion",
          "cumplimiento",
          "normatividad"
        ]
      },
      {
        "icon": "👥",
        "label": "Liderar a mi equipo",
        "detail": "Comunicar, delegar y dar seguimiento.",
        "tags": [
          "liderazgo",
          "equipos",
          "supervision"
        ]
      },
      {
        "icon": "📊",
        "label": "Controlar costos e indicadores",
        "detail": "Medir, presupuestar y decidir con datos.",
        "tags": [
          "costos",
          "indicadores",
          "finanzas"
        ]
      }
    ]
  },
  {
    "id": "format",
    "overline": "TU FORMA DE APRENDER",
    "title": "¿Cómo aprendes mejor?",
    "detail": "Todas las rutas combinan teoría y práctica; esto ajusta el énfasis.",
    "options": [
      {
        "icon": "🎥",
        "label": "Clases grabadas a mi ritmo",
        "detail": "Avanzo cuando tengo tiempo.",
        "tags": [
          "fundamentos"
        ]
      },
      {
        "icon": "🗣️",
        "label": "Clases en vivo con instructor",
        "detail": "Me gusta preguntar y resolver dudas.",
        "tags": [
          "liderazgo"
        ]
      },
      {
        "icon": "🛠️",
        "label": "Casos y ejercicios prácticos",
        "detail": "Aprendo resolviendo situaciones reales.",
        "tags": [
          "tecnica",
          "mejora"
        ]
      },
      {
        "icon": "📥",
        "label": "Plantillas y herramientas",
        "detail": "Quiero formatos listos para usar en planta.",
        "tags": [
          "documentacion",
          "indicadores"
        ]
      }
    ]
  },
  {
    "id": "time",
    "overline": "TU TIEMPO",
    "title": "¿Cuánto tiempo puedes dedicar por semana?",
    "detail": "Elegiremos cursos que puedas terminar sin presión.",
    "options": [
      {
        "icon": "⚡",
        "label": "Menos de 2 horas",
        "detail": "Prefiero cursos breves y concretos.",
        "tags": [
          "short"
        ]
      },
      {
        "icon": "⏳",
        "label": "De 2 a 5 horas",
        "detail": "Puedo avanzar con constancia.",
        "tags": [
          "short",
          "long"
        ]
      },
      {
        "icon": "📚",
        "label": "Más de 5 horas",
        "detail": "Quiero una ruta completa.",
        "tags": [
          "long",
          "avanzado"
        ]
      }
    ]
  }
]
  }
});
