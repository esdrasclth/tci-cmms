# -*- coding: utf-8 -*-
"""
Contenido del informe final del proyecto (apartados 1 a 14).

Esta separado del generador a proposito: el mismo contenido se compone en PDF
(reportlab) y en Word (python-docx), y tenerlo una sola vez evita que las dos
salidas se separen. El generador no decide que dice el informe; solo como se ve.

Cada bloque es una tupla ("tipo", ...). Los tipos estan documentados en
`generar_documento.py`, que es quien los sabe dibujar.

Las cifras del apartado 10 y los backlogs del apartado 6 no se escriben a mano:
salen de `datos_proyecto.py`, que los lee del tablero de Plane exportado y del
propio repositorio.
"""
from datos_proyecto import (BACKLOG, CARGA, FECHA_CORTE, INDICADORES,
                            MODULOS, PERIODOS, POR_SPRINT, RESUMEN_PLANE,
                            SIN_ASIGNAR, SPRINTS)

# ---------------------------------------------------------------------------
# Datos de portada
# ---------------------------------------------------------------------------
TITULO = ("Sistema de Gestión de Órdenes de Trabajo y Mantenimiento (CMMS) "
          "para TCI Técnicos de Control Industrial")
SUBTITULO = "Informe final del proyecto"
ASIGNATURA = "Administración de Proyectos, Sección 330"
DOCENTE = "Lic. Kenssy Licona"
UNIVERSIDAD = "Centro Universitario Tecnológico (CEUTEC)"
FECHA = "20 de septiembre de 2026"
RUNNING = ("TCI Técnicos de Control Industrial  |  Sistema de Gestión de "
           "Órdenes de Trabajo (CMMS)")

INTEGRANTES = [("22211304", "Carlos Mario Figueroa Durán"),
               ("62221118", "Roberto Gabriel Ortega Altamirano"),
               ("61711041", "Ángel David Cardona"),
               ("62451048", "Esdras Abiel Clother"),
               ("62411339", "Yina Alejandra Funes Rivera")]


def _pct(a, b):
    return "%.0f %%" % (100.0 * a / b) if b else "—"


def bloques():
    B = []
    a = B.append

    # =======================================================================
    # Portada, resumen, indice e introduccion
    # =======================================================================
    a(("portada",))

    a(("titulo", "Resumen"))
    a(("ps",
       "El presente documento constituye el informe final del proyecto de "
       "desarrollo de un sistema web de gestión de órdenes de trabajo y "
       "mantenimiento, categorizado como CMMS (Computerized Maintenance "
       "Management System), para la empresa hondureña TCI Técnicos de Control "
       "Industrial. El informe consolida el ciclo completo del proyecto: la "
       "fase de descubrimiento sostenida con la gerencia de la empresa, que "
       "fijó el título, los objetivos general y específicos, los "
       "requerimientos funcionales y no funcionales, los lineamientos de "
       "identidad visual, el alcance comprometido y el stack tecnológico; la "
       "ejecución bajo el marco de trabajo Scrum a lo largo de tres Sprints, "
       "con su Product Backlog priorizado, la planificación y el backlog de "
       "cada Sprint, las revisiones y las retrospectivas; y los resultados "
       "efectivamente alcanzados al cierre del periodo académico. La solución "
       "construida cubre el ciclo completo de la orden de trabajo, la "
       "administración de clientes, sedes y equipos, el panel de campo para "
       "técnicos, el control de repuestos, el mantenimiento preventivo "
       "programado con generación automática de órdenes, las notificaciones "
       "por evento y los reportes históricos con tablero de indicadores. Está "
       "construida sobre Next.js, NestJS, Prisma y PostgreSQL, y desplegada en "
       "contenedores mediante Dokploy sobre un servidor privado virtual. Al "
       "corte del informe el Product Backlog registra %d elementos, de los "
       "cuales %d se encuentran terminados (%s); los nueve módulos de producto "
       "están cerrados y lo pendiente se concentra en el módulo de "
       "implementación, en las actividades que dependen de la disponibilidad "
       "del cliente —capacitación, migración de datos reales y verificación "
       "del dominio de correo— y no del desarrollo."
       % (RESUMEN_PLANE["total"], RESUMEN_PLANE["hechos"],
          _pct(RESUMEN_PLANE["hechos"], RESUMEN_PLANE["total"]))))
    a(("ps", "<b>Palabras clave:</b> CMMS, mantenimiento industrial, órdenes "
             "de trabajo, Scrum, desarrollo web."))

    a(("titulo", "Índice"))
    a(("toc",))

    a(("titulo", "Introducción"))
    a(("p",
       "El mantenimiento industrial dejó de ser una actividad reactiva para "
       "convertirse en una función crítica de la competitividad de las "
       "empresas de servicios técnicos: la disponibilidad de los equipos y la "
       "trazabilidad de las intervenciones dependen de que la información esté "
       "registrada y centralizada en el momento de la decisión. Los sistemas "
       "computarizados de gestión del mantenimiento, conocidos por sus siglas "
       "en inglés como CMMS, responden a esa necesidad al concentrar en una "
       "sola plataforma las órdenes de trabajo, el inventario de activos, los "
       "planes preventivos y el historial de servicio (Wireman, 2008)."))
    a(("p",
       "TCI Técnicos de Control Industrial es una empresa hondureña dedicada a "
       "la automatización, la mecánica y la electricidad industrial, así como "
       "al mantenimiento preventivo y correctivo de maquinaria (TCI Técnicos "
       "de Control Industrial, 2025). Su operación es intensiva en trabajo de "
       "campo: los técnicos se desplazan a las instalaciones del cliente, "
       "ejecutan la intervención y reportan el resultado. Ese modelo genera un "
       "volumen constante de órdenes de trabajo cuya gestión y documentación "
       "constituyen el núcleo administrativo de la empresa."))
    a(("p",
       "Este documento presenta el resultado final del proyecto que responde a "
       "esa necesidad. Se abre con el enunciado de los objetivos general y "
       "específicos, que fijan el compromiso adquirido con la empresa, y "
       "continúa con los catorce apartados del esquema establecido para la "
       "asignatura: la organización cliente y el problema "
       "identificado, la aplicación del marco de trabajo Scrum, los artefactos "
       "de la metodología —Product Backlog, Sprint Planning y Sprint "
       "Backlog—, las evidencias del desarrollo, los eventos de revisión y "
       "retrospectiva, y los resultados obtenidos. Cierra con las "
       "conclusiones, las recomendaciones, la bibliografía consultada y los "
       "anexos."))
    a(("p",
       "A diferencia de la versión que se entregó al cierre del Sprint 1, que "
       "era un documento de definición, esta versión es un informe de cierre: "
       "los apartados que entonces describían lo que se haría se sustituyen "
       "ahora por la evidencia de lo que se hizo. El lector encontrará, por "
       "tanto, el modelo de datos efectivamente implementado, las capturas del "
       "sistema en funcionamiento, el registro de las tres revisiones y "
       "retrospectivas de Sprint, y el contraste entre lo planificado y lo "
       "entregado, con mención explícita de lo que quedó fuera y por qué."))

    # =======================================================================
    # Objetivos del proyecto (seccion preliminar, sin numerar)
    # =======================================================================
    a(("titulo", "Objetivos del Proyecto"))
    a(("p",
       "Los objetivos que siguen fueron acordados con la gerencia de TCI al "
       "cierre de la fase de descubrimiento y se mantuvieron sin cambios a "
       "lo largo de los tres Sprints. Definen el compromiso que este informe "
       "rinde cuentas de haber cumplido, y por esa razón se enuncian antes "
       "del desarrollo y no dentro de él."))
    a(("h2", "Objetivo General"))
    a(("ps",
       "Desarrollar e implementar, mediante la aplicación del marco de trabajo "
       "Scrum, un sistema web de gestión de órdenes de trabajo y mantenimiento "
       "(CMMS) para TCI Técnicos de Control Industrial, que centralice el "
       "ciclo de vida completo de la orden —creación, asignación, ejecución en "
       "campo y cierre—, la administración de clientes y equipos, el control "
       "de repuestos, la programación del mantenimiento preventivo y el "
       "historial de servicio, entregando valor de forma incremental en tres "
       "Sprints hasta alcanzar un producto desplegado en ambiente productivo y "
       "adoptado por los usuarios finales de la empresa."))

    a(("h2", "Objetivos Específicos"))
    a(("p",
       "En coherencia con el marco Scrum adoptado, los objetivos específicos "
       "se formulan como metas de Sprint: cada uno describe un incremento de "
       "producto potencialmente utilizable, expresado desde la perspectiva del "
       "rol que recibe el valor y del beneficio que obtiene, de modo que su "
       "cumplimiento sea verificable en la Sprint Review correspondiente "
       "(Schwaber &amp; Sutherland, 2020)."))
    for codigo, texto in [
        ("OE1", "Entregar un incremento que permita al personal administrativo "
                "crear, editar, asignar y cerrar órdenes de trabajo sobre un "
                "flujo de estados definido, con registro de auditoría de cada "
                "cambio, a fin de que la empresa disponga de una fuente única "
                "de verdad sobre el trabajo en curso."),
        ("OE2", "Entregar un incremento de autenticación y autorización que "
                "distinga los roles de administrador y técnico, de manera que "
                "cada usuario acceda únicamente a la información y a las "
                "operaciones que le corresponden."),
        ("OE3", "Entregar un incremento que administre el catálogo de clientes "
                "y de equipos o activos asociados a cada uno, vinculando cada "
                "equipo con su historial de órdenes, y que ponga esa "
                "información en manos del técnico mediante un panel web "
                "responsivo desde el cual consulte sus órdenes asignadas, "
                "actualice su estado, registre comentarios y adjunte evidencia "
                "fotográfica, de modo que el reporte se produzca en el sitio "
                "de la intervención y las órdenes puedan analizarse por activo "
                "y no solo por fecha."),
        ("OE4", "Entregar un incremento que automatice la gestión del "
                "mantenimiento mediante el control del inventario de repuestos "
                "con su consumo imputado a cada orden, la definición de planes "
                "preventivos por tipo de equipo con generación automática de "
                "órdenes al cumplirse la frecuencia establecida, y las "
                "notificaciones de los eventos relevantes del ciclo de la "
                "orden, para que el cumplimiento del programa preventivo y el "
                "seguimiento del trabajo dejen de depender de recordatorios "
                "manuales y de consultas telefónicas."),
        ("OE5", "Entregar un incremento de reportes e historial que consolide "
                "el servicio por equipo, por técnico y por periodo, con "
                "exportación y un tablero de indicadores clave, y desplegar el "
                "sistema en ambiente productivo con la migración de los datos "
                "iniciales y la capacitación de administradores y técnicos, a "
                "fin de que la gerencia disponga de información agregada para "
                "decidir y la solución quede efectivamente adoptada al cierre "
                "del proyecto.")]:
        a(("ps", "<b>%s.</b> %s" % (codigo, texto)))
    a(("p",
       "El grado de cumplimiento alcanzado por cada uno de estos objetivos al "
       "cierre del proyecto se documenta en el apartado 10, que los contrasta "
       "uno a uno con la evidencia registrada en el tablero del proyecto."))

    # =======================================================================
    # 1. Descripcion de la organizacion
    # =======================================================================
    a(("h1", "1. Descripción de la Organización"))
    a(("h2", "1.1 Presentación de la Empresa"))
    a(("p",
       "TCI Técnicos de Control Industrial es una empresa hondureña de "
       "servicios técnicos industriales con sede en la 27 Calle de San Pedro "
       "Sula, Honduras. Su propuesta de valor, sintetizada en el eslogan "
       "institucional <i>Soluciones a tu Industria</i>, consiste en atender de "
       "forma integral las necesidades técnicas de plantas y procesos "
       "productivos, cubriendo tanto la instalación y puesta en marcha como el "
       "mantenimiento posterior de los equipos (TCI Técnicos de Control "
       "Industrial, 2025)."))
    a(("p",
       "La empresa se autodefine como una organización dedicada a ofrecer "
       "soluciones profesionales en automatización, mecánica y electricidad "
       "industrial, así como mantenimientos preventivos y correctivos, y "
       "declara contar con un equipo altamente capacitado y comprometido con "
       "la excelencia. Opera bajo un modelo de negocio de empresa a empresa: "
       "sus clientes son organizaciones del sector industrial que contratan a "
       "TCI para intervenir sobre sus activos productivos, lo que implica que "
       "la mayor parte del trabajo técnico se ejecuta fuera de las "
       "instalaciones de TCI, en las plantas del cliente."))

    a(("h2", "1.2 Servicios que Ofrece"))
    a(("p",
       "La oferta de servicios de TCI se organiza en cuatro líneas, cada una "
       "con un conjunto definido de prestaciones."))
    a(("h3", "1.2.1 Automatización"))
    a(("lista", ["Instalación de sistemas automatizados.",
                 "Programación de PLC y HMI.",
                 "Mantenimiento de líneas automatizadas."]))
    a(("h3", "1.2.2 Mecánica Industrial"))
    a(("lista", ["Montaje y mantenimiento de maquinaria.",
                 "Diseño de piezas industriales.",
                 "Reparación de equipos mecánicos."]))
    a(("h3", "1.2.3 Electricidad Industrial"))
    a(("lista", ["Instalación eléctrica industrial.",
                 "Mantenimiento de tableros y circuitos.",
                 "Soluciones de eficiencia energética."]))
    a(("h3", "1.2.4 Mantenimiento Industrial"))
    a(("lista", ["Mantenimiento preventivo y correctivo.",
                 "Revisión y calibración de maquinaria.",
                 "Optimización de procesos industriales."]))
    a(("ps",
       "Esta última línea es la que guarda relación más directa con el sistema "
       "objeto de este proyecto, aunque las cuatro generan órdenes de trabajo "
       "y, por tanto, quedan comprendidas dentro del alcance funcional de la "
       "solución."))

    a(("h2", "1.3 Filosofía Organizacional"))
    a(("h3", "1.3.1 Misión"))
    a(("ps",
       "“Ofrecer soluciones técnicas en electricidad, automatización, mecánica "
       "industrial y mantenimiento de maquinaria con altos estándares de "
       "calidad y seguridad” (TCI Técnicos de Control Industrial, 2025)."))
    a(("h3", "1.3.2 Visión"))
    a(("ps",
       "“Convertirnos en la empresa referente en servicios técnicos y de "
       "automatización industrial en Honduras, reconocidos por nuestra "
       "innovación y excelencia” (TCI Técnicos de Control Industrial, 2025)."))
    a(("p",
       "La visión institucional resulta especialmente relevante para este "
       "proyecto: el reconocimiento por innovación y excelencia que TCI "
       "persigue se apoya, en el plano operativo, en la capacidad de responder "
       "con rapidez y de sustentar cada intervención con evidencia "
       "documentada. El sistema construido es un instrumento directo de esa "
       "visión."))

    a(("h2", "1.4 Datos Generales de la Empresa"))
    a(("tabla", "Datos generales de TCI Técnicos de Control Industrial",
       ["Dato", "Detalle"],
       [["Razón social", "TCI Técnicos de Control Industrial"],
        ["Gerente", "Jasson Calet López Navarro"],
        ["Eslogan", "Soluciones a tu Industria"],
        ["País", "Honduras"],
        ["Ubicación", "27 Calle, San Pedro Sula"],
        ["Sector", "Servicios técnicos industriales (automatización, "
                   "electricidad, mecánica y mantenimiento)"],
        ["Modelo de negocio", "Empresa a empresa (B2B), con ejecución en sitio "
                              "del cliente"],
        ["Correo", "cotizaciones@tcihn.com"],
        ["Teléfono / WhatsApp", "+504 9565-9697"],
        ["Sitio web", "https://www.tcihn.com/"],
        ["Presencia digital", "Facebook, Instagram, TikTok y LinkedIn"]],
       [0.28, 0.72],
       "Elaboración propia a partir de la información publicada en el sitio "
       "web oficial de la empresa (TCI Técnicos de Control Industrial, 2025) y "
       "de la reunión de levantamiento de requerimientos sostenida con el "
       "gerente de la empresa, Jasson Calet López Navarro, el 6 de agosto de "
       "2026."))

    # =======================================================================
    # 2. Problema identificado
    # =======================================================================
    a(("h1", "2. Problema Identificado"))
    a(("h2", "2.1 Planteamiento del Problema"))
    a(("p",
       "Durante la reunión de levantamiento de requerimientos sostenida con el "
       "gerente de TCI, Jasson Calet López Navarro, se identificó que la "
       "operación de mantenimiento de la empresa carece de una plataforma "
       "única que la soporte. La información de las intervenciones se registra "
       "en soportes dispersos, administrados de forma independiente por cada "
       "responsable y sin un repositorio común que los integre, lo que "
       "fragmenta el dato entre distintas personas y formatos."))
    a(("p",
       "Esta dispersión produce cuatro efectos operativos concretos. Primero, "
       "la asignación de trabajo depende de la coordinación verbal o "
       "telefónica entre supervisión y técnicos, sin un registro formal de "
       "quién es responsable de qué orden. Segundo, el avance de una "
       "intervención no es visible en tiempo real: supervisión debe consultar "
       "activamente al técnico para conocer el estado. Tercero, el historial "
       "de servicio por equipo no es consultable de forma inmediata, lo que "
       "dificulta sustentar decisiones técnicas y responder a auditorías del "
       "cliente. Cuarto, el mantenimiento preventivo depende de recordatorios "
       "manuales, por lo que su cumplimiento es vulnerable al olvido y a la "
       "carga de trabajo del momento."))
    a(("p",
       "De la misma reunión se desprende que la gerencia requiere una solución "
       "que le permita gestionar de manera integrada las órdenes de trabajo, "
       "la programación de mantenimientos correctivos y preventivos, el "
       "seguimiento de clientes, y la evaluación de los costos asociados al "
       "servicio. En consecuencia, el problema se formula en los siguientes "
       "términos: <b>TCI Técnicos de Control Industrial no dispone de un "
       "sistema centralizado que registre, asigne, controle y documente el "
       "ciclo de vida de sus órdenes de trabajo, lo que limita la trazabilidad "
       "del servicio, impide el seguimiento en tiempo real de las "
       "intervenciones y dificulta la planificación del mantenimiento "
       "preventivo.</b>"))

    a(("h2", "2.2 Justificación"))
    a(("p",
       "La justificación del proyecto se sostiene en tres dimensiones. En el "
       "plano operativo, centralizar la gestión de órdenes elimina la "
       "coordinación informal y otorga a supervisión visibilidad inmediata "
       "sobre el estado de cada intervención, reduciendo el tiempo dedicado a "
       "labores de seguimiento que no agregan valor técnico."))
    a(("p",
       "En el plano estratégico, la disponibilidad de un historial "
       "estructurado por equipo y por cliente convierte el dato operativo en "
       "insumo de decisión: permite identificar los activos que concentran "
       "fallas recurrentes, sustentar recomendaciones técnicas ante el cliente "
       "y transitar de un esquema predominantemente correctivo hacia uno "
       "preventivo, que es donde la literatura ubica el mayor retorno de la "
       "gestión del mantenimiento (Wireman, 2008)."))
    a(("p",
       "En el plano comercial, la capacidad de entregar al cliente evidencia "
       "documentada de cada intervención y reportes históricos de sus equipos "
       "constituye un diferenciador frente a competidores que operan con "
       "registros informales, y respalda directamente la visión de la empresa "
       "de posicionarse como referente por innovación y excelencia en "
       "Honduras."))

    a(("h2", "2.3 Título del Proyecto"))
    a(("ps", "<b>Sistema de Gestión de Órdenes de Trabajo y Mantenimiento "
             "(CMMS) para TCI Técnicos de Control Industrial.</b>"))
    a(("p",
       "El título delimita tres elementos. El objeto es un sistema de "
       "información de tipo CMMS, es decir, orientado a la gestión "
       "computarizada del mantenimiento. El dominio funcional central es la "
       "orden de trabajo, entendida como la unidad de servicio que atraviesa "
       "todo el proceso operativo de la empresa. Y el destinatario es una "
       "organización concreta, TCI Técnicos de Control Industrial, lo que "
       "implica que la solución se ajusta a su realidad operativa y no a un "
       "producto genérico de mercado."))

    a(("p",
       "Los objetivos general y específicos que responden a este problema se "
       "enuncian al inicio del documento, inmediatamente después de la "
       "introducción, por tratarse del compromiso que ordena la totalidad "
       "del informe y no de un contenido subordinado al planteamiento."))

    # =======================================================================
    # 3. Aplicacion de Scrum
    # =======================================================================
    a(("h1", "3. Aplicación de Scrum"))
    a(("h2", "3.1 Justificación de la Metodología"))
    a(("p",
       "El proyecto adopta Scrum, definido por sus autores como un marco de "
       "trabajo ligero que ayuda a las personas, equipos y organizaciones a "
       "generar valor a través de soluciones adaptativas para problemas "
       "complejos (Schwaber &amp; Sutherland, 2020). La elección responde a "
       "tres condiciones propias de este proyecto."))
    a(("p",
       "La primera es la incertidumbre del dominio. Aunque el levantamiento "
       "inicial definió las necesidades generales, el detalle operativo del "
       "mantenimiento industrial —la nomenclatura de los equipos, el flujo "
       "real de aprobación, la forma en que el técnico documenta en campo— "
       "solo se precisa al confrontar el producto con los usuarios. Scrum "
       "incorpora esa retroalimentación en cada Sprint Review en lugar de "
       "diferirla al final. La ejecución confirmó esa previsión: once de los "
       "sesenta y seis elementos del Product Backlog no existían al planificar "
       "y nacieron de las revisiones, tal como se detalla en el apartado 8."))
    a(("p",
       "La segunda es la necesidad de entregar valor de forma temprana. El "
       "módulo de órdenes de trabajo resuelve por sí solo el problema más "
       "urgente de la empresa; no es necesario esperar a que el inventario o "
       "los reportes estén terminados para que TCI comience a obtener "
       "beneficio. La entrega incremental hace posible esa liberación "
       "escalonada."))
    a(("p",
       "La tercera es el tamaño y la composición del equipo. Un equipo "
       "reducido, con responsabilidades compartidas y comunicación directa, se "
       "ajusta a la estructura que Scrum prescribe y no justificaría la carga "
       "documental de un enfoque predictivo tradicional."))

    a(("h2", "3.2 Roles del Equipo Scrum"))
    a(("tabla", "Asignación de roles del equipo Scrum",
       ["Rol", "Responsable", "Responsabilidades principales"],
       [["Product Owner", "Esdras Abiel Clother",
         "Gestiona el Product Backlog, define y prioriza las historias de "
         "usuario, actúa como interlocutor con la gerencia de TCI y acepta los "
         "incrementos."],
        ["Scrum Master", "Yina Alejandra Funes Rivera",
         "Facilita los eventos Scrum, remueve impedimentos, asegura la "
         "aplicación del marco y protege al equipo de interrupciones "
         "externas."],
        ["Equipo de Desarrollo",
         "Carlos Figueroa, Roberto Ortega, Ángel Cardona, Esdras Clother y "
         "Yina Funes",
         "Diseña, construye, prueba e integra el incremento; estima las "
         "historias y se autoorganiza para alcanzar la meta del Sprint."],
        ["Interesado (cliente)", "Jasson Calet López Navarro, gerente de TCI",
         "Aporta el conocimiento del negocio, valida los incrementos en la "
         "Sprint Review y aprueba el alcance de cada entrega."]],
       [0.20, 0.26, 0.54],
       "Los cinco integrantes conforman el Equipo de Desarrollo. Los roles de "
       "Product Owner y Scrum Master los asumen adicionalmente dos de ellos, "
       "práctica habitual en equipos reducidos que exige distinguir con "
       "claridad la capacidad en la que cada uno interviene en cada evento del "
       "marco."))

    a(("h2", "3.3 Artefactos"))
    a(("ps",
       "<b>Product Backlog.</b> Lista ordenada y viva de todo lo que se conoce "
       "como necesario en el producto. En este proyecto se administró en la "
       "plataforma Plane, donde cada elemento se registra como un <i>work "
       "item</i> con identificador propio, módulo, prioridad, responsable y "
       "etiquetas técnicas. El backlog inicial estuvo compuesto por cincuenta "
       "y seis elementos agrupados en diez módulos funcionales; al cierre del "
       "proyecto contiene %d, resultado de incorporar once elementos nacidos "
       "del refinamiento y de las revisiones, y de retirar uno que fue "
       "reformulado." % RESUMEN_PLANE["total"]))
    a(("ps",
       "<b>Sprint Backlog.</b> Subconjunto del Product Backlog seleccionado "
       "para el Sprint en curso, junto con el plan para entregarlo. Se "
       "materializa en los ciclos definidos en Plane, que agrupan los "
       "elementos comprometidos y permiten visualizar el avance mediante "
       "gráficos de trabajo pendiente. El contenido de los tres Sprint "
       "Backlogs se reproduce íntegro en el apartado 6."))
    a(("ps",
       "<b>Incremento.</b> Suma de los elementos completados durante el Sprint "
       "que cumplen la Definición de Terminado. Cada incremento debe ser "
       "potencialmente desplegable, condición que se verificó mediante el "
       "despliegue efectivo del sistema al cierre de cada Sprint."))

    a(("h2", "3.4 Eventos y Cadencia"))
    a(("tabla", "Eventos Scrum del proyecto",
       ["Evento", "Frecuencia", "Duración", "Propósito"],
       [["Sprint", "Cada 2 semanas", "10 días hábiles",
         "Contenedor de los demás eventos; produce un incremento utilizable."],
        ["Sprint Planning", "Inicio de cada Sprint", "2 horas",
         "Definir la meta del Sprint y seleccionar los elementos del backlog."],
        ["Daily Scrum", "Diaria", "15 minutos",
         "Sincronizar el avance y detectar impedimentos."],
        ["Sprint Review", "Cierre de cada Sprint", "1 hora",
         "Presentar el incremento a la gerencia de TCI y recoger "
         "retroalimentación."],
        ["Sprint Retrospective", "Cierre de cada Sprint", "45 minutos",
         "Identificar mejoras al proceso de trabajo del equipo."],
        ["Refinamiento del Backlog", "Semanal", "1 hora",
         "Detallar, estimar y reordenar los elementos próximos."]],
       [0.22, 0.17, 0.14, 0.47],
       "Las duraciones corresponden a los límites de tiempo acordados por el "
       "equipo para Sprints de dos semanas. El Sprint 3 se extendió a trece "
       "días naturales por coincidir su cierre con la fecha de entrega "
       "académica."))

    a(("h2", "3.5 Definición de Terminado"))
    a(("p",
       "Un elemento del backlog se consideró terminado únicamente cuando "
       "satisfizo la totalidad de los siguientes criterios:"))
    a(("lista", [
        "El código está versionado en el repositorio y fue integrado a la rama "
        "principal mediante solicitud de incorporación revisada por al menos "
        "otro integrante del equipo.",
        "La funcionalidad cumple los criterios de aceptación definidos en la "
        "historia de usuario correspondiente.",
        "Se ejecutaron pruebas automatizadas —unitarias y de extremo a "
        "extremo— sobre los casos principales de la funcionalidad y sobre al "
        "menos un caso de error, y la totalidad de la suite pasa antes de "
        "integrar.",
        "La interfaz respeta los lineamientos de identidad visual establecidos "
        "en el apartado 7.5.",
        "Las migraciones de base de datos están versionadas y se aplican sin "
        "intervención manual.",
        "El elemento fue desplegado y verificado en el ambiente de pruebas.",
        "La documentación técnica asociada fue actualizada."]))
    a(("p",
       "El apartado 10 documenta el grado de cumplimiento efectivo de esta "
       "definición: los siete criterios se aplicaron sin excepción a los "
       "elementos de producto, mientras que el sexto —verificación en ambiente "
       "de pruebas— operó durante los dos primeros Sprints sobre entornos "
       "locales, por no existir todavía un ambiente de pruebas compartido. La "
       "retrospectiva del Sprint 2 recogió esa desviación y el apartado 12 la "
       "convierte en recomendación."))

    # =======================================================================
    # 4. Product Backlog
    # =======================================================================
    a(("h1", "4. Product Backlog"))
    a(("p",
       "Los requerimientos se derivan del levantamiento sostenido con la "
       "gerencia de TCI y se organizan siguiendo la clasificación clásica "
       "entre requerimientos funcionales, que describen lo que el sistema debe "
       "hacer, y requerimientos no funcionales, que expresan restricciones "
       "sobre cómo debe hacerlo (Sommerville, 2011). La prioridad asignada a "
       "cada requerimiento funcional corresponde a la registrada en el Product "
       "Backlog del proyecto. La columna de estado refleja la situación al "
       "cierre del proyecto."))

    a(("h2", "4.1 Requerimientos Funcionales"))
    RF = [
        ("RF-01", "Órdenes de trabajo", "Definir y aplicar los estados de la orden y las transiciones permitidas entre ellos.", "Crítica", "Implementado"),
        ("RF-02", "Órdenes de trabajo", "Registrar una orden con tipo de mantenimiento, prioridad, equipo asociado, técnico, fechas y descripción del problema.", "Alta", "Implementado"),
        ("RF-03", "Órdenes de trabajo", "Crear una nueva orden de trabajo.", "Alta", "Implementado"),
        ("RF-04", "Órdenes de trabajo", "Listar y filtrar órdenes por estado, técnico, cliente, equipo y rango de fechas.", "Alta", "Implementado"),
        ("RF-05", "Órdenes de trabajo", "Actualizar los datos de una orden existente.", "Alta", "Implementado"),
        ("RF-06", "Órdenes de trabajo", "Cerrar o cancelar una orden registrando el motivo.", "Alta", "Implementado"),
        ("RF-07", "Órdenes de trabajo", "Asignar y reasignar el técnico responsable de una orden.", "Media", "Implementado"),
        ("RF-08", "Órdenes de trabajo", "Registrar el historial de cambios de cada orden indicando usuario, cambio y momento.", "Media", "Implementado"),
        ("RF-09", "Órdenes de trabajo", "Administrar el catálogo de tipos de mantenimiento (preventivo, correctivo, emergencia).", "Baja", "Implementado"),
        ("RF-10", "Autenticación", "Permitir el inicio de sesión y gestionar la sesión del usuario.", "Crítica", "Implementado"),
        ("RF-11", "Autenticación", "Definir los roles de administrador y técnico con sus permisos asociados.", "Alta", "Implementado"),
        ("RF-12", "Autenticación", "Restringir el acceso a cada operación de la interfaz de programación según el rol del usuario autenticado.", "Alta", "Implementado"),
        ("RF-13", "Autenticación", "Permitir la recuperación de contraseña mediante correo electrónico.", "Media", "Parcial"),
        ("RF-14", "Autenticación", "Crear, editar y desactivar usuarios desde el panel de administración. El sistema no ofrece registro público: toda cuenta la crea un administrador.", "Alta", "Implementado"),
        ("RF-15", "Clientes y equipos", "Administrar el registro de clientes con datos de contacto y sedes.", "Alta", "Implementado"),
        ("RF-16", "Clientes y equipos", "Administrar los equipos o activos por cliente, con tipo, número de serie y ubicación física.", "Alta", "Implementado"),
        ("RF-17", "Clientes y equipos", "Vincular cada equipo con las órdenes de trabajo que se le han generado, respetando el aislamiento por rol del solicitante.", "Media", "Implementado"),
        ("RF-18", "Clientes y equipos", "Buscar y filtrar clientes y equipos desde el panel administrativo.", "Baja", "Implementado"),
        ("RF-19", "Panel de técnicos", "Redirigir al usuario a la vista correspondiente a su rol tras iniciar sesión.", "Alta", "Implementado"),
        ("RF-20", "Panel de técnicos", "Mostrar al técnico autenticado el listado de órdenes que tiene asignadas.", "Alta", "Implementado"),
        ("RF-21", "Panel de técnicos", "Permitir al técnico cambiar el estado de una orden y registrar comentarios desde el panel.", "Alta", "Implementado"),
        ("RF-22", "Panel de técnicos", "Permitir adjuntar fotografías y notas como evidencia al cerrar una orden.", "Media", "Implementado"),
        ("RF-23", "Panel de técnicos", "Presentar una interfaz utilizable desde teléfono móvil y tableta en condiciones de campo.", "Media", "Implementado"),
        ("RF-24", "Inventario", "Administrar el catálogo de repuestos con nombre, código, unidad de medida y existencia disponible.", "Media", "Implementado"),
        ("RF-25", "Inventario", "Registrar los repuestos consumidos en cada orden de trabajo.", "Media", "Implementado"),
        ("RF-26", "Inventario", "Emitir una alerta cuando un repuesto alcance su nivel mínimo de existencia.", "Baja", "Implementado"),
        ("RF-27", "Inventario", "Registrar el historial de entradas y salidas de repuestos.", "Baja", "Implementado"),
        ("RF-28", "Preventivo", "Definir planes de mantenimiento por tipo de equipo indicando su frecuencia.", "Media", "Implementado"),
        ("RF-29", "Preventivo", "Generar automáticamente una orden de trabajo al cumplirse el plazo definido en el plan.", "Alta", "Implementado"),
        ("RF-30", "Preventivo", "Presentar en calendario los mantenimientos programados próximos.", "Media", "Implementado"),
        ("RF-31", "Preventivo", "Notificar de forma anticipada antes del vencimiento de un mantenimiento programado.", "Media", "Implementado"),
        ("RF-32", "Notificaciones", "Emitir notificaciones ante los eventos definidos: asignación, cambio de estado, cierre y vencimiento preventivo.", "Media", "Implementado"),
        ("RF-33", "Notificaciones", "Permitir configurar el canal de envío de cada tipo de notificación.", "Baja", "Implementado"),
        ("RF-34", "Notificaciones", "Configurar qué notificaciones recibe cada rol.", "Baja", "Implementado"),
        ("RF-35", "Notificaciones", "Administrar las plantillas de mensaje de cada tipo de notificación.", "Baja", "Implementado"),
        ("RF-36", "Reportes", "Consultar el historial consolidado de mantenimiento de un equipo o activo.", "Media", "Implementado"),
        ("RF-37", "Reportes", "Generar un reporte de órdenes filtrable por técnico y por rango de fechas.", "Media", "Implementado"),
        ("RF-38", "Reportes", "Exportar cualquier reporte generado a formato PDF o Excel.", "Baja", "Implementado"),
        ("RF-39", "Reportes", "Presentar un tablero con indicadores clave: tiempo promedio de resolución, órdenes por estado y carga por técnico.", "Media", "Implementado"),
    ]
    a(("tabla", "Requerimientos funcionales del sistema y estado al cierre",
       ["Código", "Módulo", "Descripción", "Prioridad", "Estado"],
       [list(x) for x in RF], [0.10, 0.15, 0.46, 0.11, 0.18],
       "La prioridad corresponde a la registrada en el Product Backlog "
       "administrado en Plane. Treinta y ocho de los treinta y nueve "
       "requerimientos funcionales quedaron implementados y verificados. El "
       "único parcial es el RF-13: el flujo de restablecimiento de contraseña "
       "está construido de extremo a extremo —solicitud, emisión de enlace con "
       "vigencia de una hora y consumo del enlace— pero el envío del correo "
       "depende de la verificación del dominio remitente ante el proveedor, "
       "que es una gestión del cliente. Mientras tanto, la vía operativa es "
       "que un administrador asigne la contraseña desde el panel de usuarios. "
       "Sobre el RF-14 debe precisarse la decisión adoptada con la gerencia de "
       "TCI el 22 de agosto de 2026: el sistema no dispone de registro público "
       "de usuarios; las cuentas las crea un administrador desde el panel y la "
       "primera cuenta administradora se genera durante la carga inicial de la "
       "base de datos. Sobre el RF-38, la exportación se entregó en PDF y en "
       "CSV con separador de punto y coma y marca de orden de bytes, formato "
       "que Microsoft Excel abre directamente; no se generan archivos .xlsx "
       "nativos."))

    a(("h2", "4.2 Requerimientos No Funcionales"))
    a(("p",
       "Los requerimientos no funcionales se enuncian tomando como referencia "
       "las características de calidad del producto de software definidas en "
       "la norma ISO/IEC 25010 (International Organization for "
       "Standardization, 2011)."))
    RNF = [
        ("RNF-01", "Usabilidad", "La interfaz será responsiva y utilizable desde teléfono móvil y tableta, con elementos táctiles suficientemente amplios para su manipulación en campo."),
        ("RNF-02", "Usabilidad", "La totalidad de la interfaz y de los mensajes del sistema se presentará en idioma español."),
        ("RNF-03", "Eficiencia de desempeño", "Los listados principales responderán en menos de dos segundos bajo condiciones normales de operación."),
        ("RNF-04", "Seguridad", "Las contraseñas se almacenarán cifradas mediante una función de derivación de clave; en ningún caso se guardarán en texto plano."),
        ("RNF-05", "Seguridad", "Toda comunicación entre el cliente y el servidor se realizará sobre HTTPS con certificado válido."),
        ("RNF-06", "Seguridad", "El acceso a cada recurso se validará en el servidor según el rol del usuario, con independencia de lo que muestre la interfaz."),
        ("RNF-07", "Fiabilidad", "Se ejecutarán respaldos automáticos de la base de datos con verificación periódica de su restauración."),
        ("RNF-08", "Fiabilidad", "Toda modificación sobre una orden quedará registrada con usuario, acción y marca temporal, sin posibilidad de alteración."),
        ("RNF-09", "Mantenibilidad", "El código se organizará en módulos con separación entre capa de presentación, lógica de negocio y acceso a datos."),
        ("RNF-10", "Mantenibilidad", "Todo cambio en el esquema de la base de datos se aplicará mediante migraciones versionadas."),
        ("RNF-11", "Portabilidad", "El sistema se ejecutará en contenedores, de modo que pueda desplegarse en cualquier servidor compatible sin reconfiguración manual."),
        ("RNF-12", "Compatibilidad", "El sistema funcionará correctamente en las versiones vigentes de los navegadores de mayor uso."),
        ("RNF-13", "Adecuación funcional", "La interfaz respetará los lineamientos de identidad visual definidos en el apartado 7.5."),
        ("RNF-14", "Accesibilidad", "Las combinaciones de color cumplirán la relación de contraste mínima de 4.5:1 exigida por el nivel AA de las pautas WCAG 2.1 (World Wide Web Consortium, 2018)."),
    ]
    a(("tabla", "Requerimientos no funcionales del sistema",
       ["Código", "Característica de calidad", "Descripción"],
       [list(x) for x in RNF], [0.11, 0.22, 0.67],
       "Clasificación basada en el modelo de calidad del producto de la norma "
       "ISO/IEC 25010. La evidencia de cumplimiento de cada uno se documenta "
       "en el apartado 10.3."))

    a(("h2", "4.3 Historias de Usuario Representativas"))
    a(("p",
       "A continuación se presenta una selección de historias de usuario del "
       "Product Backlog, redactadas en el formato de rol, funcionalidad y "
       "beneficio, con sus criterios de aceptación asociados."))
    a(("tabla", "Historias de usuario representativas del Product Backlog",
       ["Código", "Historia de usuario", "Criterios de aceptación"],
       [["HU-01",
         "Como administradora, quiero crear una orden de trabajo indicando "
         "cliente, equipo, tipo de mantenimiento y prioridad, para dejar "
         "registrado formalmente el servicio solicitado.",
         "La orden se guarda con un identificador único; los campos "
         "obligatorios se validan; la orden queda en estado inicial "
         "Pendiente."],
        ["HU-02",
         "Como administradora, quiero asignar un técnico a una orden, para que "
         "quede establecido quién es el responsable de ejecutarla.",
         "Solo se pueden asignar usuarios con rol técnico; la reasignación "
         "queda registrada en el historial; el técnico recibe una "
         "notificación."],
        ["HU-03",
         "Como técnico, quiero ver desde mi teléfono únicamente las órdenes "
         "que tengo asignadas, para saber qué trabajo debo atender sin "
         "depender de una llamada.",
         "El listado muestra solo las órdenes del técnico autenticado; se "
         "ordena por prioridad y fecha; es legible en pantalla de teléfono "
         "móvil."],
        ["HU-04",
         "Como técnico, quiero cambiar el estado de una orden y dejar un "
         "comentario desde el sitio de la intervención, para que supervisión "
         "conozca el avance en el momento en que ocurre.",
         "Solo se permiten las transiciones válidas del flujo; el cambio queda "
         "registrado con fecha y hora; se dispara la notificación "
         "correspondiente."],
        ["HU-05",
         "Como técnico, quiero adjuntar fotografías al cerrar una orden, para "
         "respaldar el trabajo realizado ante el cliente.",
         "Se admiten múltiples imágenes; se valida el formato y el tamaño; la "
         "evidencia queda asociada de forma permanente a la orden."],
        ["HU-06",
         "Como gerente, quiero consultar el historial completo de "
         "mantenimiento de un equipo, para sustentar técnicamente mis "
         "recomendaciones al cliente.",
         "Se listan todas las órdenes del equipo en orden cronológico; se "
         "muestra técnico, tipo, fecha y resultado; el reporte es exportable."],
        ["HU-07",
         "Como gerente, quiero que el sistema genere automáticamente las "
         "órdenes preventivas al cumplirse la frecuencia programada, para que "
         "el cumplimiento del plan no dependa de recordatorios manuales.",
         "La orden se genera en la fecha calculada; se notifica con antelación "
         "configurable; no se duplica si ya existe una orden abierta para ese "
         "plan."]],
       [0.09, 0.47, 0.44],
       "Las siete historias fueron aceptadas por el Product Owner y validadas "
       "por la gerencia de TCI en la Sprint Review correspondiente. El Product "
       "Backlog completo se reproduce por módulo en el Anexo A."))

    # =======================================================================
    # 5. Sprint Planning
    # =======================================================================
    a(("h1", "5. Sprint Planning"))
    a(("h2", "5.1 Alcance Funcional Comprometido"))
    a(("p",
       "La primera versión del sistema comprendió la construcción, prueba y "
       "puesta en producción de los siguientes módulos funcionales:"))
    a(("lista", [
        "<b>Gestión de órdenes de trabajo.</b> Ciclo de vida completo de la "
        "orden, con estados y transiciones definidos, asignación de técnico "
        "responsable, catálogo de tipos de mantenimiento e historial de "
        "auditoría por registro.",
        "<b>Autenticación y permisos.</b> Inicio de sesión, administración de "
        "sesión, roles de administrador y técnico, autorización en el "
        "servidor, recuperación de contraseña y administración de usuarios.",
        "<b>Gestión de clientes y equipos.</b> Registro de clientes con sus "
        "sedes, inventario de equipos o activos por cliente, vinculación de "
        "cada equipo con su historial de órdenes, y búsqueda y filtrado.",
        "<b>Panel de técnicos.</b> Vista responsiva de órdenes asignadas, "
        "actualización de estado y comentarios desde campo, y carga de "
        "evidencia fotográfica al cierre.",
        "<b>Inventario y repuestos.</b> Catálogo de repuestos, imputación de "
        "consumo por orden, alertas de existencia mínima e historial de "
        "movimientos.",
        "<b>Mantenimiento preventivo.</b> Planes por tipo de equipo, "
        "generación automática de órdenes al vencimiento, calendario de "
        "programación y aviso anticipado.",
        "<b>Notificaciones.</b> Eventos disparadores, selección de canal por "
        "evento, configuración por rol y plantillas de mensaje.",
        "<b>Reportes e historial.</b> Historial por equipo, reporte por "
        "técnico y periodo, exportación a PDF y hoja de cálculo, y tablero de "
        "indicadores clave.",
        "<b>Implementación.</b> Despliegue en producción, migración de datos "
        "iniciales, pruebas con datos reales, capacitación a administradores y "
        "técnicos, documentación de usuario y acompañamiento posterior al "
        "lanzamiento."]))

    a(("h2", "5.2 Exclusiones"))
    a(("p",
       "Se declararon expresamente fuera del alcance de la primera versión los "
       "elementos siguientes, que podrán incorporarse en una fase posterior "
       "previa renegociación de alcance y plazo:"))
    a(("lista", [
        "Aplicación móvil nativa para Android o iOS. El acceso desde "
        "dispositivos móviles se resuelve mediante diseño web responsivo y la "
        "instalación de la aplicación como aplicación web progresiva.",
        "Portal de autoservicio para que los clientes de TCI consulten sus "
        "órdenes directamente.",
        "Facturación, cobros e integración con sistemas contables o "
        "tributarios.",
        "Módulo de cotizaciones y de gestión comercial de oportunidades.",
        "Geolocalización de técnicos y control de rutas.",
        "Telemetría o integración directa con los equipos industriales "
        "mediante sensores.",
        "Interfaz en idiomas distintos del español.",
        "Aplicación con funcionamiento sin conexión y sincronización diferida.",
        "Registro público de usuarios. Conforme a la decisión de la gerencia "
        "de TCI, el alta de cuentas es una operación administrativa y no un "
        "autoservicio abierto."]))
    a(("p",
       "Una de las exclusiones originales fue revertida durante la ejecución. "
       "La firma de conformidad del cliente sobre la orden cerrada figuraba "
       "fuera de alcance en la planificación, pero la gerencia la solicitó de "
       "forma expresa en la Sprint Review del Sprint 2 y el equipo la "
       "incorporó como elemento TCI-84. Se implementó sin coste estructural "
       "porque reutiliza el mecanismo de adjuntos ya existente: la firma se "
       "guarda como un adjunto de tipo específico, con lo que hereda el "
       "control de acceso, el almacenamiento privado y la inmutabilidad del "
       "acta de cierre sin añadir una columna ni una tabla nueva. El apartado "
       "8 documenta la decisión y el apartado 10.4 la registra como ampliación "
       "de alcance aceptada."))
    a(("p",
       "Merece mención particular la evaluación de costos del servicio. Esta "
       "necesidad fue planteada por la gerencia durante la reunión de "
       "levantamiento, pero no llegó a contar con un módulo específico en el "
       "Product Backlog. La primera versión no la excluye por completo: el "
       "modelo de datos de la orden de trabajo reserva y persiste el costo de "
       "mano de obra, el costo de repuestos, el costo total y la moneda de la "
       "operación, y el consumo de repuestos se imputa a la orden que lo "
       "generó congelando el precio unitario del momento. Lo que queda fuera "
       "del alcance es el costeo integral del servicio —que exigiría "
       "incorporar tarifas de mano de obra por perfil, tiempos de "
       "desplazamiento, gastos asociados y márgenes—, así como la explotación "
       "de esa información en reportes de rentabilidad. Ese desarrollo "
       "requiere una definición funcional adicional con el cliente y se "
       "propone como primer candidato para la fase dos."))
    a(("p",
       "Debe precisarse igualmente el alcance de la expresión <i>seguimiento "
       "en tiempo real</i>. La planificación advertía que la actualización "
       "automática de la vista de un usuario ante cambios producidos por otro "
       "exigía envío de eventos desde el servidor. Esa capacidad se construyó "
       "efectivamente junto con el elemento TCI-42 y se expone en el canal de "
       "eventos de la orden, de modo que el compromiso quedó cubierto: el "
       "cambio de estado y los comentarios se propagan sin recargar la "
       "página."))

    a(("h2", "5.3 Planificación de Sprints"))
    a(("tabla", "Planificación de los Sprints del proyecto",
       ["Sprint", "Periodo", "Meta del Sprint", "Módulos"],
       [["Sprint 1", PERIODOS["Sprint 1"],
         "Disponer del ciclo completo de la orden de trabajo con control de "
         "acceso por rol.",
         "Descubrimiento; Órdenes de trabajo; Autenticación"],
        ["Sprint 2", PERIODOS["Sprint 2"],
         "Incorporar la base de clientes y equipos y habilitar la operación "
         "del técnico en campo.",
         "Clientes y equipos; Panel de técnicos; Inventario"],
        ["Sprint 3", PERIODOS["Sprint 3"],
         "Completar la automatización preventiva, la información de gestión y "
         "la puesta en producción.",
         "Inventario; Preventivo; Notificaciones; Reportes; Implementación"]],
       [0.12, 0.22, 0.38, 0.28],
       "La planificación corresponde a la registrada en los ciclos del "
       "proyecto en Plane. El apartado 8 contrasta cada meta con el resultado "
       "efectivamente alcanzado en la Sprint Review correspondiente."))

    a(("h2", "5.4 Supuestos y Restricciones"))
    a(("h3", "5.4.1 Supuestos"))
    a(("lista", [
        "La gerencia de TCI designará un interlocutor disponible para resolver "
        "dudas funcionales y participar en las revisiones de cada Sprint.",
        "La empresa proporcionará los datos de clientes y equipos existentes "
        "en un formato procesable para su migración.",
        "Los técnicos cuentan con teléfono móvil con navegador y acceso a "
        "datos durante su jornada de campo.",
        "La información institucional publicada en el sitio oficial se "
        "encuentra vigente y es la fuente válida de la identidad de marca."]))
    a(("p",
       "El primero y el cuarto se cumplieron sin incidencias. El segundo se "
       "cumplió solo parcialmente y es la causa directa de que la migración de "
       "datos iniciales (TCI-62) siga en curso al corte del informe."))
    a(("h3", "5.4.2 Restricciones"))
    a(("lista", [
        "El proyecto se desarrolla en el marco de un periodo académico, con "
        "fecha de cierre determinada e inamovible.",
        "El equipo de desarrollo está conformado por cinco integrantes con "
        "dedicación parcial.",
        "El stack tecnológico fue acordado con el cliente y no se modificará "
        "salvo impedimento técnico justificado.",
        "El despliegue se realiza sobre un servidor privado virtual, por lo "
        "que la capacidad de cómputo disponible constituye un límite de "
        "diseño.",
        "La consulta del historial de un equipo hereda el aislamiento por rol "
        "del sistema: el administrador accede a la totalidad de las órdenes "
        "del activo, mientras que el técnico visualiza únicamente aquellas en "
        "las que intervino."]))

    a(("h2", "5.5 Entregables"))
    a(("tabla", "Entregables del proyecto y estado al cierre",
       ["Entregable", "Descripción", "Momento", "Estado"],
       [["Documento de definición",
         "Alcance, requerimientos e identidad visual aprobados.", "Sprint 1",
         "Entregado"],
        ["Modelo de datos",
         "Diagrama entidad-relación y esquema versionado en migraciones.",
         "Sprint 1", "Entregado"],
        ["Código fuente",
         "Repositorio con historial de versiones y documentación técnica.",
         "Continuo", "Entregado"],
        ["Incremento de producto",
         "Versión desplegable y verificada del sistema.",
         "Cierre de cada Sprint", "Entregado (3 de 3)"],
        ["Sistema en producción",
         "Aplicación desplegada, con dominio, certificado y respaldos "
         "configurados.", "Sprint 3", "Entregado"],
        ["Datos migrados",
         "Clientes y equipos existentes cargados en el sistema.", "Sprint 3",
         "En curso"],
        ["Manual de usuario",
         "Guía de uso para perfil administrador y perfil técnico.", "Sprint 3",
         "Entregado"],
        ["Capacitación",
         "Sesiones de entrenamiento a administradores y a técnicos.",
         "Sprint 3", "Programada"],
        ["Informe final",
         "El presente documento, con la evidencia del desarrollo y los "
         "resultados.", "Sprint 3", "Entregado"]],
       [0.22, 0.42, 0.18, 0.18],
       "Siete de los nueve entregables quedaron completados al corte. Los dos "
       "restantes —migración de datos reales y capacitación— dependen de la "
       "disponibilidad del personal de TCI y están calendarizados para la "
       "semana posterior al cierre académico."))

    # =======================================================================
    # 6. Sprint Backlog
    # =======================================================================
    a(("h1", "6. Sprint Backlog"))
    a(("p",
       "El Sprint Backlog reúne los elementos del Product Backlog "
       "seleccionados para el Sprint en curso junto con el plan de trabajo "
       "necesario para convertirlos en un incremento terminado. A diferencia "
       "del Product Backlog, que pertenece al Product Owner, el Sprint Backlog "
       "es propiedad exclusiva del Equipo de Desarrollo, que lo actualiza a "
       "diario conforme avanza el trabajo (Schwaber &amp; Sutherland, 2020)."))
    a(("p",
       "En este proyecto el Sprint Backlog se materializó en los ciclos "
       "definidos en Plane. Cada elemento comprometido se registra como un "
       "<i>work item</i> con identificador propio, módulo funcional, "
       "prioridad, responsable asignado y estado, y el tablero permite "
       "visualizar en cualquier momento la distribución del trabajo entre las "
       "columnas de pendiente, en progreso y terminado. Las tres tablas "
       "siguientes reproducen el contenido íntegro de cada ciclo al cierre del "
       "proyecto, en el orden de numeración del backlog."))

    a(("figura", "Distribución de los work items por Sprint y estado",
       "avance_sprints",
       "Elaboración propia a partir de los ciclos del proyecto registrados en "
       "Plane al %s. El Sprint 2 concentra el mayor volumen de trabajo porque "
       "absorbió los elementos de construcción que el Sprint 1 no alcanzó a "
       "iniciar y los once elementos incorporados durante el refinamiento."
       % FECHA_CORTE, 468))

    for nombre in ("Sprint 1", "Sprint 2", "Sprint 3"):
        filas = POR_SPRINT[nombre]
        hechos = sum(1 for f in filas if f[4] == "Terminado")
        a(("tabla",
           "Sprint Backlog del %s (%s)" % (nombre, PERIODOS[nombre]),
           ["Clave", "Elemento", "Responsable", "Prioridad", "Estado"],
           [list(f) for f in filas], [0.09, 0.42, 0.22, 0.12, 0.15],
           "%d de %d elementos terminados. Los elementos cuya columna de "
           "responsable aparece con un guion no tienen asignación individual "
           "registrada en el tablero: corresponden a subtareas técnicas de un "
           "elemento padre y al trabajo del Sprint 3, que el equipo asumió de "
           "forma colectiva. La distribución nominal del trabajo se presenta "
           "en el apartado 10.6." % (hechos, len(filas))))

    a(("p",
       "La lectura conjunta de las tres tablas muestra el patrón de ejecución "
       "del proyecto. El Sprint 1 concentró el trabajo de definición —"
       "levantamiento, identidad visual, stack, modelo de datos y máquina de "
       "estados— y solo produjo código en el módulo de autenticación. El "
       "Sprint 2 fue el de mayor carga: absorbió toda la construcción del "
       "núcleo del producto y los once elementos que nacieron del "
       "refinamiento. El Sprint 3 cerró los módulos de automatización e "
       "información y abordó la puesta en producción, que es donde se "
       "concentra lo que quedó abierto."))

    # =======================================================================
    # 7. Evidencias del desarrollo
    # =======================================================================
    a(("h1", "7. Evidencias del Desarrollo"))
    a(("p",
       "Este apartado reúne la evidencia del trabajo realizado. Comprende las "
       "decisiones de arquitectura que sostienen la construcción, la "
       "definición de la identidad visual aplicada a la interfaz, el modelo de "
       "datos derivado del dominio y las capturas del sistema efectivamente "
       "construido. Se presenta aquí y no en un anexo porque constituye la "
       "demostración material de los incrementos declarados en los apartados "
       "anteriores."))

    a(("h2", "7.1 Arquitectura General"))
    a(("p",
       "La solución adopta una arquitectura cliente-servidor desacoplada en "
       "tres capas. La capa de presentación es una aplicación web construida "
       "con Next.js, responsable de la interfaz tanto del panel administrativo "
       "como del panel de campo del técnico. La capa de lógica de negocio es "
       "una interfaz de programación de aplicaciones construida con NestJS, "
       "que concentra las reglas del dominio, la autorización y la generación "
       "automática de órdenes preventivas. La capa de persistencia corresponde "
       "a una base de datos relacional PostgreSQL, cuyo acceso se realiza "
       "exclusivamente a través del mapeador objeto-relacional Prisma."))
    a(("p",
       "El desacoplamiento entre presentación y lógica de negocio responde a "
       "una decisión de diseño con proyección: al exponer la funcionalidad "
       "mediante una interfaz de programación, una eventual aplicación móvil "
       "nativa o un portal para clientes —ambos hoy fuera de alcance— podrían "
       "construirse posteriormente sin reescribir la lógica del negocio."))
    a(("p",
       "La totalidad de los componentes se ejecuta en contenedores, "
       "orquestados mediante Dokploy sobre un servidor privado virtual. Esta "
       "decisión uniforma el comportamiento del sistema entre los ambientes de "
       "desarrollo, prueba y producción, y elimina la clase de incidencias "
       "derivadas de diferencias de configuración entre máquinas. A la "
       "arquitectura de tres capas se suman dos servicios de apoyo que "
       "aparecieron durante la construcción: un almacenamiento de objetos "
       "compatible con S3, donde reside la evidencia fotográfica y la firma de "
       "conformidad, y un servicio de correo saliente para los avisos y el "
       "restablecimiento de contraseña."))
    a(("figura", "Arquitectura general del sistema", "arquitectura",
       "Elaboración propia. Las cifras corresponden al estado del repositorio "
       "al %s. El almacenamiento de objetos se mantiene privado: los archivos "
       "no se sirven por enlace directo sino a través de la interfaz de "
       "programación, que es donde se comprueba el permiso del solicitante."
       % FECHA_CORTE, 468))

    a(("h2", "7.2 Componentes del Stack"))
    a(("tabla", "Componentes del stack tecnológico",
       ["Capa", "Tecnología", "Función en el sistema"],
       [["Presentación", "Next.js 16 (React 19)",
         "Interfaz web del panel administrativo y del panel de técnicos, con "
         "renderizado híbrido y diseño responsivo."],
        ["Lógica de negocio", "NestJS 11 (Node.js)",
         "Interfaz de programación REST, reglas del dominio, autorización por "
         "rol y tareas programadas."],
        ["Acceso a datos", "Prisma 7",
         "Mapeo objeto-relacional, consultas con verificación de tipos y "
         "migraciones versionadas del esquema."],
        ["Persistencia", "PostgreSQL 18",
         "Base de datos relacional del sistema: órdenes, clientes, equipos, "
         "repuestos, usuarios e historial."],
        ["Almacenamiento de objetos", "MinIO (compatible con S3)",
         "Evidencia fotográfica de las órdenes y firma de conformidad del "
         "cliente, en un contenedor privado."],
        ["Correo saliente", "Resend",
         "Avisos por correo de los eventos notificables y enlace de "
         "restablecimiento de contraseña."],
        ["Estilos de interfaz", "Tailwind CSS 4",
         "Construcción de la interfaz mediante clases de utilidad y aplicación "
         "de la paleta institucional definida en el apartado 7.5."],
        ["Autenticación", "Better Auth",
         "Gestión de credenciales, sesiones y verificación de identidad, "
         "integrada con NestJS en el servidor y con Next.js en el cliente, "
         "sobre el mismo esquema administrado por Prisma."],
        ["Pruebas", "Vitest y Supertest",
         "Pruebas unitarias y de extremo a extremo sobre la interfaz de "
         "programación, exigidas por la Definición de Terminado."],
        ["Lenguaje", "TypeScript 5",
         "Lenguaje único en cliente y servidor, con verificación estática de "
         "tipos."],
        ["Empaquetado", "Docker",
         "Contenedores de aplicación y base de datos para garantizar "
         "reproducibilidad entre ambientes."],
        ["Despliegue", "Dokploy sobre servidor privado virtual",
         "Orquestación de contenedores, gestión de dominio, certificado TLS y "
         "respaldos automáticos."],
        ["Control de versiones", "Git",
         "Historial de cambios, ramas por funcionalidad y revisión de código "
         "entre pares."],
        ["Gestión del proyecto", "Plane",
         "Product Backlog, Sprint Backlog, ciclos, módulos y seguimiento del "
         "avance."]],
       [0.20, 0.24, 0.56],
       "Las versiones indicadas corresponden a las efectivamente instaladas en "
       "el repositorio del proyecto al %s. El almacenamiento de objetos y el "
       "correo saliente no figuraban en el stack definido en el Sprint 1: se "
       "incorporaron al construir la carga de evidencia (TCI-43) y las "
       "notificaciones (TCI-54), y ambos se eligieron por ser sustituibles —"
       "MinIO habla el protocolo de S3 y Resend se invoca tras una interfaz "
       "propia— de modo que cambiar de proveedor no obliga a tocar el dominio."
       % FECHA_CORTE))

    a(("h2", "7.3 Justificación de las Decisiones Tecnológicas"))
    a(("h3", "7.3.1 TypeScript como Lenguaje Único"))
    a(("p",
       "Emplear un mismo lenguaje en cliente y servidor permite compartir la "
       "definición de los tipos del dominio entre ambas capas. En un sistema "
       "donde la estructura de la orden de trabajo se manipula en los dos "
       "extremos, esto traslada al momento de compilación errores que de otro "
       "modo se manifestarían en ejecución, y reduce la curva de aprendizaje "
       "para un equipo de cinco integrantes que rota entre tareas de frontend "
       "y backend."))
    a(("h3", "7.3.2 Next.js en la Capa de Presentación"))
    a(("p",
       "Next.js aporta enrutamiento, optimización de recursos y renderizado "
       "del lado del servidor sin configuración adicional. El renderizado en "
       "servidor resulta pertinente para el panel de campo: reduce el trabajo "
       "que debe realizar el navegador del teléfono del técnico y acorta el "
       "tiempo hasta que la información es visible, condición relevante en "
       "escenarios de conectividad móvil limitada."))
    a(("h3", "7.3.3 NestJS en la Capa de Negocio"))
    a(("p",
       "NestJS impone una estructura modular explícita, con separación entre "
       "controladores, servicios y repositorios, e incorpora de forma nativa "
       "inyección de dependencias, guardas de autorización y programación de "
       "tareas. Las guardas resuelven directamente el requerimiento RNF-06, y "
       "el planificador de tareas es el mecanismo que ejecuta la generación "
       "automática de órdenes preventivas exigida por el requerimiento RF-29. "
       "La modularidad del marco favorece además la mantenibilidad requerida "
       "por el requerimiento RNF-09: el sistema quedó organizado en trece "
       "módulos de dominio independientes."))
    a(("h3", "7.3.4 PostgreSQL y Prisma en la Capa de Datos"))
    a(("p",
       "El dominio del problema es marcadamente relacional: un cliente posee "
       "varios equipos, cada equipo acumula múltiples órdenes, cada orden "
       "consume varios repuestos y registra múltiples cambios de estado. Una "
       "base de datos relacional con integridad referencial es la respuesta "
       "natural a esa estructura. PostgreSQL, además, ofrece soporte para "
       "transacciones estrictas, necesarias para operaciones como el descuento "
       "de existencias de repuestos durante el cierre de una orden. Prisma "
       "aporta migraciones versionadas, con lo que satisface el requerimiento "
       "RNF-10, y genera tipos a partir del esquema, lo que refuerza la "
       "coherencia con la capa de negocio."))
    a(("h3", "7.3.5 Docker y Dokploy en el Despliegue"))
    a(("p",
       "La ejecución en contenedores satisface el requerimiento de "
       "portabilidad RNF-11 y permite que cualquier integrante del equipo "
       "levante el entorno completo con una sola instrucción. Dokploy, por su "
       "parte, automatiza sobre el servidor privado virtual la gestión de "
       "despliegues, la emisión y renovación del certificado TLS —exigida por "
       "el requerimiento RNF-05— y la programación de respaldos requerida por "
       "el requerimiento RNF-07, sin incurrir en el costo de una plataforma "
       "administrada de terceros."))

    a(("h2", "7.4 Ambientes de Trabajo"))
    a(("tabla", "Ambientes definidos para el proyecto",
       ["Ambiente", "Propósito", "Origen del despliegue"],
       [["Desarrollo", "Trabajo individual de cada integrante del equipo.",
         "Ejecución local en contenedores."],
        ["Pruebas",
         "Verificación del incremento antes de la Sprint Review y validación "
         "de la Definición de Terminado.",
         "Despliegue automático desde la rama principal."],
        ["Producción", "Operación real de TCI con datos vigentes.",
         "Despliegue manual autorizado desde una versión etiquetada."]],
       [0.18, 0.47, 0.35],
       "El ambiente de pruebas compartido no estuvo disponible hasta el Sprint "
       "3, por depender del mismo servidor privado virtual que la producción. "
       "Durante los Sprints 1 y 2 el criterio de verificación de la Definición "
       "de Terminado se satisfizo sobre entornos locales en contenedores, "
       "idénticos en composición al de producción pero no compartidos. La "
       "retrospectiva del Sprint 2 registró la desviación y el apartado 12 la "
       "recoge como recomendación para proyectos futuros."))

    a(("h2", "7.5 Identidad Visual del Sistema"))
    a(("p",
       "La identidad visual del sistema no se diseñó desde cero: se derivó de "
       "la marca existente de TCI Técnicos de Control Industrial, de modo que "
       "la plataforma fuera percibida por sus usuarios como una extensión "
       "natural de la empresa. Los valores que se presentan a continuación "
       "fueron obtenidos de dos fuentes primarias: el archivo del logotipo "
       "institucional proporcionado por la empresa y las variables de estilo "
       "declaradas en la hoja de estilos del sitio web oficial."))
    a(("h3", "7.5.1 Logotipo"))
    a(("figura", "Aplicaciones del logotipo institucional de TCI", "logo",
       "El logotipo combina un símbolo abstracto en rojo institucional, que "
       "evoca una tubería o conducción industrial, con el acrónimo TCI y el "
       "descriptivo Técnicos de Control Industrial. El archivo proporcionado "
       "por la empresa está construido en blanco sobre fondo oscuro, por lo "
       "que sobre las superficies claras de la interfaz —y de este informe— "
       "se aplica la variante con el texto en negro descrita en el apartado "
       "7.5.4. La variante no es un segundo archivo mantenido aparte: se "
       "deriva del original, de modo que las dos no pueden separarse.", 462))
    a(("h3", "7.5.2 Paleta Cromática"))
    a(("p",
       "El análisis del logotipo arroja un rojo institucional de valor "
       "#C61D19, mientras que la hoja de estilos del sitio oficial declara ese "
       "mismo color bajo la variable --rojo-vino con valor #C61D1A. La "
       "diferencia de una unidad en el canal azul es imperceptible y se "
       "atribuye a la compresión del mapa de bits; se adoptó como valor "
       "normativo el declarado en la hoja de estilos, por tratarse de la "
       "fuente de mayor autoridad."))
    a(("figura", "Paleta cromática institucional aplicada al sistema",
       "paleta",
       "El rojo oscuro no forma parte de la marca original; se propuso como "
       "color derivado para estados de interacción —por ejemplo, un botón "
       "presionado— manteniendo la coherencia con el rojo institucional.",
       462))
    a(("tabla", "Definición y uso de la paleta cromática",
       ["Color", "Hexadecimal", "RGB", "Uso previsto en el sistema"],
       [["Rojo institucional", "#C61D1A", "198, 29, 26",
         "Color de acento de la marca: acciones primarias, encabezados "
         "destacados, elementos activos de navegación y estado de prioridad "
         "crítica."],
        ["Rojo oscuro", "#8E1512", "142, 21, 18",
         "Estados de interacción del color primario: cursor sobre el elemento "
         "y elemento presionado."],
        ["Negro", "#000000", "0, 0, 0",
         "Texto principal, encabezados y fondo del bloque institucional del "
         "logotipo."],
        ["Gris texto", "#333333", "51, 51, 51",
         "Texto secundario, descripciones y contenido de apoyo."],
        ["Gris fondo", "#F8F9FA", "248, 249, 250",
         "Fondos de sección, filas alternas de tablas y tarjetas de "
         "contenido."],
        ["Gris línea", "#E0E0E0", "224, 224, 224",
         "Bordes, separadores y divisiones de tabla."],
        ["Blanco", "#FFFFFF", "255, 255, 255",
         "Fondo general de la aplicación y texto sobre superficies de color "
         "sólido."]],
       [0.18, 0.14, 0.15, 0.53],
       "Los tres primeros valores corresponden a las variables declaradas en "
       "la hoja de estilos del sitio oficial de TCI; los grises se extrajeron "
       "de los valores efectivamente utilizados en el mismo archivo."))
    a(("h3", "7.5.3 Tipografía"))
    a(("p",
       "El sitio institucional de TCI aplica de forma uniforme la familia "
       "Arial, con Helvetica y la genérica sans-serif como alternativas de "
       "respaldo. El sistema adoptó esa misma pila tipográfica, con lo que se "
       "garantiza continuidad visual con la marca y, simultáneamente, "
       "disponibilidad nativa en la práctica totalidad de los dispositivos, "
       "sin necesidad de descargar archivos de fuente. Esta última "
       "consideración no es menor en un producto destinado a usarse desde "
       "teléfonos móviles en planta, donde la conectividad puede ser "
       "limitada."))
    a(("tabla", "Escala tipográfica de la interfaz",
       ["Nivel", "Tamaño", "Peso", "Aplicación"],
       [["Título de pantalla", "24 px", "Negrita",
         "Encabezado principal de cada vista."],
        ["Título de sección", "18 px", "Negrita",
         "Agrupaciones dentro de una vista y encabezados de tarjeta."],
        ["Subtítulo", "16 px", "Media",
         "Etiquetas de campo destacadas y encabezados de tabla."],
        ["Cuerpo", "14 px", "Normal",
         "Texto general, contenido de formularios y celdas de tabla."],
        ["Texto de apoyo", "12 px", "Normal",
         "Notas al pie, marcas temporales y textos de ayuda."]],
       [0.24, 0.13, 0.13, 0.50],
       "Familia tipográfica: Arial, Helvetica, sans-serif, conforme al "
       "estándar visual del sitio institucional. La escala se revisó en el "
       "Sprint 3 al ejecutar el rediseño de la interfaz (TCI-86), que ajustó "
       "la jerarquía vertical del panel sin alterar los valores aquí "
       "declarados."))
    a(("h3", "7.5.4 Lineamientos de Aplicación"))
    a(("lista", [
        "<b>Uso del rojo institucional.</b> El rojo se reserva para acentos y "
        "acciones primarias. No debe emplearse como fondo de superficies "
        "extensas, ya que su alta saturación compite con el contenido y fatiga "
        "la lectura prolongada.",
        "<b>Variante del logotipo.</b> El archivo institucional está "
        "construido en blanco sobre fondo oscuro. Para su aplicación sobre las "
        "superficies claras de la interfaz se utiliza una variante con el "
        "texto en negro, conservando el símbolo en rojo institucional. Esa "
        "variante no se reduce por debajo de cuarenta píxeles de altura: por "
        "debajo de esa medida el descriptivo deja de ser legible.",
        "<b>Área de protección.</b> Se reserva alrededor del logotipo un "
        "margen libre equivalente a la altura de la letra T del acrónimo, sin "
        "texto ni elementos gráficos.",
        "<b>Jerarquía visual.</b> La información crítica de una orden —estado, "
        "prioridad y técnico asignado— debe ser identificable sin necesidad de "
        "abrir el detalle del registro.",
        "<b>Codificación de estados.</b> El color no es el único portador de "
        "significado en la representación de los estados de una orden; siempre "
        "se acompaña de etiqueta textual, en atención al criterio de "
        "accesibilidad establecido en el requerimiento RNF-14.",
        "<b>Densidad de la interfaz de campo.</b> El panel del técnico "
        "prioriza elementos táctiles amplios y contraste elevado, considerando "
        "su uso en planta, con iluminación variable y eventualmente con "
        "guantes."]))
    a(("h3", "7.5.5 Verificación de Contraste"))
    a(("p",
       "La relación de contraste entre el rojo institucional #C61D1A y el "
       "blanco es de aproximadamente 5.8:1. Este valor supera el mínimo de "
       "4.5:1 que las pautas WCAG 2.1 exigen para texto normal en nivel AA, "
       "por lo que la combinación de texto blanco sobre rojo institucional "
       "resulta apta para botones, encabezados y etiquetas (World Wide Web "
       "Consortium, 2018). En cambio, la combinación de rojo institucional "
       "sobre negro alcanza aproximadamente 3.6:1, insuficiente para texto de "
       "tamaño normal; su uso se restringió a elementos gráficos y a texto de "
       "gran tamaño."))

    # -----------------------------------------------------------------------
    # 7.6 Modelo de datos y ciclo de vida de la orden
    # -----------------------------------------------------------------------
    a(("h2", "7.6 Modelo de Datos y Ciclo de Vida de la Orden"))
    a(("p",
       "El modelo de datos se derivó del dominio levantado con la gerencia y "
       "quedó plasmado en un esquema relacional de %d entidades y %d "
       "enumeraciones, aplicado sobre la base de datos mediante %d migraciones "
       "versionadas. Esta sección presenta primero la estructura general, "
       "después la entidad central y sus tablas satélite, y finalmente la "
       "máquina de estados que gobierna el ciclo de vida de la orden."
       % (INDICADORES["modelos"], INDICADORES["enums"],
          INDICADORES["migraciones"])))

    a(("h3", "7.6.1 Diagrama Entidad-Relación"))
    a(("figura", "Modelo entidad-relación del sistema", "modelo_datos",
       "Elaboración propia a partir del esquema versionado del repositorio. "
       "Por legibilidad se omiten las cuatro entidades propias del proveedor "
       "de autenticación —sesión, cuenta, verificación y limitador de "
       "peticiones— y las tres de configuración de notificaciones, que no "
       "participan en el núcleo del dominio. Las entidades sombreadas en gris "
       "son catálogos y actores del sistema; las sombreadas en rojo son "
       "transaccionales, y la orden de trabajo, en rojo oscuro, es la entidad "
       "central.", 468))
    a(("p",
       "La lectura del diagrama parte del cliente. Un cliente tiene varias "
       "sedes y varios equipos; cada equipo pertenece a una sede y a un tipo "
       "de equipo, y ese tipo es el que permite que un plan de mantenimiento "
       "aplique a un conjunto de activos sin enumerarlos. En el centro, la "
       "orden de trabajo referencia al cliente, a la sede, al equipo, al tipo "
       "de mantenimiento, al técnico asignado, al usuario que la creó y, "
       "cuando nació de la automatización preventiva, al plan que la generó."))
    a(("p",
       "Dos decisiones de modelado merecen explicación. La primera es que el "
       "tipo de equipo se convirtió en catálogo y dejó de ser texto libre: un "
       "plan preventivo colgado de una cadena de texto se rompe en silencio "
       "ante un plural o una tilde, y los equipos con el tipo mal escrito "
       "quedan sin plan sin que nadie se entere. Al ser una clave foránea, el "
       "problema desaparece por construcción. La segunda es que el tipo de "
       "mantenimiento sí es catálogo editable mientras que los eventos "
       "notificables son una enumeración de código: un tipo de mantenimiento "
       "es contenido que la empresa administra, pero un evento solo existe si "
       "hay una línea de código que lo emite, de modo que permitir crearlos "
       "por pantalla únicamente habilitaría inventar avisos que nunca se "
       "disparan."))

    a(("h3", "7.6.2 La Entidad Orden de Trabajo y sus Tablas Satélite"))
    a(("p",
       "La orden de trabajo es la entidad central del sistema y la única que "
       "concentra atributos de las cinco dimensiones del dominio: "
       "identificación, clasificación, relación, tiempo y costo. Los campos de "
       "costo —mano de obra, repuestos, total y moneda— se persisten desde la "
       "primera versión aunque el costeo integral del servicio esté fuera de "
       "alcance, por la razón expuesta en el apartado 5.2: reservar la "
       "estructura hoy evita una migración de datos históricos mañana."))
    a(("tabla", "Tablas satélite de la orden de trabajo",
       ["Tabla", "Qué guarda", "Regla de integridad"],
       [["Historial de la orden",
         "Cada cambio de estado, asignación, comentario, edición y operación "
         "sobre la evidencia, con usuario y marca temporal.",
         "Solo permite añadir. No se edita ni se borra ninguna fila, lo que "
         "satisface el requerimiento RNF-08."],
        ["Adjuntos de la orden",
         "Evidencia fotográfica anterior y posterior a la intervención, "
         "documentos y firma de conformidad del cliente.",
         "Guarda la clave del objeto en el almacenamiento privado, no una "
         "dirección pública: el archivo solo se sirve tras comprobar el "
         "permiso del solicitante."],
        ["Lista de verificación de la orden",
         "Las comprobaciones que corresponden al tipo de mantenimiento, con su "
         "marca, su nota y quién la marcó.",
         "El texto se copia de la plantilla al crear la orden. Una orden "
         "cerrada es un documento y no puede cambiar porque alguien reescriba "
         "la plantilla después."],
        ["Repuestos de la orden",
         "Qué repuestos se consumieron y en qué cantidad, con su costo "
         "unitario.",
         "El costo unitario se congela al imputarlo: el precio del catálogo "
         "cambia, pero el costo de una orden cerrada no puede moverse por "
         "detrás. Una sola línea por repuesto y orden."],
        ["Movimientos de inventario",
         "El libro de entradas y salidas de almacén, con el saldo resultante "
         "de cada asiento.",
         "Solo permite añadir. El saldo del repuesto y el asiento se escriben "
         "dentro de la misma transacción, por un único camino de código, para "
         "que no puedan separarse."]],
       [0.24, 0.38, 0.38],
       "Elaboración propia a partir del esquema del repositorio. Las tres "
       "tablas de solo-adición —historial, movimientos y, en la práctica, "
       "adjuntos de una orden cerrada— son las que sostienen la trazabilidad "
       "que motivó el proyecto."))

    a(("h3", "7.6.3 Ciclo de Vida de la Orden"))
    a(("p",
       "La orden de trabajo recorre seis estados. Cuatro son de trabajo "
       "—pendiente, asignada, en proceso y en espera— y dos son finales, "
       "completada y cancelada. El estado <i>en espera</i> no figuraba en la "
       "definición tentativa del elemento TCI-78 y se incorporó al "
       "modelarlo: el tiempo muerto por falta de repuesto, por acceso al sitio "
       "o por aprobación del cliente es común en campo y, si no se separa, "
       "contamina el tiempo de resolución que después se reporta en el tablero "
       "de indicadores."))
    a(("figura", "Máquina de estados de la orden de trabajo", "maquina_estados",
       "Elaboración propia. Cualquier combinación de origen y destino que no "
       "aparezca en el diagrama es inválida y la interfaz de programación la "
       "rechaza con el código 422. El estado no se cambia con una "
       "actualización genérica del registro: cada transición tiene su propia "
       "operación, lo que da un punto único donde validar, auditar y "
       "notificar.", 468))
    a(("tabla", "Transiciones permitidas y rol autorizado",
       ["Origen", "Destino", "Acción", "Quién puede", "Exige"],
       [["Pendiente", "Asignada", "asignar", "Administrador", "Técnico"],
        ["Pendiente", "Cancelada", "cancelar", "Administrador", "Motivo"],
        ["Asignada", "En proceso", "iniciar", "Técnico asignado o administrador", "—"],
        ["Asignada", "Asignada", "reasignar", "Administrador", "Técnico"],
        ["Asignada", "Pendiente", "desasignar", "Administrador", "—"],
        ["Asignada", "Cancelada", "cancelar", "Administrador", "Motivo"],
        ["En proceso", "En espera", "pausar", "Técnico asignado o administrador", "Motivo"],
        ["En proceso", "Completada", "completar", "Técnico asignado o administrador", "Trabajo realizado"],
        ["En proceso", "Cancelada", "cancelar", "Administrador", "Motivo"],
        ["En espera", "En proceso", "reanudar", "Técnico asignado o administrador", "—"],
        ["En espera", "Cancelada", "cancelar", "Administrador", "Motivo"],
        ["Completada", "En proceso", "reabrir", "Solo administrador", "Motivo"],
        ["Cancelada", "—", "—", "Sin salida: se crea una orden nueva", "—"]],
       [0.14, 0.14, 0.14, 0.38, 0.20],
       "La máquina de estados reside en el servidor, en un único servicio de "
       "dominio. La interfaz solo dibuja los botones de las transiciones "
       "permitidas para el estado y el rol actuales; nunca decide la validez, "
       "que se comprueba siempre del lado del servidor conforme al "
       "requerimiento RNF-06. Un técnico solo puede operar las órdenes en las "
       "que figura como asignado, condición que se verifica en el servicio y "
       "no únicamente en la guarda de rol."))
    a(("p",
       "Tres reglas adicionales completan el gobierno del ciclo. Primera: toda "
       "transición escribe en el historial el usuario, el momento, el estado "
       "anterior, el nuevo y el motivo cuando lo hay. Segunda: las marcas de "
       "tiempo derivadas —fecha de asignación, de inicio y de fin— las fija la "
       "máquina de estados y no el usuario, de modo que los indicadores del "
       "apartado de reportes se calculan sobre datos que nadie escribió a "
       "mano. Tercera: la evidencia de una orden completada o cancelada no "
       "puede modificarse, ni siquiera por un administrador; para corregirla "
       "hay que reabrir la orden, y esa reapertura queda registrada."))
    a(("p",
       "Sobre esa base, el tablero de indicadores calcula el tiempo de "
       "respuesta como la diferencia entre el inicio y la asignación, y el "
       "tiempo de resolución como la diferencia entre el fin y el inicio menos "
       "el tiempo acumulado en espera, que se obtiene recorriendo el "
       "historial. Es precisamente el motivo por el que el estado <i>en "
       "espera</i> se separó del estado <i>en proceso</i>."))

    # -----------------------------------------------------------------------
    # 7.7 Capturas
    # -----------------------------------------------------------------------
    a(("h2", "7.7 Capturas del Sistema Construido"))
    a(("p",
       "Las capturas siguientes documentan el sistema en funcionamiento al "
       "cierre del proyecto. Corresponden a una instancia con datos de prueba: "
       "ni los clientes, ni los equipos, ni las órdenes que aparecen "
       "corresponden a operaciones reales de TCI, por razones de "
       "confidencialidad comercial de la empresa y de sus clientes."))
    CAPTURAS = [
        ("login", "Pantalla de acceso al sistema",
         "El acceso aplica la identidad visual descrita en el apartado 7.5: "
         "logotipo en su variante para fondo claro y rojo institucional como "
         "color de la acción primaria. No existe enlace de registro, conforme "
         "a la decisión de la gerencia recogida en el requerimiento RF-14. El "
         "número de intentos está limitado desde el servidor y el contador "
         "sobrevive al reinicio del proceso, de modo que no basta con provocar "
         "un redespliegue para ponerlo a cero."),
        ("panel", "Listado de órdenes de trabajo",
         "Vista principal del panel administrativo. Cada fila muestra sin "
         "abrir el detalle la información crítica de la orden —número, "
         "estado, prioridad, cliente, equipo y técnico asignado—, conforme al "
         "lineamiento de jerarquía visual del apartado 7.5.4. El estado se "
         "representa con etiqueta textual además de color, en cumplimiento del "
         "requerimiento RNF-14."),
        ("clientes", "Administración de clientes",
         "Registro de clientes con sus datos de contacto y sus sedes. Desde "
         "cada cliente se accede a los equipos instalados en cada una de sus "
         "plantas. El listado pagina y admite búsqueda, conforme al "
         "requerimiento RF-18."),
        ("equipos", "Ficha de equipo e historial de intervenciones",
         "Cada activo conserva su historial completo de órdenes, que es la "
         "respuesta directa al tercero de los cuatro efectos operativos "
         "identificados en el apartado 2.1. La consulta respeta el aislamiento "
         "por rol: el administrador ve la totalidad de las órdenes del equipo "
         "y el técnico únicamente aquellas en las que intervino."),
        ("preventivo", "Planes de mantenimiento preventivo",
         "Cada plan define a qué tipo de equipo aplica, con qué frecuencia, "
         "con cuántos días de anticipación se avisa y con qué prioridad nacen "
         "las órdenes que genera. El vencimiento se cuenta desde el último "
         "cierre real y no desde un calendario fijo, decisión adoptada con el "
         "cliente el 26 de agosto de 2026 para que el plan refleje el estado "
         "de la máquina y no acumule órdenes atrasadas."),
        ("calendario", "Calendario de mantenimientos programados",
         "Vista mensual de lo programado, que satisface el requerimiento "
         "RF-30. Es la herramienta con la que supervisión distribuye la carga "
         "del periodo antes de que las órdenes se generen."),
        ("repuestos", "Inventario de repuestos y movimientos",
         "Catálogo con existencia actual y mínima por repuesto. El saldo y el "
         "asiento del libro de movimientos se escriben en la misma "
         "transacción, por un único camino de código, de modo que no pueden "
         "separarse. Los repuestos por debajo del mínimo generan el aviso "
         "exigido por el requerimiento RF-26."),
        ("reportes", "Tablero de indicadores y reportes",
         "Indicadores del periodo, reparto de órdenes por estado, prioridad y "
         "tipo, y desempeño por técnico con horas y costo. Cubre los "
         "requerimientos RF-37 y RF-39, y admite exportación a PDF y a hoja de "
         "cálculo conforme al requerimiento RF-38."),
        ("usuarios", "Administración de usuarios",
         "Alta, edición y desactivación de cuentas con su rol, conforme al "
         "requerimiento RF-14. Es también la vía operativa vigente para "
         "restablecer una contraseña mientras no se complete la verificación "
         "del dominio de correo descrita en el apartado 10.2."),
    ]
    for archivo, titulo, nota in CAPTURAS:
        a(("figura", titulo, "captura:" + archivo, nota, 340))

    # =======================================================================
    # 8. Sprint Review
    # =======================================================================
    a(("h1", "8. Sprint Review"))
    a(("p",
       "La Sprint Review es el evento de inspección del incremento. En él, el "
       "Equipo de Desarrollo presenta a los interesados el trabajo terminado, "
       "se contrasta lo alcanzado contra la meta comprometida y se recoge la "
       "retroalimentación que alimentará el Product Backlog (Schwaber &amp; "
       "Sutherland, 2020). No es una demostración ceremonial sino una sesión "
       "de trabajo cuyo producto es la adaptación del plan."))
    a(("p",
       "Se celebraron tres revisiones, una al cierre de cada Sprint, con "
       "participación del gerente de TCI en calidad de interesado principal. "
       "Lo que sigue resume, para cada una, la meta comprometida, el resultado "
       "frente a esa meta, lo que quedó pendiente con su razón y la "
       "retroalimentación recibida. La reconstrucción se apoya en tres "
       "fuentes documentales: los ciclos y el estado de los elementos "
       "registrados en Plane, el historial del repositorio, y las decisiones "
       "de producto fechadas que quedaron consignadas en la documentación "
       "técnica del proyecto."))

    a(("h2", "8.1 Sprint Review 1"))
    a(("tabla", "Revisión del Sprint 1 (%s)" % PERIODOS["Sprint 1"],
       ["Dimensión", "Resultado"],
       [["Meta comprometida",
         "Disponer del ciclo completo de la orden de trabajo con control de "
         "acceso por rol."],
        ["Elementos comprometidos", "9"],
        ["Elementos terminados", "9 (100 %)"],
        ["Meta alcanzada",
         "Parcialmente. Se completó el descubrimiento, se cerró el diseño del "
         "modelo de datos de la orden y de su máquina de estados, y se definió "
         "el esquema de roles y el inicio de sesión. El ciclo de la orden "
         "quedó especificado y aprobado, pero no construido: la implementación "
         "del CRUD y de la guarda de autorización se trasladó al Sprint 2."],
        ["Incremento presentado",
         "Documento de definición del proyecto aprobado por la gerencia, "
         "esquema de datos de la orden, tabla de transiciones de estado y "
         "definición de los dos roles del sistema."],
        ["Pendiente y razón",
         "El repositorio se inicializó el 20 de agosto —primer día del Sprint "
         "2—, de modo que ningún incremento de código llegó a la rama "
         "principal dentro de la ventana del Sprint 1. La causa fue la "
         "dedicación del ciclo al descubrimiento, más extenso de lo previsto "
         "por la necesidad de acordar con el cliente la nomenclatura de "
         "equipos y el flujo real de aprobación."],
        ["Retroalimentación de la gerencia",
         "Se confirmó que el sistema no tendrá registro público de usuarios y "
         "que el alta de cuentas es una operación administrativa (decisión del "
         "22 de agosto de 2026, incorporada al requerimiento RF-14). Se validó "
         "la máquina de estados propuesta, incluida la incorporación del "
         "estado <i>en espera</i> que el equipo había añadido a la lista "
         "tentativa original."]],
       [0.26, 0.74],
       "El desfase entre lo comprometido y lo construido en el Sprint 1 es el "
       "hallazgo principal de esta revisión y el punto de partida de la "
       "retrospectiva correspondiente (apartado 9.1)."))

    a(("h2", "8.2 Sprint Review 2"))
    a(("tabla", "Revisión del Sprint 2 (%s)" % PERIODOS["Sprint 2"],
       ["Dimensión", "Resultado"],
       [["Meta comprometida",
         "Incorporar la base de clientes y equipos y habilitar la operación "
         "del técnico en campo."],
        ["Elementos comprometidos", "32"],
        ["Elementos terminados", "32 (100 %)"],
        ["Meta alcanzada",
         "Sí, y con exceso. Además de los módulos de clientes y equipos, panel "
         "de técnicos e inventario, el Sprint absorbió la construcción del "
         "ciclo de la orden arrastrada del Sprint 1 y los once elementos "
         "nacidos del refinamiento."],
        ["Incremento presentado",
         "Sistema funcional con órdenes de trabajo operables de extremo a "
         "extremo, autorización por rol en el servidor, catálogo de clientes "
         "con sedes, inventario de equipos, panel responsivo del técnico con "
         "carga de evidencia fotográfica, y catálogo de repuestos con consumo "
         "imputado a la orden."],
        ["Pendiente y razón",
         "Ninguno de los elementos comprometidos. Quedaron abiertas dos "
         "decisiones de producto: si la evidencia fotográfica debe ser "
         "obligatoria para cerrar una orden —hoy no lo es, por acuerdo del 25 "
         "de agosto de 2026, ante el riesgo de que un técnico sin cobertura no "
         "pueda cerrar— y si el técnico debe ver el historial completo del "
         "equipo o solo sus propias intervenciones."],
        ["Retroalimentación de la gerencia",
         "La sesión generó cinco elementos nuevos, todos aceptados e "
         "implementados dentro del mismo Sprint: firma de conformidad del "
         "cliente al cerrar la orden (TCI-84), listas de verificación por tipo "
         "de mantenimiento (TCI-80), visibilidad de la carga de trabajo del "
         "técnico al asignar (TCI-81), vista de calendario de las órdenes "
         "programadas (TCI-82) y aviso de orden vencida (TCI-88). Se acordó "
         "además que el vencimiento de un plan preventivo se cuente desde el "
         "último cierre real y no desde un calendario fijo (decisión del 26 de "
         "agosto de 2026)."]],
       [0.26, 0.74],
       "La firma de conformidad figuraba como exclusión expresa en la "
       "planificación (apartado 5.2). Se aceptó porque su costo de "
       "implementación resultó marginal al reutilizar el mecanismo de "
       "adjuntos, y porque resuelve directamente la dimensión comercial de la "
       "justificación del proyecto."))

    a(("h2", "8.3 Sprint Review 3"))
    a(("tabla", "Revisión del Sprint 3 (%s)" % PERIODOS["Sprint 3"],
       ["Dimensión", "Resultado"],
       [["Meta comprometida",
         "Completar la automatización preventiva, la información de gestión y "
         "la puesta en producción."],
        ["Elementos comprometidos", "25"],
        ["Elementos terminados",
         "18 (72 %); 4 en progreso y 3 pendientes."],
        ["Meta alcanzada",
         "En sus dos primeros tercios, sí: los módulos de mantenimiento "
         "preventivo, notificaciones y reportes quedaron cerrados por "
         "completo, y el sistema está desplegado en producción con dominio "
         "propio y certificado válido. El tercio de adopción —migración de "
         "datos reales, capacitación y acompañamiento— no se completó."],
        ["Incremento presentado",
         "Planes preventivos que generan órdenes por sí solos, calendario de "
         "programación, avisos anticipados, sistema de notificaciones con "
         "configuración por evento y por rol, tablero de indicadores, reportes "
         "por técnico y periodo con exportación, y la aplicación desplegada y "
         "accesible por HTTPS."],
        ["Pendiente y razón",
         "Siete elementos. Cuatro dependen de la disponibilidad del personal "
         "de TCI —migración de datos iniciales (TCI-62), pruebas finales con "
         "datos reales (TCI-63) y capacitación a administradores y técnicos "
         "(TCI-64 y TCI-65)—; uno depende de la verificación del dominio de "
         "correo ante el proveedor, que es gestión del cliente (TCI-34); uno "
         "es la verificación periódica de los respaldos, cuyos guiones existen "
         "y se ejecutan pero cuya rutina programada no se ha observado durante "
         "un ciclo completo (TCI-71); y el último, el acompañamiento posterior "
         "al lanzamiento (TCI-67), es por definición posterior al cierre del "
         "periodo académico."],
        ["Retroalimentación de la gerencia",
         "Se aceptó el incremento y se acordó calendario para las sesiones de "
         "capacitación en la semana siguiente al cierre académico. La gerencia "
         "señaló como prioridad de una eventual fase dos el costeo integral "
         "del servicio, sobre la base de los campos de costo que el modelo de "
         "datos ya reserva."]],
       [0.26, 0.74],
       "Ninguno de los siete elementos abiertos corresponde a funcionalidad de "
       "producto sin construir: los nueve módulos de producto están cerrados. "
       "Lo pendiente pertenece íntegramente al módulo 10, de implementación y "
       "adopción, y su ruta crítica está fuera del control del equipo de "
       "desarrollo."))

    # =======================================================================
    # 9. Sprint Retrospective
    # =======================================================================
    a(("h1", "9. Sprint Retrospective"))
    a(("p",
       "La Sprint Retrospective cierra el Sprint y desplaza la inspección del "
       "producto al proceso: el equipo examina cómo trabajó durante el ciclo e "
       "identifica los ajustes que incorporará en el siguiente. Su valor "
       "depende de que las mejoras acordadas se traduzcan en acciones "
       "concretas y verificables (Schwaber &amp; Sutherland, 2020). Por esa "
       "razón, cada retrospectiva de este proyecto cerró con un número "
       "limitado de acuerdos, cada uno con responsable, y la retrospectiva "
       "siguiente comenzó verificando si se habían aplicado."))

    a(("h2", "9.1 Retrospectiva del Sprint 1"))
    a(("tabla", "Retrospectiva del Sprint 1",
       ["Qué funcionó", "Qué no funcionó", "Acuerdo de mejora", "Responsable"],
       [["El levantamiento con el cliente fue exhaustivo y produjo un modelo "
         "de datos y una máquina de estados que no hubo que rehacer después: "
         "las seis transiciones definidas en el Sprint 1 siguen vigentes al "
         "cierre del proyecto.",
         "El Sprint terminó sin código en la rama principal. La fase de "
         "definición consumió la totalidad del ciclo y la meta comprometida "
         "—disponer del ciclo de la orden— se interpretó como definirlo y no "
         "como construirlo.",
         "Separar en la redacción de la meta de Sprint lo que se define de lo "
         "que se construye, y no comprometer en una misma meta ambas cosas.",
         "Product Owner"],
        ["La decisión de documentar cada acuerdo de producto con su fecha en "
         "el propio repositorio evitó discusiones posteriores sobre lo "
         "acordado.",
         "El tablero arrancó con elementos de tamaño muy desigual: unos "
         "describían una decisión y otros un módulo entero.",
         "Refinar antes de planificar: ningún elemento entra a un Sprint si no "
         "cabe en el ciclo, y los que no caben se parten.",
         "Scrum Master"],
        ["—",
         "No existía ambiente de pruebas compartido, por lo que el sexto "
         "criterio de la Definición de Terminado no podía verificarse.",
         "Levantar el entorno en contenedores de forma que cualquier "
         "integrante reproduzca el sistema completo con una instrucción, como "
         "paso previo al ambiente compartido.",
         "Equipo de Desarrollo"]],
       [0.27, 0.27, 0.30, 0.16],
       "Los tres acuerdos se aplicaron en el Sprint 2. El primero se verifica "
       "en la redacción de la meta del Sprint 2, que habla de <i>habilitar la "
       "operación</i> y no de definirla; el segundo, en la partición del "
       "elemento TCI-23 en cuatro subtareas de endpoint; el tercero, en la "
       "composición de contenedores de desarrollo incorporada al repositorio."))

    a(("h2", "9.2 Retrospectiva del Sprint 2"))
    a(("tabla", "Retrospectiva del Sprint 2",
       ["Qué funcionó", "Qué no funcionó", "Acuerdo de mejora", "Responsable"],
       [["La suite de pruebas de extremo a extremo del módulo de órdenes "
         "permitió reescribir la cabecera de la orden y el flujo de evidencia "
         "sin introducir regresiones. Fue la inversión de mayor retorno del "
         "Sprint.",
         "El trabajo de interfaz móvil se abordó al final y obligó a una "
         "revisión completa: áreas seguras, escala del texto, zoom al enfocar "
         "un campo y rebote del desplazamiento. Probar en teléfono al final "
         "convirtió en retrabajo lo que era ajuste.",
         "Verificar cada pantalla en teléfono antes de darla por terminada, no "
         "al cierre del Sprint.",
         "Equipo de Desarrollo"],
        ["El refinamiento semanal absorbió los cinco elementos nuevos que "
         "pidió la gerencia sin desplazar ninguno de los comprometidos.",
         "Dos pruebas de extremo a extremo resultaron inestables por depender "
         "del correlativo de numeración de órdenes, y hubo que estabilizarlas "
         "dos veces.",
         "Ninguna prueba puede depender de un dato compartido entre casos; "
         "cada caso construye lo que necesita.",
         "Equipo de Desarrollo"],
        ["La documentación técnica se escribió junto al código y no después, "
         "lo que permitió que este informe se apoye en decisiones fechadas y "
         "no en recuerdos.",
         "El ambiente de pruebas compartido seguía sin existir y la "
         "verificación se hizo sobre entornos locales, con lo que el sexto "
         "criterio de la Definición de Terminado se cumplió solo en "
         "sustancia.",
         "Priorizar el despliegue del ambiente de pruebas al inicio del Sprint "
         "3, antes que cualquier funcionalidad.",
         "Scrum Master"]],
       [0.27, 0.27, 0.30, 0.16],
       "El tercer acuerdo se cumplió: el despliegue (TCI-61) fue el primer "
       "elemento abordado en el Sprint 3, y la guía de despliegue del "
       "repositorio se escribió antes que el resto del trabajo del ciclo."))

    a(("h2", "9.3 Retrospectiva del Sprint 3"))
    a(("tabla", "Retrospectiva del Sprint 3",
       ["Qué funcionó", "Qué no funcionó", "Acuerdo de mejora", "Responsable"],
       [["Adelantar el despliegue al inicio del ciclo reveló tres bloqueos "
         "—generación del cliente de la base de datos dentro del contenedor, "
         "variables de entorno de compilación y la dependencia entre dominio y "
         "certificado— que al final del proyecto habrían sido críticos.",
         "Las actividades que dependen del cliente —migración de datos, "
         "capacitación, verificación del dominio de correo— se planificaron "
         "todas en el último Sprint, sin holgura y sin alternativa si el "
         "cliente no estaba disponible.",
         "Las dependencias externas se identifican en la planificación inicial "
         "y se programan con al menos un Sprint de holgura.",
         "Product Owner"],
        ["La revisión de rendimiento detectó y eliminó tres consultas "
         "repetidas en el módulo preventivo y añadió paginación a la bandeja "
         "de notificaciones antes de que el volumen las convirtiera en un "
         "problema.",
         "Los servicios que dependen de configuración externa —correo, "
         "almacenamiento de objetos— se integraron tarde, y obligaron a "
         "diseñar sobre la marcha un comportamiento razonable para el caso de "
         "no estar configurados.",
         "Todo servicio externo se integra desde el primer día con una "
         "implementación que registre y no falle, para que su ausencia nunca "
         "bloquee el desarrollo.",
         "Equipo de Desarrollo"],
        ["El trabajo quedó documentado de forma que un tercero puede "
         "reproducirlo: guía de despliegue, manual de usuario, modelo de datos "
         "y flujo de la orden están versionados junto al código.",
         "La asignación nominal de responsables en el tablero se abandonó en "
         "el Sprint 3: veintisiete de los sesenta y seis elementos carecen de "
         "responsable registrado, lo que dificulta reconstruir quién hizo qué.",
         "Mantener la asignación nominal hasta el cierre, aunque el trabajo se "
         "haga en pareja o de forma colectiva.",
         "Scrum Master"]],
       [0.27, 0.27, 0.30, 0.16],
       "Los tres acuerdos de esta retrospectiva quedan como aprendizaje "
       "transferible a proyectos futuros, al coincidir el cierre del Sprint 3 "
       "con el del proyecto. El apartado 12 los recoge como recomendaciones."))

    a(("p",
       "Leídas en conjunto, las tres retrospectivas describen una misma curva "
       "de aprendizaje: el equipo fue desplazando hacia el principio del ciclo "
       "aquello que descubrió que era caro descubrir tarde —el despliegue, la "
       "verificación en móvil, la integración de servicios externos y las "
       "dependencias del cliente—. Ese desplazamiento es, en términos de "
       "Scrum, exactamente el producto que la retrospectiva debe generar: no "
       "una lista de quejas, sino un cambio verificable en la forma de "
       "trabajar del siguiente ciclo."))

    # =======================================================================
    # 10. Resultados obtenidos
    # =======================================================================
    a(("h1", "10. Resultados Obtenidos"))
    a(("p",
       "Este apartado consolida el estado del producto y del proyecto al corte "
       "del periodo académico, fijado en el %s. Presenta el avance del Product "
       "Backlog, el estado por módulo funcional, el cumplimiento de los "
       "objetivos específicos y de los requerimientos no funcionales, los "
       "indicadores del repositorio y el contraste entre lo planificado y lo "
       "entregado." % FECHA_CORTE))

    a(("h2", "10.1 Avance del Product Backlog"))
    a(("p",
       "El Product Backlog cerró con %d elementos. De ellos, %d se encuentran "
       "terminados, lo que representa un %s del total; %d permanecen en "
       "progreso y %d pendientes. La totalidad de los elementos abiertos "
       "pertenece al módulo 10, de implementación, despliegue y capacitación."
       % (RESUMEN_PLANE["total"], RESUMEN_PLANE["hechos"],
          _pct(RESUMEN_PLANE["hechos"], RESUMEN_PLANE["total"]),
          RESUMEN_PLANE["curso"], RESUMEN_PLANE["pendientes"])))
    a(("tabla", "Avance por módulo funcional",
       ["Módulo funcional", "Terminados", "Total", "Avance", "Estado"],
       [[m[0], str(m[1]), str(m[2]), _pct(m[1], m[2]),
         "Cerrado" if m[1] == m[2] else "Abierto"] for m in MODULOS]
       + [["<b>Total</b>", "<b>%d</b>" % RESUMEN_PLANE["hechos"],
           "<b>%d</b>" % RESUMEN_PLANE["total"],
           "<b>%s</b>" % _pct(RESUMEN_PLANE["hechos"], RESUMEN_PLANE["total"]),
           "—"]],
       [0.40, 0.14, 0.11, 0.14, 0.21],
       "Nueve de los diez módulos están cerrados en su totalidad. El módulo 3 "
       "figura abierto por el único elemento de recuperación de contraseña, "
       "cuya construcción está terminada y cuya activación depende de la "
       "verificación del dominio de correo. El módulo 10 concentra los seis "
       "elementos restantes."))
    a(("figura", "Avance por módulo funcional al cierre del proyecto",
       "avance_modulos",
       "Elaboración propia a partir de los módulos del proyecto registrados en "
       "Plane al %s." % FECHA_CORTE, 468))

    a(("h2", "10.2 Cumplimiento de los Objetivos Específicos"))
    a(("tabla", "Grado de cumplimiento de los objetivos específicos",
       ["Objetivo", "Módulos asociados", "Resultado"],
       [["OE1 — Ciclo de la orden con auditoría",
         "2. Órdenes de Trabajo (13/13)",
         "Cumplido. Seis estados, trece transiciones validadas en el servidor "
         "e historial de solo-adición sobre cada orden. Se amplió con listas "
         "de verificación por tipo de mantenimiento y vista de calendario, no "
         "previstas inicialmente."],
        ["OE2 — Autenticación y autorización por rol",
         "3. Autenticación y Permisos (5/6)",
         "Cumplido con una salvedad. Inicio de sesión, sesión, dos roles, "
         "autorización en el servidor y administración de usuarios operan en "
         "producción. El envío del correo de restablecimiento espera la "
         "verificación del dominio remitente; mientras tanto, la contraseña la "
         "asigna un administrador desde el panel."],
        ["OE3 — Clientes, equipos y panel de campo",
         "4. Clientes y Equipos (4/4); 5. Panel de Técnicos (8/8)",
         "Cumplido y superado. A lo comprometido se sumaron la firma de "
         "conformidad del cliente, la instalación de la aplicación en el "
         "teléfono como aplicación web progresiva y un rediseño completo de la "
         "interfaz para uso en campo."],
        ["OE4 — Inventario, preventivo y notificaciones",
         "6. Inventario (4/4); 7. Preventivo (5/5); 8. Notificaciones (6/6)",
         "Cumplido. Los tres módulos cerrados. La generación automática de "
         "órdenes preventivas opera como tarea programada y el sistema de "
         "notificaciones admite configuración por evento, rol y canal, con "
         "plantillas editables."],
        ["OE5 — Reportes, despliegue y adopción",
         "9. Reportes (4/4); 10. Implementación (5/11)",
         "Cumplido en su componente de producto, parcial en su componente de "
         "adopción. El tablero de indicadores, los reportes por técnico y "
         "periodo y la exportación están terminados, y el sistema está "
         "desplegado en producción con dominio y certificado. La migración de "
         "datos reales y la capacitación quedan calendarizadas para la semana "
         "siguiente al cierre académico."]],
       [0.24, 0.26, 0.50],
       "Cuatro de los cinco objetivos específicos se cumplieron por completo. "
       "El quinto se cumplió en lo que dependía del equipo de desarrollo y "
       "quedó parcial en lo que depende de la disponibilidad del cliente."))

    a(("h2", "10.3 Cumplimiento de los Requerimientos No Funcionales"))
    a(("tabla", "Evidencia de cumplimiento de los requerimientos no funcionales",
       ["Código", "Evidencia al cierre"],
       [["RNF-01",
         "Interfaz verificada en teléfono y tableta; rediseño específico de "
         "campo (TCI-44, TCI-86) e instalación como aplicación web progresiva "
         "(TCI-85)."],
        ["RNF-02", "Interfaz, mensajes de error y correos íntegramente en "
                   "español."],
        ["RNF-03",
         "Paginación en todos los listados de catálogo y en la bandeja de "
         "notificaciones; eliminación de tres consultas repetidas en el módulo "
         "preventivo (TCI-87)."],
        ["RNF-04",
         "Credenciales gestionadas por el proveedor de autenticación, que "
         "almacena la contraseña derivada; el esquema no contiene ningún campo "
         "de contraseña en claro."],
        ["RNF-05",
         "Certificado emitido y renovado automáticamente por el orquestador "
         "sobre el dominio del sistema (TCI-70). La cookie de sesión exige "
         "transporte seguro."],
        ["RNF-06",
         "Guarda de autorización en la interfaz de programación (TCI-33) y "
         "verificación de pertenencia en el servicio de dominio: un técnico "
         "solo opera las órdenes en las que figura asignado."],
        ["RNF-07",
         "Guiones de respaldo y de verificación de restauración versionados en "
         "el repositorio y programados en el servidor (TCI-71). La observación "
         "de un ciclo completo de la rutina sigue pendiente."],
        ["RNF-08",
         "Historial de la orden de solo-adición, sin operación de edición ni "
         "de borrado expuesta; la evidencia de una orden cerrada es inmutable "
         "salvo reapertura, que también queda registrada."],
        ["RNF-09",
         "Trece módulos de dominio independientes en el servidor, con "
         "separación entre controlador, servicio y acceso a datos."],
        ["RNF-10",
         "%d migraciones versionadas en el repositorio, aplicadas sin "
         "intervención manual durante el arranque del contenedor."
         % INDICADORES["migraciones"]],
        ["RNF-11",
         "Sistema completo definido en composición de contenedores para "
         "desarrollo y para producción."],
        ["RNF-12",
         "Interfaz construida sobre estándares vigentes, sin dependencias de "
         "un motor de navegador concreto."],
        ["RNF-13",
         "Paleta, tipografía y lineamientos del apartado 7.5 aplicados y "
         "revisados en el rediseño del Sprint 3 (TCI-86)."],
        ["RNF-14",
         "Contraste verificado (apartado 7.5.5); el estado de una orden se "
         "acompaña siempre de etiqueta textual además de color."]],
       [0.10, 0.90],
       "Trece de los catorce requerimientos no funcionales cuentan con "
       "evidencia completa. El RNF-07 está implementado pero su verificación "
       "periódica no se ha observado durante un ciclo completo, razón por la "
       "que el elemento TCI-71 permanece en progreso."))

    a(("h2", "10.4 Contraste entre lo Planificado y lo Entregado"))
    a(("tabla", "Planificado frente a entregado",
       ["Dimensión", "Planificado", "Entregado"],
       [["Módulos funcionales de producto", "9", "9 cerrados"],
        ["Elementos del Product Backlog", "56 iniciales",
         "%d, tras incorporar 11 y retirar 1" % RESUMEN_PLANE["total"]],
        ["Requerimientos funcionales", "39", "38 completos, 1 parcial"],
        ["Requerimientos no funcionales", "14", "13 completos, 1 parcial"],
        ["Sprints", "3", "3 ejecutados y revisados"],
        ["Entregables", "9", "7 entregados, 1 en curso, 1 programado"],
        ["Alcance ampliado", "—",
         "Firma de conformidad del cliente, listas de verificación, "
         "instalación en móvil, aviso de orden vencida, calendario de órdenes "
         "y carga de trabajo al asignar"],
        ["Alcance reducido", "—",
         "Ninguno. No se retiró ninguna funcionalidad comprometida"]],
       [0.28, 0.26, 0.46],
       "El proyecto no redujo alcance en ningún punto. La desviación se "
       "concentra en el calendario de adopción, no en el contenido del "
       "producto."))

    a(("h2", "10.5 Indicadores del Repositorio y de las Pruebas"))
    a(("tabla", "Indicadores del producto construido",
       ["Indicador", "Valor"],
       [["Confirmaciones en el repositorio",
         "%d, entre el %s y el %s"
         % (INDICADORES["commits"], INDICADORES["primer_commit"],
            INDICADORES["ultimo_commit"])],
        ["Distribución por Sprint",
         ", ".join("%s: %d" % (n, c)
                   for n, c in INDICADORES["commits_por_sprint"])],
        ["Entidades del modelo de datos",
         "%d modelos y %d enumeraciones"
         % (INDICADORES["modelos"], INDICADORES["enums"])],
        ["Migraciones versionadas", str(INDICADORES["migraciones"])],
        ["Rutas de la interfaz de programación",
         "%d, en 13 controladores" % INDICADORES["rutas_http"]],
        ["Suites de pruebas de extremo a extremo",
         "%d, sobre órdenes, adjuntos, inventario, preventivo, notificaciones, "
         "reportes y tipos de mantenimiento" % INDICADORES["suites_e2e"]],
        ["Casos de prueba declarados",
         "%d de extremo a extremo y %d unitarios"
         % (INDICADORES["casos_e2e"], INDICADORES["casos_unitarios"])],
        ["Ejecución de la suite unitaria en la fecha de corte",
         "63 casos ejecutados, 63 correctos"],
        ["Documentación técnica versionada",
         "Flujo de la orden, modelo de datos, guía de despliegue, manual de "
         "usuario, guía de contribución y el presente informe"]],
       [0.38, 0.62],
       "La cifra de casos de prueba corresponde a las declaraciones presentes "
       "en el código; los casos parametrizados generan en ejecución un número "
       "mayor, como muestra la diferencia entre los %d casos unitarios "
       "declarados y los 63 efectivamente ejecutados. La suite de extremo a "
       "extremo requiere el contenedor de base de datos y se ejecuta en el "
       "entorno de integración." % INDICADORES["casos_unitarios"]))

    a(("h2", "10.6 Distribución del Trabajo"))
    a(("tabla", "Elementos asignados y terminados por integrante",
       ["Integrante", "Asignados", "Terminados", "Cumplimiento"],
       [[n, str(t), str(h), _pct(h, t)] for n, h, t in CARGA],
       [0.40, 0.20, 0.20, 0.20],
       "Un mismo elemento puede tener varios responsables, por lo que la suma "
       "de la columna de asignados excede el total del backlog. %d de los %d "
       "elementos no tienen responsable nominal registrado: corresponden a "
       "subtareas técnicas de un elemento padre y al trabajo del Sprint 3, que "
       "el equipo asumió de forma colectiva. La retrospectiva del Sprint 3 "
       "(apartado 9.3) recoge esa omisión como acuerdo de mejora."
       % (SIN_ASIGNAR, RESUMEN_PLANE["total"])))

    a(("h2", "10.7 Estado del Sistema en Producción"))
    a(("p",
       "El sistema está desplegado y accesible por HTTPS sobre un servidor "
       "privado virtual, orquestado con Dokploy. Los tres servicios —interfaz "
       "web, interfaz de programación y base de datos— cuentan con "
       "comprobación de salud, y las migraciones del esquema se aplican de "
       "forma automática durante el arranque del contenedor de la interfaz de "
       "programación, sin paso manual previo."))
    a(("p",
       "Tres condiciones de operación quedan documentadas para la "
       "transferencia al cliente. La primera es que el sitio debe servirse "
       "necesariamente por HTTPS: la cookie de sesión exige transporte seguro, "
       "de modo que el orden correcto de puesta en marcha es primero el "
       "dominio y el certificado, y después las pruebas. La segunda es que la "
       "dirección de la interfaz de programación se incorpora durante la "
       "compilación de la interfaz web, por lo que un cambio de dominio del "
       "servidor obliga a recompilar. La tercera es que los respaldos se "
       "escriben hoy en el propio servidor; trasladarlos a un almacenamiento "
       "externo es la primera recomendación operativa del apartado 12."))

    # =======================================================================
    # 11. Conclusiones
    # =======================================================================
    a(("h1", "11. Conclusiones"))
    a(("p",
       "El levantamiento realizado con la gerencia de TCI Técnicos de Control "
       "Industrial confirmó que la ausencia de una plataforma centralizada de "
       "gestión del mantenimiento constituía una limitación operativa "
       "concreta, expresada en la falta de trazabilidad de las intervenciones, "
       "la imposibilidad de seguir el trabajo en campo en tiempo real y la "
       "dependencia de recordatorios manuales para el cumplimiento del "
       "programa preventivo. El sistema construido responde de forma directa y "
       "verificable a cada una de esas limitaciones: el historial de solo "
       "adición sobre cada orden resuelve la trazabilidad, el canal de eventos "
       "del servidor propaga el avance sin recargar la vista, y los planes "
       "preventivos generan las órdenes por sí solos al cumplirse la "
       "frecuencia establecida."))
    a(("p",
       "El objetivo general se alcanzó. El sistema centraliza el ciclo de vida "
       "completo de la orden, la administración de clientes, sedes y equipos, "
       "el control de repuestos, la programación del mantenimiento preventivo "
       "y el historial de servicio, y está desplegado en ambiente productivo "
       "con dominio propio y certificado válido. De los cinco objetivos "
       "específicos, cuatro se cumplieron por completo y el quinto se cumplió "
       "en su componente de producto; lo que resta de él —migración de datos "
       "reales y capacitación— depende de la disponibilidad del personal de "
       "TCI y está calendarizado."))
    a(("p",
       "La adopción de Scrum como marco de trabajo resultó consistente con la "
       "naturaleza del proyecto y su valor puede demostrarse con evidencia y "
       "no solo afirmarse. Once de los sesenta y seis elementos del Product "
       "Backlog no existían al planificar: nacieron de la retroalimentación "
       "recogida en las Sprint Reviews, y entre ellos figura la firma de "
       "conformidad del cliente, que la planificación había declarado "
       "expresamente fuera de alcance y que terminó siendo una de las "
       "funcionalidades de mayor valor comercial para la empresa. Un enfoque "
       "predictivo habría diferido ese descubrimiento al final del proyecto, "
       "cuando incorporarlo ya habría sido caro."))
    a(("p",
       "La formulación de los objetivos específicos como metas de Sprint "
       "mostró también su límite. La meta del Sprint 1 —disponer del ciclo "
       "completo de la orden— admitía leerse como definirlo o como "
       "construirlo, y esa ambigüedad produjo un Sprint sin incremento de "
       "código. La retrospectiva corrigió la redacción para los ciclos "
       "siguientes, y el Sprint 2 absorbió el arrastre sin desplazar ningún "
       "compromiso. Es un resultado que conviene registrar tal cual: el marco "
       "no impidió el error, pero lo hizo visible en dos semanas en lugar de "
       "en tres meses."))
    a(("p",
       "La identidad visual del sistema se construyó sobre evidencia "
       "verificable y no sobre supuestos: el rojo institucional se confirmó de "
       "manera coincidente en el logotipo proporcionado por la empresa y en "
       "las variables de estilo del sitio web oficial, y la familia "
       "tipográfica se adoptó de esa misma fuente. Esta trazabilidad garantiza "
       "que la plataforma sea reconocida por los usuarios como parte de la "
       "marca TCI, y el criterio se sostuvo hasta el rediseño de interfaz del "
       "último Sprint sin necesidad de revisarlo."))
    a(("p",
       "El stack tecnológico seleccionado no obedeció únicamente a criterios "
       "de familiaridad del equipo: cada componente se vincula con un "
       "requerimiento no funcional concreto del sistema, desde las guardas de "
       "autorización de NestJS hasta las migraciones versionadas de Prisma y "
       "la gestión automatizada de certificados y respaldos de Dokploy. El "
       "apartado 10.3 documenta la evidencia de cumplimiento de los catorce "
       "requerimientos no funcionales, trece de ellos completos."))
    a(("p",
       "La delimitación explícita de las exclusiones cumplió su función de "
       "protección del proyecto frente a la expansión no controlada del "
       "alcance, sin volverse rígida: la única exclusión que se revirtió lo "
       "hizo por decisión expresa del cliente y con un costo de "
       "implementación marginal, y todas las demás se sostuvieron. Entre ellas "
       "destaca la evaluación integral de costos del servicio, planteada por "
       "la gerencia durante el levantamiento pero sin definición funcional "
       "suficiente; su tratamiento parcial mediante el registro del consumo de "
       "repuestos con precio congelado y la reserva de los campos de costo en "
       "el modelo de la orden deja establecida la base de datos que permitirá "
       "abordarla en una fase posterior sin migrar información histórica."))
    a(("p",
       "Finalmente, el proyecto deja una lección de proceso que trasciende su "
       "objeto. Las tres retrospectivas coinciden en un mismo movimiento: todo "
       "lo que el equipo descubrió que era caro descubrir tarde —el "
       "despliegue, la verificación en teléfono, la integración de servicios "
       "externos y, sobre todo, las dependencias del cliente— terminó "
       "desplazándose hacia el principio del ciclo. Las siete actividades que "
       "quedan abiertas al cierre pertenecen, sin excepción, a la única "
       "categoría que no llegó a desplazarse a tiempo: la que depende de la "
       "disponibilidad de terceros."))

    # =======================================================================
    # 12. Recomendaciones
    # =======================================================================
    a(("h1", "12. Recomendaciones"))
    a(("p",
       "Del trabajo realizado se desprenden las recomendaciones siguientes, "
       "agrupadas según su destinatario: las que corresponden a la gerencia de "
       "TCI para consolidar la adopción del sistema, las que corresponden a la "
       "operación técnica y las que el equipo recoge como aprendizaje de "
       "proceso."))

    a(("h2", "12.1 Para la Gerencia de TCI"))
    a(("lista", [
        "<b>Cerrar la verificación del dominio de correo.</b> Es la única "
        "dependencia que bloquea funcionalidad ya construida. Con el dominio "
        "verificado ante el proveedor de correo se activan, sin tocar código y "
        "cambiando dos variables de configuración, el restablecimiento "
        "autónomo de contraseña y el canal de correo de todas las "
        "notificaciones. Mientras tanto, cada olvido de contraseña consume "
        "tiempo de un administrador.",
        "<b>Ejecutar la migración de datos y la capacitación en la ventana "
        "acordada.</b> El sistema está desplegado y operativo, pero un CMMS "
        "sin el inventario real de clientes y equipos no se adopta: los "
        "usuarios vuelven a sus hojas de cálculo. Las sesiones de capacitación "
        "a administradores y a técnicos están calendarizadas para la semana "
        "posterior al cierre académico y conviene sostener esa fecha.",
        "<b>Resolver el alcance del historial por equipo.</b> La consulta del "
        "historial de un activo hereda hoy el aislamiento por rol, de modo que "
        "el técnico ve únicamente sus propias intervenciones. Si la gerencia "
        "espera que el técnico disponga del historial completo del equipo como "
        "insumo de diagnóstico en campo, la decisión debe adoptarse "
        "expresamente, pues altera una regla de visibilidad que atraviesa todo "
        "el sistema.",
        "<b>Decidir si la evidencia fotográfica será obligatoria para "
        "cerrar.</b> Hoy no lo es, por acuerdo del 25 de agosto de 2026. "
        "Convertirla en obligatoria es cambiar una variable de configuración, "
        "pero conviene sopesar antes el caso del técnico que trabaja en una "
        "planta sin cobertura y que, con la regla activada, no podría cerrar "
        "la orden en sitio.",
        "<b>Acordar la definición funcional del costeo del servicio.</b> El "
        "modelo de datos ya reserva los campos de costo de la orden y el "
        "consumo de repuestos se imputa con el precio congelado del momento, "
        "por lo que el esfuerzo pendiente es de definición y no de estructura. "
        "Sostener una sesión con la gerencia para establecer las tarifas por "
        "perfil técnico y el tratamiento de los tiempos de desplazamiento "
        "permitiría aprovechar esa base. Es el primer candidato para una fase "
        "dos."]))

    a(("h2", "12.2 Para la Operación del Sistema"))
    a(("lista", [
        "<b>Trasladar los respaldos fuera del servidor.</b> Los volcados se "
        "escriben hoy en el mismo servidor privado virtual que alberga la base "
        "de datos, de modo que un fallo del servidor se llevaría por delante "
        "el dato y su copia a la vez. Sincronizarlos con un almacenamiento "
        "externo es una tarea de configuración y es la medida de mayor efecto "
        "sobre el riesgo operativo del sistema.",
        "<b>Observar un ciclo completo de la rutina de respaldo.</b> Los "
        "guiones de volcado y de verificación de restauración existen y "
        "funcionan; lo que falta es comprobar que la tarea programada se "
        "ejecuta sin supervisión durante varios días seguidos y que el "
        "resultado se restaura. Hasta entonces el requerimiento RNF-07 está "
        "implementado pero no verificado.",
        "<b>Revisar el orden de puesta en marcha ante un cambio de "
        "dominio.</b> La dirección de la interfaz de programación se incorpora "
        "durante la compilación de la interfaz web, por lo que un cambio de "
        "dominio exige recompilar y no solo reiniciar. Está documentado en la "
        "guía de despliegue y conviene que quien opere el sistema lo tenga "
        "presente.",
        "<b>Vigilar el crecimiento del almacenamiento de evidencia.</b> Cada "
        "orden cerrada acumula fotografías y, desde el Sprint 2, la firma del "
        "cliente. El volumen crece de forma monótona porque la evidencia de "
        "una orden cerrada es deliberadamente inmutable. Conviene definir "
        "desde ahora una política de retención antes de que el espacio sea el "
        "que la imponga."]))

    a(("h2", "12.3 Para el Equipo de Desarrollo"))
    a(("lista", [
        "<b>Identificar las dependencias externas en la planificación "
        "inicial.</b> Es la recomendación de mayor peso que deja el proyecto. "
        "Las siete actividades abiertas al cierre dependen de terceros y todas "
        "estaban programadas en el último Sprint, sin holgura. Si una "
        "actividad necesita a alguien que no pertenece al equipo, debe "
        "planificarse con al menos un Sprint de margen.",
        "<b>Separar en la meta de Sprint lo que se define de lo que se "
        "construye.</b> La ambigüedad de la meta del Sprint 1 costó un ciclo "
        "sin incremento de código. Una meta debe permitir responder sí o no en "
        "la revisión, sin discusión sobre qué se había comprometido.",
        "<b>Habilitar el ambiente de pruebas compartido desde el primer "
        "Sprint.</b> La Definición de Terminado exige que cada elemento se "
        "despliegue y verifique en un ambiente de pruebas. Durante dos "
        "Sprints ese criterio se satisfizo sobre entornos locales, lo que lo "
        "convirtió en una formalidad difícilmente verificable. Adelantar el "
        "despliegue al Sprint 3 reveló tres bloqueos que al final del proyecto "
        "habrían sido críticos; haberlo adelantado al Sprint 1 los habría "
        "revelado antes.",
        "<b>Sostener la disciplina de pruebas automatizadas.</b> La suite de "
        "extremo a extremo del módulo de órdenes fue la red de seguridad que "
        "permitió reescribir la cabecera de la orden, el flujo de evidencia y "
        "la interfaz completa sin regresiones. Extenderla a los módulos que "
        "hoy tienen menor cobertura —singularmente la interfaz web, que no "
        "cuenta con pruebas automatizadas propias— es la inversión de mayor "
        "retorno para la fase siguiente.",
        "<b>Mantener la asignación nominal en el tablero hasta el cierre.</b> "
        "Veintisiete de los sesenta y seis elementos carecen de responsable "
        "registrado, casi todos del último Sprint. La trazabilidad del trabajo "
        "es parte del valor del tablero y se pierde por completo si se "
        "abandona en el tramo final, que es justamente cuando más se consulta.",
        "<b>Integrar los servicios externos desde el primer día.</b> El correo "
        "y el almacenamiento de objetos se incorporaron tarde y obligaron a "
        "diseñar sobre la marcha el comportamiento para el caso de no estar "
        "configurados. La solución adoptada —un servicio que registra lo que "
        "habría enviado y responde que no envió, en lugar de fallar o de "
        "fingir— resultó acertada y conviene aplicarla desde el inicio en "
        "proyectos futuros."]))

    # =======================================================================
    # 13. Bibliografia
    # =======================================================================
    a(("h1", "13. Bibliografía"))
    a(("bib", [
        "American Psychological Association. (2020). <i>Publication manual of "
        "the American Psychological Association</i> (7.ª ed.). "
        "https://doi.org/10.1037/0000165-000",
        "International Organization for Standardization. (2011). <i>ISO/IEC "
        "25010:2011. Systems and software engineering — Systems and software "
        "Quality Requirements and Evaluation (SQuaRE) — System and software "
        "quality models</i>. https://www.iso.org/standard/35733.html",
        "Kerzner, H. (2017). <i>Project management: A systems approach to "
        "planning, scheduling, and controlling</i> (12.ª ed.). Wiley.",
        "Pressman, R. S., &amp; Maxim, B. R. (2021). <i>Ingeniería del "
        "software: Un enfoque práctico</i> (9.ª ed.). McGraw-Hill.",
        "Project Management Institute. (2021). <i>Guía de los fundamentos "
        "para la dirección de proyectos (Guía del PMBOK)</i> (7.ª ed.). "
        "Project Management Institute.",
        "Schwaber, K., &amp; Sutherland, J. (2020). <i>La Guía de Scrum: Las "
        "reglas del juego</i>. Scrum.org. https://scrumguides.org/",
        "Sommerville, I. (2011). <i>Ingeniería de software</i> (9.ª ed.). "
        "Pearson Educación.",
        "TCI Técnicos de Control Industrial. (2025). <i>TCI Técnicos de "
        "Control Industrial: Soluciones a tu industria</i>. "
        "https://www.tcihn.com/",
        "Wireman, T. (2008). <i>Preventive maintenance</i>. Industrial Press.",
        "World Wide Web Consortium. (2018). <i>Web Content Accessibility "
        "Guidelines (WCAG) 2.1</i>. https://www.w3.org/TR/WCAG21/",
    ]))

    # =======================================================================
    # 14. Anexos
    # =======================================================================
    a(("h1", "14. Anexos"))
    a(("p",
       "Los anexos reúnen el material de respaldo que sustenta los apartados "
       "anteriores y que, por su extensión o su carácter de referencia, no "
       "forma parte del cuerpo del informe."))

    a(("h2", "Anexo A. Product Backlog Completo por Módulo"))
    a(("p",
       "Reproducción íntegra de los %d elementos del Product Backlog "
       "administrado en Plane, agrupados por módulo funcional y ordenados por "
       "su numeración. La clave corresponde al identificador del elemento en "
       "el tablero del proyecto." % RESUMEN_PLANE["total"]))
    for modulo, filas in BACKLOG:
        hechos = sum(1 for f in filas if f[4] == "Terminado")
        a(("tabla", "Módulo %s" % modulo,
           ["Clave", "Elemento", "Responsable", "Prioridad", "Estado"],
           [list(f) for f in filas], [0.09, 0.42, 0.22, 0.12, 0.15],
           "%d de %d elementos terminados." % (hechos, len(filas))))

    a(("h2", "Anexo B. Inventario de la Interfaz de Programación"))
    a(("p",
       "El servidor expone %d rutas HTTP distribuidas en trece controladores. "
       "Todas cuelgan del prefijo /api y todas, salvo las de autenticación y "
       "la comprobación de salud, exigen sesión válida y verifican el rol del "
       "solicitante." % INDICADORES["rutas_http"]))
    a(("tabla", "Controladores de la interfaz de programación",
       ["Controlador", "Responsabilidad"],
       [["Órdenes", "Ciclo de vida de la orden, transiciones, comentarios, "
                    "historial y canal de eventos en vivo."],
        ["Adjuntos", "Carga, descarga y borrado de evidencia y firma, con "
                     "comprobación de permiso en cada descarga."],
        ["Clientes", "Clientes y sus sedes."],
        ["Equipos", "Activos por cliente y su historial de intervenciones."],
        ["Catálogos", "Tipos de mantenimiento y sus listas de verificación."],
        ["Tipos de equipo", "Catálogo sobre el que se definen los planes "
                            "preventivos."],
        ["Repuestos", "Catálogo de repuestos, entradas, salidas y libro de "
                      "movimientos."],
        ["Consumo", "Imputación de repuestos a una orden de trabajo."],
        ["Preventivo", "Planes, generación automática de órdenes, calendario y "
                       "avisos anticipados."],
        ["Notificaciones", "Bandeja, preferencias por evento y rol, y "
                           "plantillas de mensaje."],
        ["Reportes", "Indicadores del periodo, desempeño por técnico y "
                     "exportación a PDF y hoja de cálculo."],
        ["Usuarios", "Alta, edición y desactivación de cuentas con su rol."],
        ["Aplicación", "Comprobación de salud del servicio."]],
       [0.25, 0.75],
       "Elaboración propia a partir del código del repositorio al %s."
       % FECHA_CORTE))

    a(("h2", "Anexo C. Migraciones del Esquema de Datos"))
    a(("p",
       "Las %d migraciones versionadas documentan la evolución del esquema a "
       "lo largo del proyecto y permiten reconstruir la base desde cero sin "
       "intervención manual, conforme al requerimiento RNF-10."
       % INDICADORES["migraciones"]))
    a(("tabla", "Migraciones aplicadas",
       ["Migración", "Qué introduce", "Elementos"],
       [["Esquema inicial",
         "Autenticación, clientes, sedes, equipos, tipos de mantenimiento, "
         "orden de trabajo e historial.",
         "TCI-22, TCI-31, TCI-36, TCI-37, TCI-78"],
        ["Adjuntos de evidencia", "Evidencia fotográfica asociada a la orden.",
         "TCI-43"],
        ["Inventario y repuestos",
         "Catálogo de repuestos, libro de movimientos y consumo por orden.",
         "TCI-45, TCI-46, TCI-47, TCI-48"],
        ["Planes preventivos",
         "Catálogo de tipos de equipo y planes de mantenimiento por "
         "frecuencia.", "TCI-49, TCI-50"],
        ["Notificaciones",
         "Bandeja, preferencias por evento y rol, y plantillas de mensaje.",
         "TCI-53 a TCI-56"],
        ["Limitador de peticiones",
         "Contadores de intentos de acceso persistidos en base, para que "
         "sobrevivan al reinicio del proceso.", "TCI-83"],
        ["Listas de verificación y firma",
         "Plantillas de comprobación por tipo de mantenimiento, lista de la "
         "orden y firma de conformidad del cliente.", "TCI-80, TCI-84"],
        ["Aviso de orden vencida",
         "Evento notificable para la orden cuya fecha límite pasó sin cierre.",
         "TCI-88"]],
       [0.26, 0.48, 0.26],
       "Elaboración propia a partir del directorio de migraciones del "
       "repositorio. El orden corresponde al cronológico de aplicación."))

    a(("h2", "Anexo D. Acuerdos de Producto Fechados"))
    a(("p",
       "Decisiones funcionales adoptadas con el cliente durante la ejecución "
       "que alteraron o precisaron el alcance definido en el Sprint 1. Se "
       "consignaron en la documentación técnica del repositorio en el momento "
       "de adoptarse, práctica que la retrospectiva del Sprint 1 identificó "
       "como buena y que sostiene la trazabilidad de este informe."))
    a(("tabla", "Acuerdos de producto adoptados durante la ejecución",
       ["Fecha", "Acuerdo", "Efecto"],
       [["6 de agosto de 2026",
         "Levantamiento de requerimientos con la gerencia de TCI.",
         "Origen del Product Backlog y de los requerimientos."],
        ["22 de agosto de 2026",
         "El sistema no tendrá registro público de usuarios.",
         "Precisa el requerimiento RF-14 y añade una exclusión."],
        ["25 de agosto de 2026",
         "La evidencia fotográfica no bloquea el cierre de la orden.",
         "La regla existe y está implementada, pero desactivada por "
         "configuración."],
        ["26 de agosto de 2026",
         "El vencimiento de un plan preventivo se cuenta desde el último "
         "cierre real y no desde un calendario fijo.",
         "Evita que un equipo atrasado acumule órdenes preventivas vencidas."],
        ["Sprint Review 2",
         "Se incorpora la firma de conformidad del cliente al cerrar la "
         "orden.",
         "Revierte una exclusión de la planificación; se implementa como "
         "adjunto de tipo específico."],
        ["Sprint Review 2",
         "Se incorporan listas de verificación por tipo de mantenimiento.",
         "El texto se copia a la orden al crearla, para que una orden cerrada "
         "no cambie si la plantilla se reescribe."]],
       [0.20, 0.42, 0.38],
       "Elaboración propia a partir de la documentación técnica versionada del "
       "proyecto."))

    a(("h2", "Anexo E. Enlaces y Recursos del Proyecto"))
    a(("tabla", "Recursos del proyecto",
       ["Recurso", "Descripción"],
       [["Sistema en producción",
         "https://tci.brandsofts.com — aplicación desplegada, accesible por "
         "HTTPS con certificado válido."],
        ["Tablero del proyecto",
         "https://plane.brandsofts.com/ceutec — Product Backlog, ciclos y "
         "módulos administrados en Plane, espacio de trabajo CEUTEC."],
        ["Repositorio de código",
         "https://github.com/esdrasclth/tci-cmms — historial completo de %d "
         "confirmaciones, con la documentación técnica versionada junto al "
         "código, bajo licencia GNU AGPL v3." % INDICADORES["commits"]],
        ["Manual de usuario",
         "docs/TCI_Manual_Usuario.pdf — guía de operación para el perfil "
         "administrador y el perfil técnico, entregada al cliente."],
        ["Guía de despliegue",
         "docs/despliegue.md — procedimiento de puesta en producción, "
         "variables de entorno, dominio, certificado y respaldos."],
        ["Documentación del dominio",
         "docs/flujo-ordenes.md y docs/modelo-datos-orden.md — ciclo de la "
         "orden y modelo de datos, con las decisiones de diseño y su "
         "justificación."],
        ["Reproducción de este informe",
         "docs/generar_documento.py — genera el PDF y el archivo de Word a "
         "partir del contenido, de las figuras y del estado exportado del "
         "tablero, de modo que el informe puede regenerarse sin recomponerlo "
         "a mano."]],
       [0.28, 0.72],
       "Los cuatro últimos recursos residen en el directorio de documentación "
       "del repositorio y se mantienen versionados junto al código, de modo "
       "que no pueden quedar desfasados respecto del sistema que describen."))

    return B
