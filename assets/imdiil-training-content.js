// ═══════════════════════════════════════════════════════════════════
// IMDIIL · Entrenamiento · contenido (casos prácticos y flashcards)
// Ingeniería industrial aplicada: Lean, OEE, calidad, mantenimiento,
// tiempos y movimientos, seguridad (NOM-STPS) y logística.
// Los ids son estables: el avance de cada usuario se guarda por id.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  const cases = [
    {
      id: 'oee-envasado', area: 'OEE', difficulty: 'Fundamental', duration: '6 min',
      title: 'OEE bajo en la línea de envasado',
      scenario: 'Turno de 480 min con 30 min de paros planeados (comida y junta). Hubo 45 min de paros no planeados. El ciclo ideal es 1 pieza/min; se produjeron 360 piezas y 18 salieron defectuosas.',
      objective: 'Calcular correctamente los tres factores del OEE y saber dónde atacar primero.',
      steps: [
        { prompt: '¿Cuál es la disponibilidad del turno?', options: ['84.4 %', '90 %', '93.8 %', '100 %'], correct: 1, explanation: 'Tiempo planeado = 480 − 30 = 450 min. Tiempo operando = 450 − 45 = 405 min. Disponibilidad = 405 / 450 = 90 %. Los paros planeados no se cuentan como pérdida.' },
        { prompt: 'Con 360 piezas en 405 min operando y ciclo ideal de 1 min, ¿cuál es el rendimiento?', options: ['75 %', '80 %', '88.9 %', '95 %'], correct: 2, explanation: 'Rendimiento = (ciclo ideal × piezas) / tiempo operando = (1 × 360) / 405 = 88.9 %. Refleja microparos y velocidad reducida.' },
        { prompt: 'Con calidad de 342/360 = 95 %, ¿cuál es el OEE y qué factor conviene atacar primero?', options: ['76 %; la disponibilidad (90 %) y el rendimiento (88.9 %) son las mayores pérdidas', '95 %; solo la calidad', '85 %; ya es clase mundial', '68 %; la calidad es la peor'], correct: 0, explanation: 'OEE = 0.90 × 0.889 × 0.95 ≈ 76 %. La referencia de clase mundial suele citarse en 85 %. Las mayores pérdidas están en paros (10 %) y velocidad (11 %), no en calidad (5 %).' }
      ]
    },
    {
      id: 'takt-cuello-botella', area: 'Lean', difficulty: 'Intermedio', duration: '7 min',
      title: 'Takt time y cuello de botella',
      scenario: 'El cliente pide 900 piezas por turno. El tiempo disponible es de 450 min. La línea tiene 4 estaciones con tiempos de ciclo de 25 s, 32 s, 28 s y 22 s.',
      objective: 'Comparar la capacidad de la línea contra la demanda y decidir cómo balancear.',
      steps: [
        { prompt: '¿Cuál es el takt time?', options: ['20 s', '30 s', '45 s', '60 s'], correct: 1, explanation: 'Takt = tiempo disponible / demanda = (450 × 60 s) / 900 = 27 000 / 900 = 30 s por pieza.' },
        { prompt: '¿Qué estación limita la línea?', options: ['La de 25 s', 'La de 32 s', 'La de 28 s', 'La de 22 s'], correct: 1, explanation: 'La estación de 32 s supera el takt de 30 s: es el cuello de botella y fija la salida máxima en una pieza cada 32 s.' },
        { prompt: '¿Cuál es la mejor primera acción?', options: ['Acelerar todas las estaciones', 'Redistribuir elementos de trabajo de la estación de 32 s hacia la de 22 s y eliminar desperdicio en ella', 'Pedir tiempo extra todos los días', 'Aumentar inventario entre estaciones'], correct: 1, explanation: 'Balancear el contenido de trabajo y eliminar desperdicio en el cuello de botella sube la salida sin costo extra. El tiempo extra o el inventario solo esconden el problema.' }
      ]
    },
    {
      id: 'smed-cambio-formato', area: 'Lean', difficulty: 'Intermedio', duration: '6 min',
      title: 'Cambio de formato de 90 minutos',
      scenario: 'Cada cambio de molde en una inyectora tarda 90 min. Durante el cambio, el técnico va al almacén por herramientas, busca el molde siguiente y ajusta parámetros a prueba y error.',
      objective: 'Reducir el tiempo de cambio aplicando SMED.',
      steps: [
        { prompt: '¿Cuál es el primer paso de SMED?', options: ['Comprar una máquina más rápida', 'Grabar y separar actividades internas (máquina parada) de externas (máquina operando)', 'Cambiar de técnico', 'Hacer menos cambios y lotes más grandes'], correct: 1, explanation: 'SMED inicia observando el cambio y separando lo que exige la máquina detenida de lo que puede hacerse con la máquina operando.' },
        { prompt: 'Buscar herramientas y traer el molde, ¿qué tipo de actividad debe ser?', options: ['Interna', 'Externa: prepararse antes de detener la máquina', 'Opcional', 'Del turno siguiente'], correct: 1, explanation: 'Preparar molde, herramientas y materiales es trabajo externo; hacerlo con la máquina parada es desperdicio puro.' },
        { prompt: '¿Cómo se reduce el ajuste a prueba y error?', options: ['Con más experiencia del técnico', 'Estandarizando parámetros, usando topes, guías y sujeciones rápidas', 'Aumentando la presión', 'Aceptando las primeras piezas defectuosas'], correct: 1, explanation: 'Los ajustes se eliminan con parámetros documentados, referencias fijas y sujeciones rápidas, de modo que la primera pieza salga buena.' }
      ]
    },
    {
      id: 'capacidad-cpk', area: 'Calidad', difficulty: 'Avanzado', duration: '8 min',
      title: 'Cpk bajo en un diámetro crítico',
      scenario: 'Especificación de un diámetro: 10.00 ± 0.10 mm. El proceso es estable, con media de 10.03 mm y desviación estándar de 0.02 mm.',
      objective: 'Interpretar Cp y Cpk para decidir la acción correcta.',
      steps: [
        { prompt: '¿Cuál es el Cp?', options: ['0.83', '1.17', '1.67', '2.17'], correct: 2, explanation: 'Cp = (LSE − LIE) / 6σ = (10.10 − 9.90) / (6 × 0.02) = 0.20 / 0.12 = 1.67.' },
        { prompt: '¿Cuál es el Cpk?', options: ['1.17', '1.67', '2.17', '0.50'], correct: 0, explanation: 'Cpk = mín[(10.10 − 10.03)/0.06 ; (10.03 − 9.90)/0.06] = mín[1.17 ; 2.17] = 1.17.' },
        { prompt: 'Cp alto y Cpk menor, ¿qué indica y qué hacer?', options: ['El proceso tiene demasiada variación; cambiar la máquina', 'El proceso está descentrado; ajustar la media hacia 10.00 mm', 'El proceso está fuera de control', 'La especificación está mal'], correct: 1, explanation: 'Si Cp > Cpk, la dispersión es aceptable pero la media está corrida. Centrar el proceso elevaría el Cpk hacia 1.67.' }
      ]
    },
    {
      id: 'reclamo-cliente-8d', area: 'Calidad', difficulty: 'Intermedio', duration: '7 min',
      title: 'Reclamo del cliente por piezas sin barreno',
      scenario: 'Un cliente automotriz detectó 40 piezas sin un barreno en un lote de 5 000. Exige respuesta en 24 horas.',
      objective: 'Responder con método 8D: contener, encontrar causa raíz y evitar recurrencia.',
      steps: [
        { prompt: '¿Qué va primero?', options: ['Buscar al culpable', 'Contención: seleccionar al 100 % el material en cliente, tránsito y planta', 'Cambiar al proveedor', 'Esperar el análisis completo'], correct: 1, explanation: 'La contención protege al cliente de inmediato: se aísla y selecciona todo el material sospechoso en todas sus ubicaciones.' },
        { prompt: '¿Qué herramienta ayuda a llegar a la causa raíz?', options: ['Una lluvia de ideas sin datos', 'Diagrama de Ishikawa (6M) y 5 porqués, verificando cada causa con evidencia', 'Repetir la inspección', 'Una encuesta al personal'], correct: 1, explanation: 'Ishikawa ordena causas posibles (máquina, método, mano de obra, material, medición y medio ambiente) y los 5 porqués profundizan hasta una causa verificable.' },
        { prompt: 'Se encontró que la broca se rompe sin que nadie lo note. ¿Qué acción evita que vuelva a ocurrir?', options: ['Pedir más atención al operador', 'Instalar un poka-yoke: sensor de presencia del barreno o detección de broca rota que detenga la máquina', 'Inspeccionar una pieza por hora', 'Agregar una nota en el manual'], correct: 1, explanation: 'Un poka-yoke detecta el error en la fuente y evita que la pieza avance; depender de la atención humana no elimina la recurrencia.' }
      ]
    },
    {
      id: 'falla-repetitiva-bomba', area: 'Mantenimiento', difficulty: 'Intermedio', duration: '7 min',
      title: 'Bomba que falla cada mes',
      scenario: 'Una bomba de proceso operó 600 h en el trimestre y tuvo 4 fallas por rodamiento; las reparaciones sumaron 12 h. Siempre se cambia el rodamiento y se vuelve a arrancar.',
      objective: 'Medir confiabilidad y pasar de correctivo a una solución de fondo.',
      steps: [
        { prompt: '¿Cuál es el MTBF?', options: ['50 h', '150 h', '200 h', '600 h'], correct: 1, explanation: 'MTBF = tiempo de operación / número de fallas = 600 / 4 = 150 h.' },
        { prompt: 'Con MTTR = 12 h / 4 = 3 h, ¿cuál es la disponibilidad inherente?', options: ['80 %', '95 %', '98 %', '99.9 %'], correct: 2, explanation: 'Disponibilidad = MTBF / (MTBF + MTTR) = 150 / 153 ≈ 98 %.' },
        { prompt: '¿Qué acción ataca la causa y no solo el síntoma?', options: ['Tener más rodamientos en stock', 'Análisis de causa raíz (desalineación, lubricación, montaje) y monitoreo de vibraciones como mantenimiento predictivo', 'Cambiar el rodamiento cada semana', 'Operar la bomba a menor carga sin analizar'], correct: 1, explanation: 'Fallas repetidas indican una causa no resuelta. El análisis de causa raíz y el monitoreo predictivo de vibraciones permiten corregirla y anticipar la falla.' }
      ]
    },
    {
      id: 'loto-maquina-energizada', area: 'Seguridad', difficulty: 'Fundamental', duration: '6 min',
      title: 'Atasco en una prensa en operación',
      scenario: 'Un operador quiere retirar una pieza atascada metiendo la mano en la zona de la prensa "porque solo tarda un segundo". La prensa tiene energía eléctrica y neumática.',
      objective: 'Aplicar bloqueo y etiquetado de energías antes de intervenir.',
      steps: [
        { prompt: '¿Qué debe hacerse antes de intervenir?', options: ['Apagar con el botón de paro y meter la mano', 'Aplicar el procedimiento de bloqueo y etiquetado de todas las fuentes de energía', 'Pedir a un compañero que vigile el botón', 'Usar guantes gruesos'], correct: 1, explanation: 'La NOM-004-STPS exige procedimientos para que la maquinaria no se active de forma inesperada durante ajustes o mantenimiento: se aíslan, bloquean y etiquetan las energías.' },
        { prompt: 'Tras bloquear la energía eléctrica, ¿qué falta?', options: ['Nada', 'Liberar la energía residual (aire comprimido, resortes, gravedad) y verificar energía cero intentando arrancar', 'Quitar la etiqueta', 'Avisar al día siguiente'], correct: 1, explanation: 'La energía almacenada puede mover la máquina aun sin electricidad. Se libera y se verifica energía cero antes de intervenir.' },
        { prompt: 'En la jerarquía de controles, ¿qué solución es más efectiva a largo plazo?', options: ['Más EPP', 'Un control de ingeniería: guarda con interlock o sistema que expulse la pieza sin intervención manual', 'Un letrero de precaución', 'Capacitar una vez al año'], correct: 1, explanation: 'Eliminación, sustitución y controles de ingeniería están por encima de los controles administrativos y del EPP.' }
      ]
    },
    {
      id: 'estudio-tiempos-valoracion', area: 'Tiempos y movimientos', difficulty: 'Intermedio', duration: '7 min',
      title: 'Estudio de tiempos con un operador rápido',
      scenario: 'Se cronometró una operación con un tiempo observado promedio de 2.0 min. El analista valoró el ritmo del operador en 110 %. Los suplementos acordados son 15 %.',
      objective: 'Calcular el tiempo estándar correcto para planear producción.',
      steps: [
        { prompt: '¿Cuál es el tiempo normal?', options: ['1.82 min', '2.0 min', '2.2 min', '2.3 min'], correct: 2, explanation: 'Tiempo normal = tiempo observado × valoración = 2.0 × 1.10 = 2.2 min. Ajusta al ritmo de un operador calificado trabajando a ritmo normal.' },
        { prompt: '¿Cuál es el tiempo estándar?', options: ['2.30 min', '2.53 min', '2.65 min', '2.20 min'], correct: 1, explanation: 'Tiempo estándar = tiempo normal × (1 + suplementos) = 2.2 × 1.15 = 2.53 min.' },
        { prompt: '¿Cuántas piezas estándar por hora corresponden?', options: ['20', '23.7', '27.3', '30'], correct: 1, explanation: '60 / 2.53 ≈ 23.7 piezas por hora. Planear con el tiempo observado sin valoración ni suplementos sobreestimaría la capacidad.' }
      ]
    },
    {
      id: 'reorden-componente-critico', area: 'Logística', difficulty: 'Intermedio', duration: '6 min',
      title: 'Faltante de un componente crítico',
      scenario: 'Un componente se consume a 40 piezas por día, el proveedor tarda 7 días en surtir y se decidió un stock de seguridad de 60 piezas. La línea se detuvo dos veces este mes por faltante.',
      objective: 'Definir el punto de reorden y una política que evite paros.',
      steps: [
        { prompt: '¿Cuál es el punto de reorden?', options: ['280 piezas', '300 piezas', '340 piezas', '400 piezas'], correct: 2, explanation: 'Punto de reorden = demanda diaria × tiempo de entrega + stock de seguridad = 40 × 7 + 60 = 340 piezas.' },
        { prompt: 'Si la demanda anual es 12 000 piezas, el costo por pedido $500 y el costo anual de mantener una pieza $30, ¿cuál es el lote económico (EOQ)?', options: ['≈ 400', '≈ 632', '≈ 1 000', '≈ 2 000'], correct: 1, explanation: 'EOQ = √(2DS/H) = √(2 × 12 000 × 500 / 30) = √400 000 ≈ 632 piezas.' },
        { prompt: '¿Qué complementa mejor la política para este componente crítico?', options: ['Pedir solo cuando se acabe', 'Clasificarlo como A, revisar su inventario con más frecuencia y desarrollar un segundo proveedor', 'Tener 10 veces el inventario', 'Eliminar el stock de seguridad'], correct: 1, explanation: 'Los artículos críticos o de alto valor (clase A) requieren control estrecho; un proveedor alterno reduce el riesgo de suministro.' }
      ]
    },
    {
      id: 'almacen-errores-picking', area: 'Logística', difficulty: 'Fundamental', duration: '6 min',
      title: 'Errores de surtido en el almacén',
      scenario: 'El almacén tiene 4 % de errores de picking, pasillos con material sin ubicar y productos con caducidad que salen fuera de orden. Los surtidores caminan mucho para los artículos de mayor rotación.',
      objective: 'Ordenar el almacén y reducir errores y recorridos.',
      steps: [
        { prompt: '¿Por dónde empezar?', options: ['Contratar más surtidores', 'Aplicar 5S: clasificar, ordenar con ubicaciones identificadas, limpiar, estandarizar y sostener', 'Comprar un montacargas', 'Hacer inventario cada mes'], correct: 1, explanation: '5S crea la base visual y de orden: cada artículo tiene una ubicación identificada y se elimina lo innecesario.' },
        { prompt: '¿Dónde deben ubicarse los artículos de mayor rotación?', options: ['Al fondo', 'Cerca de la zona de embarque y a la altura más cómoda (clasificación ABC por rotación)', 'En el nivel más alto del rack', 'Al azar'], correct: 1, explanation: 'Ubicar por rotación (slotting ABC) reduce los recorridos: lo que más se mueve queda más cerca y más accesible.' },
        { prompt: 'Para productos con caducidad, ¿qué criterio de salida aplica?', options: ['LIFO', 'FEFO: primero en caducar, primero en salir', 'El más cercano', 'El de mayor precio'], correct: 1, explanation: 'FEFO prioriza la fecha de caducidad; FIFO prioriza la fecha de entrada. Para perecederos se usa FEFO.' }
      ]
    }
  ];

  const cards = [
    // Lean
    { id: 'lean-5s', area: 'Lean', front: '5S', back: 'Seiri (clasificar), Seiton (ordenar), Seiso (limpiar), Seiketsu (estandarizar) y Shitsuke (disciplina). Base del orden visual en planta.' },
    { id: 'lean-muda', area: 'Lean', front: '8 desperdicios (muda)', back: 'Transporte, inventario, movimiento, espera, sobreproducción, sobreprocesamiento, defectos y talento no aprovechado.' },
    { id: 'lean-takt', area: 'Lean', front: 'Takt time', back: 'Ritmo de la demanda: tiempo disponible ÷ demanda del cliente. Marca cada cuánto debe salir una pieza.' },
    { id: 'lean-kanban', area: 'Lean', front: 'Kanban', back: 'Señal visual que autoriza producir o mover material solo cuando el proceso siguiente lo consume (sistema jalar).' },
    { id: 'lean-smed', area: 'Lean', front: 'SMED', back: 'Método para reducir cambios de formato: separar actividades internas y externas, convertir internas en externas y simplificar ajustes.' },
    { id: 'lean-poka-yoke', area: 'Lean', front: 'Poka-yoke', back: 'Dispositivo a prueba de errores que impide o detecta un error en la fuente antes de que se convierta en defecto.' },
    { id: 'lean-vsm', area: 'Lean', front: 'VSM (mapa de flujo de valor)', back: 'Diagrama del flujo de material e información de punta a punta; muestra tiempos de ciclo, inventarios y lead time para detectar desperdicio.' },
    { id: 'lean-kaizen', area: 'Lean', front: 'Kaizen', back: 'Mejora continua en pasos pequeños con participación de quienes hacen el trabajo, medida antes y después.' },
    { id: 'lean-jidoka', area: 'Lean', front: 'Jidoka', back: 'Automatización con toque humano: la máquina o el operador detienen el proceso al detectar una anomalía para no pasar defectos.' },
    { id: 'lean-heijunka', area: 'Lean', front: 'Heijunka', back: 'Nivelación de la producción en volumen y mezcla para evitar picos y aprovechar mejor la capacidad.' },
    // OEE
    { id: 'oee-formula', area: 'OEE', front: 'Fórmula del OEE', back: 'OEE = Disponibilidad × Rendimiento × Calidad. Se suele citar 85 % como referencia de clase mundial.' },
    { id: 'oee-disponibilidad', area: 'OEE', front: 'Disponibilidad (OEE)', back: 'Tiempo operando ÷ tiempo planeado de producción. Pierde por paros no planeados, fallas y cambios de formato.' },
    { id: 'oee-rendimiento', area: 'OEE', front: 'Rendimiento (OEE)', back: '(Ciclo ideal × piezas producidas) ÷ tiempo operando. Pierde por microparos y velocidad reducida.' },
    { id: 'oee-calidad', area: 'OEE', front: 'Calidad (OEE)', back: 'Piezas buenas a la primera ÷ piezas totales. Pierde por scrap y retrabajo.' },
    { id: 'oee-6-perdidas', area: 'OEE', front: 'Seis grandes pérdidas', back: 'Fallas, preparación y ajustes, microparos, velocidad reducida, defectos de proceso y pérdidas de arranque.' },
    { id: 'oee-teep', area: 'OEE', front: 'TEEP', back: 'OEE × utilización: mide el desempeño sobre el tiempo calendario total (24/7), útil para decidir capacidad.' },
    // Calidad
    { id: 'cal-ishikawa', area: 'Calidad', front: 'Diagrama de Ishikawa (6M)', back: 'Organiza causas posibles en máquina, método, mano de obra, material, medición y medio ambiente.' },
    { id: 'cal-pareto', area: 'Calidad', front: 'Principio de Pareto', back: 'Pocas causas generan la mayor parte del efecto (aprox. 80/20). Sirve para priorizar qué atacar primero.' },
    { id: 'cal-5-porques', area: 'Calidad', front: '5 porqués', back: 'Preguntar "¿por qué?" de forma sucesiva hasta llegar a una causa raíz verificable y accionable.' },
    { id: 'cal-cp-cpk', area: 'Calidad', front: 'Cp y Cpk', back: 'Cp = (LSE − LIE) ÷ 6σ mide la dispersión contra la tolerancia. Cpk considera además el centrado; Cpk ≥ 1.33 es un mínimo común.' },
    { id: 'cal-carta-control', area: 'Calidad', front: 'Carta de control', back: 'Gráfica con límites estadísticos (±3σ) que distingue variación común de causas especiales a lo largo del tiempo.' },
    { id: 'cal-amef', area: 'Calidad', front: 'AMEF', back: 'Análisis de modos y efectos de falla. Prioriza riesgos con severidad, ocurrencia y detección (NPR = S × O × D) o con tablas de prioridad de acción.' },
    { id: 'cal-8d', area: 'Calidad', front: 'Método 8D', back: 'Ocho disciplinas para resolver problemas: equipo, descripción, contención, causa raíz, acciones correctivas, validación, prevención y reconocimiento.' },
    { id: 'cal-aql', area: 'Calidad', front: 'AQL', back: 'Nivel de calidad aceptable en un muestreo: el porcentaje máximo de defectos considerado aceptable como promedio del proceso.' },
    // Mantenimiento
    { id: 'mtto-mtbf', area: 'Mantenimiento', front: 'MTBF', back: 'Tiempo medio entre fallas = tiempo de operación ÷ número de fallas. Indica confiabilidad.' },
    { id: 'mtto-mttr', area: 'Mantenimiento', front: 'MTTR', back: 'Tiempo medio de reparación = tiempo total de reparación ÷ número de reparaciones. Indica mantenibilidad.' },
    { id: 'mtto-disponibilidad', area: 'Mantenimiento', front: 'Disponibilidad inherente', back: 'MTBF ÷ (MTBF + MTTR). Sube aumentando la confiabilidad o reparando más rápido.' },
    { id: 'mtto-tpm', area: 'Mantenimiento', front: 'TPM', back: 'Mantenimiento productivo total: involucra a todos, con pilares como mantenimiento autónomo, planeado, mejora enfocada, calidad y capacitación.' },
    { id: 'mtto-predictivo', area: 'Mantenimiento', front: 'Mantenimiento predictivo', back: 'Interviene según la condición real del equipo medida con vibraciones, termografía, ultrasonido o análisis de aceite.' },
    { id: 'mtto-autonomo', area: 'Mantenimiento', front: 'Mantenimiento autónomo', back: 'El operador limpia, inspecciona, lubrica y detecta anomalías en su equipo con estándares sencillos.' },
    { id: 'mtto-criticidad', area: 'Mantenimiento', front: 'Análisis de criticidad', back: 'Clasifica los activos por el impacto de su falla en seguridad, producción, calidad y costo para priorizar recursos.' },
    // Tiempos y movimientos
    { id: 'tym-tiempo-normal', area: 'Tiempos y movimientos', front: 'Tiempo normal', back: 'Tiempo observado × factor de valoración del ritmo del operador.' },
    { id: 'tym-tiempo-estandar', area: 'Tiempos y movimientos', front: 'Tiempo estándar', back: 'Tiempo normal × (1 + suplementos). Incluye necesidades personales, fatiga y demoras inevitables.' },
    { id: 'tym-valoracion', area: 'Tiempos y movimientos', front: 'Valoración del ritmo', back: 'Comparación del ritmo observado contra un ritmo normal (100 %). Por ejemplo, sistema Westinghouse: habilidad, esfuerzo, condiciones y consistencia.' },
    { id: 'tym-muestreo', area: 'Tiempos y movimientos', front: 'Muestreo del trabajo', back: 'Observaciones aleatorias para estimar el porcentaje del tiempo dedicado a cada actividad o a demoras.' },
    { id: 'tym-balanceo', area: 'Tiempos y movimientos', front: 'Eficiencia de balanceo', back: 'Suma de tiempos de tarea ÷ (número de estaciones × tiempo de ciclo). Cuanto más cerca de 100 %, menos tiempo ocioso.' },
    { id: 'tym-therbligs', area: 'Tiempos y movimientos', front: 'Therbligs', back: 'Movimientos elementales definidos por Gilbreth (buscar, seleccionar, tomar, transportar, posicionar…) para analizar y simplificar el método.' },
    { id: 'tym-mtm', area: 'Tiempos y movimientos', front: 'MTM', back: 'Sistema de tiempos predeterminados: asigna tiempos estándar a movimientos básicos sin cronometrar.' },
    // Seguridad
    { id: 'seg-jerarquia', area: 'Seguridad', front: 'Jerarquía de controles', back: 'Eliminación, sustitución, controles de ingeniería, controles administrativos y, al final, equipo de protección personal.' },
    { id: 'seg-nom-004', area: 'Seguridad', front: 'NOM-004-STPS', back: 'Sistemas de protección y dispositivos de seguridad en maquinaria y equipo, incluyendo procedimientos para evitar arranques inesperados.' },
    { id: 'seg-nom-017', area: 'Seguridad', front: 'NOM-017-STPS', back: 'Equipo de protección personal: selección, uso y manejo según los riesgos del puesto.' },
    { id: 'seg-nom-035', area: 'Seguridad', front: 'NOM-035-STPS', back: 'Factores de riesgo psicosocial en el trabajo: identificación, análisis y prevención, además de promover un entorno organizacional favorable.' },
    { id: 'seg-nom-030', area: 'Seguridad', front: 'NOM-030-STPS', back: 'Servicios preventivos de seguridad y salud en el trabajo: diagnóstico, programa y responsable de su seguimiento.' },
    { id: 'seg-nom-019', area: 'Seguridad', front: 'NOM-019-STPS', back: 'Constitución, integración y funcionamiento de las comisiones de seguridad e higiene, con recorridos de verificación.' },
    { id: 'seg-loto', area: 'Seguridad', front: 'Bloqueo y etiquetado (LOTO)', back: 'Aislar, bloquear, etiquetar, liberar energía residual y verificar energía cero antes de intervenir un equipo.' },
    // Logística
    { id: 'log-abc', area: 'Logística', front: 'Clasificación ABC', back: 'Agrupa artículos por valor o rotación: A (pocos, alto impacto, control estrecho), B intermedios y C (muchos, bajo impacto).' },
    { id: 'log-eoq', area: 'Logística', front: 'Lote económico (EOQ)', back: 'EOQ = √(2DS/H): equilibra el costo de pedir (S) con el costo de mantener inventario (H) para una demanda anual D.' },
    { id: 'log-reorden', area: 'Logística', front: 'Punto de reorden', back: 'Demanda diaria × tiempo de entrega + stock de seguridad. Al llegar a ese nivel se coloca el pedido.' },
    { id: 'log-fefo', area: 'Logística', front: 'FIFO vs FEFO', back: 'FIFO: sale primero lo que entró primero. FEFO: sale primero lo que caduca primero (perecederos).' },
    { id: 'log-cross-docking', area: 'Logística', front: 'Cross-docking', back: 'La mercancía que llega se transfiere directamente a embarque con almacenamiento mínimo o nulo.' },
    { id: 'log-otif', area: 'Logística', front: 'OTIF', back: 'On Time In Full: porcentaje de pedidos entregados a tiempo y completos. Indicador clave de nivel de servicio.' },
    { id: 'log-rotacion', area: 'Logística', front: 'Rotación de inventario', back: 'Costo de ventas ÷ inventario promedio. Indica cuántas veces se renueva el inventario en el periodo.' }
  ];

  const levels = [
    { name: 'Practicante industrial', start: 0, next: 120 },
    { name: 'Analista de procesos', start: 120, next: 320 },
    { name: 'Ingeniero de mejora', start: 320, next: 680 },
    { name: 'Líder Lean', start: 680, next: 1150 },
    { name: 'Gerente de excelencia operativa', start: 1150, next: 1150 }
  ];

  window.IMDIIL_TRAINING_CONTENT = Object.freeze({ cases, cards, levels });
}());
