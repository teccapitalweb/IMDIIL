/* Base editorial de la guía virtual de IMDIIL (ingeniería industrial, calidad, logística y normatividad).
   Respuestas educativas breves; cada concepto sugiere cursos reales del Club VIP. */
window.IMDIIL_GUIDE_KNOWLEDGE = Object.freeze({
  ingenieriaIndustrial: {
    label: 'Ingeniería industrial', aliases: ['ingenieria industrial', 'que es la ingenieria industrial', 'ingeniero industrial'],
    answer: 'La ingeniería industrial diseña, mide y mejora sistemas que combinan personas, máquinas, materiales, información y energía. Su objetivo es que un proceso produzca con la calidad, el costo y el tiempo correctos, usando herramientas como estudio del trabajo, distribución de planta, control de calidad, logística y mejora continua.',
    courses: ['Lean Manufacturing', 'Supervisión de Producción (Nivel Avanzado)', 'Ingeniería de Procesos Lean, Six Sigma']
  },
  lean: {
    label: 'Lean Manufacturing', aliases: ['lean', 'lean manufacturing', 'manufactura esbelta', 'que es lean'],
    answer: 'Lean Manufacturing es una filosofía de producción que busca entregar valor al cliente eliminando todo lo que no lo agrega. Se apoya en el mapeo del flujo de valor, el trabajo estandarizado, 5S, SMED, Kanban y la mejora continua para reducir inventarios, tiempos de espera y defectos.',
    courses: ['Lean Manufacturing', 'Kaizen', 'Ingeniería de Procesos Lean, Six Sigma']
  },
  desperdicios: {
    label: 'Los 8 desperdicios', aliases: ['desperdicios', 'muda', '7 desperdicios', '8 desperdicios', 'mudas'],
    answer: 'En Lean se identifican ocho desperdicios: sobreproducción, esperas, transporte innecesario, sobreprocesamiento, inventario excesivo, movimientos innecesarios, defectos y talento no aprovechado. Reconocerlos en el piso de producción es el primer paso para mejorar la productividad sin invertir en más recursos.',
    courses: ['Lean Manufacturing', 'Kaizen']
  },
  kaizen: {
    label: 'Kaizen', aliases: ['kaizen', 'mejora continua', 'evento kaizen'],
    answer: 'Kaizen significa mejora continua: pequeños cambios constantes realizados por las personas que conocen el proceso. Un evento Kaizen reúne a un equipo durante pocos días para analizar un problema, probar soluciones, estandarizar lo que funciona y dar seguimiento con indicadores.',
    courses: ['Kaizen', 'Lean Manufacturing']
  },
  sixSigma: {
    label: 'Six Sigma y DMAIC', aliases: ['six sigma', 'seis sigma', 'dmaic', 'variacion'],
    answer: 'Six Sigma es una metodología para reducir la variación de un proceso con base en datos. Sigue el ciclo DMAIC: Definir el problema, Medir la situación actual, Analizar las causas, Mejorar con soluciones probadas y Controlar para que el resultado se mantenga.',
    courses: ['Ingeniería de Procesos Lean, Six Sigma', 'Calidad en inspección visual']
  },
  cincoS: {
    label: '5S', aliases: ['5s', 'cinco s', 'orden y limpieza'],
    answer: 'Las 5S son una práctica de orden y disciplina en el área de trabajo: clasificar (seiri), ordenar (seiton), limpiar (seiso), estandarizar (seiketsu) y mantener la disciplina (shitsuke). Facilitan encontrar herramientas, detectar anomalías y trabajar con seguridad.',
    courses: ['Lean Manufacturing', 'Kaizen']
  },
  oee: {
    label: 'OEE', aliases: ['oee', 'eficiencia global del equipo', 'eficiencia de equipo'],
    answer: 'El OEE (eficiencia global del equipo) mide qué tanto del tiempo planeado una máquina produce piezas buenas a la velocidad ideal. Se calcula multiplicando disponibilidad × rendimiento × calidad; ayuda a ubicar si las pérdidas vienen de paros, de baja velocidad o de defectos.',
    courses: ['Supervisión de Producción (Nivel Avanzado)', 'Lean Manufacturing']
  },
  causaRaiz: {
    label: 'Análisis de causa raíz', aliases: ['causa raiz', 'ishikawa', '5 porques', 'cinco porques', 'diagrama de pescado'],
    answer: 'El análisis de causa raíz busca el origen de un problema en lugar de corregir solo el síntoma. Herramientas comunes son el diagrama de Ishikawa (mano de obra, método, máquina, material, medición y medio ambiente) y los 5 porqués, siempre confirmando cada causa con evidencia.',
    courses: ['Ingeniería de Procesos Lean, Six Sigma', 'Calidad en inspección visual']
  },
  inspeccion: {
    label: 'Inspección de calidad', aliases: ['inspeccion', 'inspeccion visual', 'control de calidad', 'defectos'],
    answer: 'La inspección de calidad compara un producto contra criterios definidos (dimensiones, apariencia, funcionamiento) para aceptar, rechazar o retrabajar. Funciona mejor con estándares visuales claros, buena iluminación, registros trazables y retroalimentación al proceso que generó el defecto.',
    courses: ['Calidad en inspección visual', 'Pruebas No Destructivas Avanzadas']
  },
  pnd: {
    label: 'Pruebas no destructivas', aliases: ['pruebas no destructivas', 'pnd', 'end', 'ultrasonido industrial', 'liquidos penetrantes'],
    answer: 'Las pruebas no destructivas evalúan materiales y componentes sin dañarlos: inspección visual, líquidos penetrantes, partículas magnéticas, ultrasonido y radiografía, entre otras. Se usan para detectar grietas, porosidades o falta de fusión en soldaduras, fundiciones y piezas críticas.',
    courses: ['Pruebas No Destructivas Avanzadas', 'Fundición a presión']
  },
  inventarios: {
    label: 'Control de inventarios', aliases: ['inventarios', 'control de inventarios', 'abc', 'punto de reorden', 'stock'],
    answer: 'El control de inventarios equilibra tener material suficiente sin inmovilizar dinero de más. Se apoya en clasificaciones ABC, punto de reorden, inventario de seguridad, conteos cíclicos y rotación (PEPS/FIFO) para evitar faltantes, obsolescencia y diferencias entre el sistema y el almacén.',
    courses: ['Logística y control de inventarios', 'Analista de compras']
  },
  incoterms: {
    label: 'Incoterms', aliases: ['incoterms', 'incoterm', 'exw', 'fob', 'ddp'],
    answer: 'Los Incoterms son reglas internacionales que definen qué parte de una compraventa asume costos, riesgos y trámites en el traslado de mercancías: desde EXW (el comprador se encarga de casi todo) hasta DDP (el vendedor entrega con impuestos pagados). Elegir el correcto evita sorpresas en fletes, seguros y aduanas.',
    courses: ['Logística internacional y cruces fronterizos', 'Clasificación de mercancías']
  },
  fraccion: {
    label: 'Clasificación arancelaria', aliases: ['fraccion arancelaria', 'clasificacion arancelaria', 'tigie', 'clasificacion de mercancias'],
    answer: 'Clasificar una mercancía es asignarle su fracción arancelaria según su naturaleza, composición y uso. De esa fracción dependen los impuestos, permisos y regulaciones no arancelarias aplicables, por lo que un error puede provocar multas o retrasos en la aduana.',
    courses: ['Clasificación de mercancías', 'Logística internacional y cruces fronterizos']
  },
  stps: {
    label: 'Capacitación STPS y SIRCE', aliases: ['stps', 'sirce', 'dc-3', 'dc3', 'constancia de habilidades', 'comision mixta de capacitacion'],
    answer: 'En México las empresas deben capacitar a su personal y conservar evidencia. El SIRCE es el sistema de la STPS donde se registran listas de constancias de competencias (DC-3), planes y programas. Llevarlo en orden ayuda a cumplir en inspecciones y a demostrar la formación de cada trabajador.',
    courses: ['Capacitación ante la STPS y uso de la SIRCE']
  },
  quimicos: {
    label: 'Manejo de sustancias químicas', aliases: ['sustancias quimicas', 'hds', 'hoja de seguridad', 'sga', 'nom-018', 'quimicos'],
    answer: 'El manejo seguro de sustancias químicas parte de identificar sus peligros con la hoja de datos de seguridad (HDS) y el etiquetado conforme al SGA. Incluye almacenamiento por compatibilidad, equipo de protección, control de derrames y capacitación del personal que las usa.',
    courses: ['Manejo seguro de sustancias químicas', 'Enfermería industrial']
  },
  cofepris: {
    label: 'COFEPRIS', aliases: ['cofepris', 'regulacion sanitaria', 'buenas practicas de fabricacion', 'aviso de funcionamiento'],
    answer: 'COFEPRIS es la autoridad sanitaria federal en México. Regula establecimientos y productos como alimentos, medicamentos, dispositivos y cosméticos mediante avisos, licencias, permisos y normas de buenas prácticas, y realiza verificaciones para comprobar su cumplimiento.',
    courses: ['Regulación sanitaria y normatividad COFEPRIS']
  },
  semarnat: {
    label: 'Trámites ambientales', aliases: ['semarnat', 'tramites ambientales', 'licencia ambiental', 'residuos peligrosos', 'cedula de operacion anual'],
    answer: 'Las empresas industriales pueden requerir trámites ambientales ante SEMARNAT, como el registro de generador de residuos peligrosos, la licencia ambiental única o la cédula de operación anual. Mantenerlos vigentes evita sanciones y documenta el manejo responsable de emisiones y residuos.',
    courses: ['Trámites ambientales ante SEMARNAT']
  },
  inyeccion: {
    label: 'Moldeo por inyección', aliases: ['moldeo por inyeccion', 'inyeccion de plastico', 'rechupe', 'rebaba'],
    answer: 'En el moldeo por inyección el plástico se funde y se inyecta a presión en un molde, donde se enfría y toma forma. La calidad depende de la temperatura, presión, velocidad y tiempos de sostenimiento y enfriamiento; defectos como rechupes, rebabas o piezas incompletas indican qué parámetro ajustar.',
    courses: ['Moldeo por inyección de plástico', 'Calidad en inspección visual']
  },
  costos: {
    label: 'Costos de producción', aliases: ['costos', 'costo de produccion', 'costeo', 'presupuesto', 'punto de equilibrio'],
    answer: 'El costo de producción suma materia prima, mano de obra directa y gastos indirectos de fabricación. Planear y controlar costos implica presupuestar, comparar lo real contra lo planeado, analizar variaciones y usar esa información para decidir precios, inversiones y mejoras.',
    courses: ['Planificación y control de costos', 'Controller Jr']
  },
  proyectos: {
    label: 'Gestión de proyectos', aliases: ['project management', 'gestion de proyectos', 'ruta critica', 'gantt', 'cronograma'],
    answer: 'La gestión de proyectos organiza alcance, tiempo, costo, riesgos y personas para lograr un objetivo único. Usa herramientas como la estructura de desglose del trabajo, el diagrama de Gantt y la ruta crítica para planear, dar seguimiento y cerrar con lecciones aprendidas.',
    courses: ['Project management', 'Planificación y control de costos']
  },
  supervision: {
    label: 'Supervisión de producción', aliases: ['supervision', 'supervisor de produccion', 'lider de turno', 'jefe de linea'],
    answer: 'El supervisor de producción conecta las metas de la planta con el trabajo de cada turno: planea la carga, asigna personas, vigila seguridad y calidad, mide indicadores y resuelve desviaciones. Su efectividad depende tanto de los datos como del liderazgo y la comunicación con su equipo.',
    courses: ['Supervisión de Producción (Nivel Avanzado)', 'Kaizen']
  }
});
