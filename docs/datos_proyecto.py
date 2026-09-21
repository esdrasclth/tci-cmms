# -*- coding: utf-8 -*-
"""
Estado del proyecto al corte del informe (20 de septiembre de 2026).

Generado por `docs/exportar_plane.py` desde el tablero de Plane del
proyecto y desde el propio repositorio. No se edita a mano: se regenera.
"""

FECHA_CORTE = '20 de septiembre de 2026'

RESUMEN_PLANE = {
    "total": 66,
    "hechos": 59,
    "curso": 4,
    "pendientes": 3,
}

# (módulo, terminados, total)
MODULOS = [
    ('1. Descubrimiento y Definición', 5, 5),
    ('2. Órdenes de Trabajo', 13, 13),
    ('3. Autenticación y Permisos', 5, 6),
    ('4. Clientes y Equipos', 4, 4),
    ('5. Panel de Técnicos', 8, 8),
    ('6. Inventario y Repuestos', 4, 4),
    ('7. Mantenimiento Preventivo', 5, 5),
    ('8. Notificaciones', 6, 6),
    ('9. Reportes e Historial', 4, 4),
    ('10. Implementación y Despliegue', 5, 11),
]

# (sprint, periodo abreviado, terminados, en curso, pendientes)
SPRINTS = [
    ('Sprint 1', '6–19 ago 2026', 9, 0, 0),
    ('Sprint 2', '20 ago–2 sep 2026', 32, 0, 0),
    ('Sprint 3', '3–20 sep 2026', 18, 4, 3),
]

PERIODOS = {
    'Sprint 1': '6 al 19 de agosto de 2026',
    'Sprint 2': '20 de agosto al 2 de septiembre de 2026',
    'Sprint 3': '3 al 20 de septiembre de 2026',
}

# Sprint Backlog: (clave, elemento, responsable, prioridad, estado)
POR_SPRINT = {
    'Sprint 1': [
        ('TCI-16', '1.1 Reunión de levantamiento de requerimientos con TCI', 'E. Clother', 'Crítica', 'Terminado'),
        ('TCI-17', '1.2 Definir identidad visual del sistema', 'Y. Funes', 'Alta', 'Terminado'),
        ('TCI-18', '1.3 Seleccionar stack tecnológico final', 'E. Clother', 'Alta', 'Terminado'),
        ('TCI-19', '1.4 Documentar alcance de la v1', 'E. Clother, C. Figueroa, A. Cardona, Y. Funes, R. Ortega', 'Alta', 'Terminado'),
        ('TCI-20', '1.5 Obtener aprobación del cliente sobre el plan', 'E. Clother', 'Crítica', 'Terminado'),
        ('TCI-78', '2.1 Definir estados y flujo de una orden', 'A. Cardona, R. Ortega', 'Crítica', 'Terminado'),
        ('TCI-22', '2.2 Diseñar modelo de datos de Orden de Trabajo', 'C. Figueroa, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-31', '3.1 Login y gestión de sesión', 'E. Clother, C. Figueroa, R. Ortega', 'Crítica', 'Terminado'),
        ('TCI-32', '3.2 Definir roles (Admin, Técnico)', 'Y. Funes', 'Alta', 'Terminado'),
    ],
    'Sprint 2': [
        ('TCI-23', '2.3 CRUD de órdenes (backend)', 'E. Clother', 'Alta', 'Terminado'),
        ('TCI-24', 'Endpoint: crear orden', '—', '—', 'Terminado'),
        ('TCI-25', 'Endpoint: listar/filtrar órdenes', '—', '—', 'Terminado'),
        ('TCI-26', 'Endpoint: actualizar orden', '—', '—', 'Terminado'),
        ('TCI-27', 'Endpoint: cerrar/cancelar orden', '—', '—', 'Terminado'),
        ('TCI-28', '2.4 Asignación de técnico responsable', 'E. Clother, C. Figueroa, R. Ortega', 'Media', 'Terminado'),
        ('TCI-29', '2.5 Historial de cambios por orden', 'A. Cardona, Y. Funes, R. Ortega', 'Media', 'Terminado'),
        ('TCI-30', '2.6 Definir catálogo de tipos de mantenimiento', 'Y. Funes', 'Baja', 'Terminado'),
        ('TCI-80', '2.7 Listas de verificación por tipo de mantenimiento', 'E. Clother, Y. Funes', 'Media', 'Terminado'),
        ('TCI-81', '2.8 Carga de trabajo del técnico al asignar', 'C. Figueroa, R. Ortega', 'Baja', 'Terminado'),
        ('TCI-82', '2.9 Vista de calendario de las órdenes programadas', 'E. Clother, A. Cardona', 'Media', 'Terminado'),
        ('TCI-33', '3.3 Middleware de autorización en la API', 'E. Clother', 'Alta', 'Terminado'),
        ('TCI-35', '3.5 Gestión de usuarios desde el panel admin', 'Y. Funes, R. Ortega', 'Media', 'Terminado'),
        ('TCI-83', '3.6 Endurecimiento del acceso y pantallas de error', 'E. Clother', 'Alta', 'Terminado'),
        ('TCI-36', '4.1 CRUD de clientes', 'E. Clother, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-37', '4.2 CRUD de equipos/activos por cliente', 'E. Clother, C. Figueroa', 'Alta', 'Terminado'),
        ('TCI-38', '4.3 Vincular equipos con historial de órdenes', 'E. Clother, R. Ortega', 'Media', 'Terminado'),
        ('TCI-39', '4.4 Búsqueda y filtrado de clientes/equipos', 'E. Clother, A. Cardona', 'Baja', 'Terminado'),
        ('TCI-40', '5.1 Login diferenciado admin/técnico (frontend)', 'E. Clother, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-41', '5.2 Vista de órdenes asignadas al técnico', 'C. Figueroa, R. Ortega', 'Alta', 'Terminado'),
        ('TCI-42', '5.3 Actualización de estado y comentarios en tiempo real', 'A. Cardona, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-43', '5.4 Carga de evidencia (fotos/notas) al cerrar', 'E. Clother, A. Cardona, Y. Funes', 'Media', 'Terminado'),
        ('TCI-44', '5.5 Diseño responsive para uso en campo', 'E. Clother, C. Figueroa, R. Ortega', 'Media', 'Terminado'),
        ('TCI-84', '5.6 Firma de conformidad del cliente al cerrar', 'E. Clother, A. Cardona, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-85', '5.7 Instalación en móvil (PWA), iconos y metadatos', 'C. Figueroa, R. Ortega', 'Media', 'Terminado'),
        ('TCI-86', '5.8 Rediseño de la interfaz: navegación lateral, tipografía y pasada de móvil', 'E. Clother, C. Figueroa, R. Ortega', 'Media', 'Terminado'),
        ('TCI-45', '6.1 Catálogo de repuestos', 'R. Ortega', 'Media', 'Terminado'),
        ('TCI-46', '6.2 Registro de consumo de repuestos por orden', 'A. Cardona', 'Media', 'Terminado'),
        ('TCI-47', '6.3 Alertas de stock bajo', 'C. Figueroa', 'Baja', 'Terminado'),
        ('TCI-87', '7.5 Consultas del preventivo sin N+1', 'E. Clother', 'Baja', 'Terminado'),
        ('TCI-88', '8.5 Aviso de orden vencida', 'A. Cardona, Y. Funes', 'Media', 'Terminado'),
        ('TCI-89', '8.6 Paginación de la bandeja de notificaciones', 'R. Ortega', 'Baja', 'Terminado'),
    ],
    'Sprint 3': [
        ('TCI-34', '3.4 Recuperación de contraseña', 'A. Cardona, Y. Funes', 'Media', 'En progreso'),
        ('TCI-48', '6.4 Historial de movimientos de inventario', 'Y. Funes', 'Baja', 'Terminado'),
        ('TCI-49', '7.1 Definir planes de mantenimiento por tipo de equipo', '—', 'Media', 'Terminado'),
        ('TCI-50', '7.2 Generación automática de órdenes al vencer plazo', '—', 'Alta', 'Terminado'),
        ('TCI-51', '7.3 Calendario visual de mantenimientos programados', '—', 'Media', 'Terminado'),
        ('TCI-52', '7.4 Notificación anticipada antes del vencimiento', '—', 'Media', 'Terminado'),
        ('TCI-53', '8.1 Definir eventos disparadores', '—', 'Media', 'Terminado'),
        ('TCI-54', '8.2 Selección de canal por evento (email/push)', '—', 'Baja', 'Terminado'),
        ('TCI-55', '8.3 Configuración de notificaciones por rol', '—', 'Baja', 'Terminado'),
        ('TCI-56', '8.4 Plantillas de mensaje por tipo de notificación', '—', 'Baja', 'Terminado'),
        ('TCI-57', '9.1 Historial de mantenimiento por equipo/activo', '—', 'Media', 'Terminado'),
        ('TCI-58', '9.2 Reporte de órdenes por técnico y periodo', '—', 'Media', 'Terminado'),
        ('TCI-59', '9.3 Exportación a PDF/Excel', '—', 'Baja', 'Terminado'),
        ('TCI-60', '9.4 Dashboard con métricas clave', '—', 'Media', 'Terminado'),
        ('TCI-61', '10.1 Despliegue en producción (VPS/Dokploy)', '—', 'Crítica', 'Terminado'),
        ('TCI-68', 'Configurar variables de entorno de producción', '—', '—', 'Terminado'),
        ('TCI-69', 'Desplegar servicios en Dokploy', '—', '—', 'Terminado'),
        ('TCI-70', 'Configurar dominio y SSL', '—', '—', 'Terminado'),
        ('TCI-71', 'Verificar backups automáticos', '—', '—', 'En progreso'),
        ('TCI-62', '10.2 Migración de datos iniciales', '—', 'Alta', 'En progreso'),
        ('TCI-63', '10.3 Pruebas finales con datos reales', '—', 'Crítica', 'En progreso'),
        ('TCI-64', '10.4 Capacitación a administradores', '—', 'Alta', 'Pendiente'),
        ('TCI-65', '10.5 Capacitación a técnicos', '—', 'Alta', 'Pendiente'),
        ('TCI-66', '10.6 Documentación de usuario', '—', 'Media', 'Terminado'),
        ('TCI-67', '10.7 Acompañamiento post-lanzamiento', '—', 'Media', 'Pendiente'),
    ],
}

# Product Backlog por módulo: (módulo, [(clave, elemento, resp, prio, estado)])
BACKLOG = [
    ('1. Descubrimiento y Definición', [
        ('TCI-16', '1.1 Reunión de levantamiento de requerimientos con TCI', 'E. Clother', 'Crítica', 'Terminado'),
        ('TCI-17', '1.2 Definir identidad visual del sistema', 'Y. Funes', 'Alta', 'Terminado'),
        ('TCI-18', '1.3 Seleccionar stack tecnológico final', 'E. Clother', 'Alta', 'Terminado'),
        ('TCI-19', '1.4 Documentar alcance de la v1', 'E. Clother, C. Figueroa, A. Cardona, Y. Funes, R. Ortega', 'Alta', 'Terminado'),
        ('TCI-20', '1.5 Obtener aprobación del cliente sobre el plan', 'E. Clother', 'Crítica', 'Terminado'),
    ]),
    ('2. Órdenes de Trabajo', [
        ('TCI-78', '2.1 Definir estados y flujo de una orden', 'A. Cardona, R. Ortega', 'Crítica', 'Terminado'),
        ('TCI-22', '2.2 Diseñar modelo de datos de Orden de Trabajo', 'C. Figueroa, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-23', '2.3 CRUD de órdenes (backend)', 'E. Clother', 'Alta', 'Terminado'),
        ('TCI-24', 'Endpoint: crear orden', '—', '—', 'Terminado'),
        ('TCI-25', 'Endpoint: listar/filtrar órdenes', '—', '—', 'Terminado'),
        ('TCI-26', 'Endpoint: actualizar orden', '—', '—', 'Terminado'),
        ('TCI-27', 'Endpoint: cerrar/cancelar orden', '—', '—', 'Terminado'),
        ('TCI-28', '2.4 Asignación de técnico responsable', 'E. Clother, C. Figueroa, R. Ortega', 'Media', 'Terminado'),
        ('TCI-29', '2.5 Historial de cambios por orden', 'A. Cardona, Y. Funes, R. Ortega', 'Media', 'Terminado'),
        ('TCI-30', '2.6 Definir catálogo de tipos de mantenimiento', 'Y. Funes', 'Baja', 'Terminado'),
        ('TCI-80', '2.7 Listas de verificación por tipo de mantenimiento', 'E. Clother, Y. Funes', 'Media', 'Terminado'),
        ('TCI-81', '2.8 Carga de trabajo del técnico al asignar', 'C. Figueroa, R. Ortega', 'Baja', 'Terminado'),
        ('TCI-82', '2.9 Vista de calendario de las órdenes programadas', 'E. Clother, A. Cardona', 'Media', 'Terminado'),
    ]),
    ('3. Autenticación y Permisos', [
        ('TCI-31', '3.1 Login y gestión de sesión', 'E. Clother, C. Figueroa, R. Ortega', 'Crítica', 'Terminado'),
        ('TCI-32', '3.2 Definir roles (Admin, Técnico)', 'Y. Funes', 'Alta', 'Terminado'),
        ('TCI-33', '3.3 Middleware de autorización en la API', 'E. Clother', 'Alta', 'Terminado'),
        ('TCI-34', '3.4 Recuperación de contraseña', 'A. Cardona, Y. Funes', 'Media', 'En progreso'),
        ('TCI-35', '3.5 Gestión de usuarios desde el panel admin', 'Y. Funes, R. Ortega', 'Media', 'Terminado'),
        ('TCI-83', '3.6 Endurecimiento del acceso y pantallas de error', 'E. Clother', 'Alta', 'Terminado'),
    ]),
    ('4. Clientes y Equipos', [
        ('TCI-36', '4.1 CRUD de clientes', 'E. Clother, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-37', '4.2 CRUD de equipos/activos por cliente', 'E. Clother, C. Figueroa', 'Alta', 'Terminado'),
        ('TCI-38', '4.3 Vincular equipos con historial de órdenes', 'E. Clother, R. Ortega', 'Media', 'Terminado'),
        ('TCI-39', '4.4 Búsqueda y filtrado de clientes/equipos', 'E. Clother, A. Cardona', 'Baja', 'Terminado'),
    ]),
    ('5. Panel de Técnicos', [
        ('TCI-40', '5.1 Login diferenciado admin/técnico (frontend)', 'E. Clother, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-41', '5.2 Vista de órdenes asignadas al técnico', 'C. Figueroa, R. Ortega', 'Alta', 'Terminado'),
        ('TCI-42', '5.3 Actualización de estado y comentarios en tiempo real', 'A. Cardona, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-43', '5.4 Carga de evidencia (fotos/notas) al cerrar', 'E. Clother, A. Cardona, Y. Funes', 'Media', 'Terminado'),
        ('TCI-44', '5.5 Diseño responsive para uso en campo', 'E. Clother, C. Figueroa, R. Ortega', 'Media', 'Terminado'),
        ('TCI-84', '5.6 Firma de conformidad del cliente al cerrar', 'E. Clother, A. Cardona, Y. Funes', 'Alta', 'Terminado'),
        ('TCI-85', '5.7 Instalación en móvil (PWA), iconos y metadatos', 'C. Figueroa, R. Ortega', 'Media', 'Terminado'),
        ('TCI-86', '5.8 Rediseño de la interfaz: navegación lateral, tipografía y pasada de móvil', 'E. Clother, C. Figueroa, R. Ortega', 'Media', 'Terminado'),
    ]),
    ('6. Inventario y Repuestos', [
        ('TCI-45', '6.1 Catálogo de repuestos', 'R. Ortega', 'Media', 'Terminado'),
        ('TCI-46', '6.2 Registro de consumo de repuestos por orden', 'A. Cardona', 'Media', 'Terminado'),
        ('TCI-47', '6.3 Alertas de stock bajo', 'C. Figueroa', 'Baja', 'Terminado'),
        ('TCI-48', '6.4 Historial de movimientos de inventario', 'Y. Funes', 'Baja', 'Terminado'),
    ]),
    ('7. Mantenimiento Preventivo', [
        ('TCI-49', '7.1 Definir planes de mantenimiento por tipo de equipo', '—', 'Media', 'Terminado'),
        ('TCI-50', '7.2 Generación automática de órdenes al vencer plazo', '—', 'Alta', 'Terminado'),
        ('TCI-51', '7.3 Calendario visual de mantenimientos programados', '—', 'Media', 'Terminado'),
        ('TCI-52', '7.4 Notificación anticipada antes del vencimiento', '—', 'Media', 'Terminado'),
        ('TCI-87', '7.5 Consultas del preventivo sin N+1', 'E. Clother', 'Baja', 'Terminado'),
    ]),
    ('8. Notificaciones', [
        ('TCI-53', '8.1 Definir eventos disparadores', '—', 'Media', 'Terminado'),
        ('TCI-54', '8.2 Selección de canal por evento (email/push)', '—', 'Baja', 'Terminado'),
        ('TCI-55', '8.3 Configuración de notificaciones por rol', '—', 'Baja', 'Terminado'),
        ('TCI-56', '8.4 Plantillas de mensaje por tipo de notificación', '—', 'Baja', 'Terminado'),
        ('TCI-88', '8.5 Aviso de orden vencida', 'A. Cardona, Y. Funes', 'Media', 'Terminado'),
        ('TCI-89', '8.6 Paginación de la bandeja de notificaciones', 'R. Ortega', 'Baja', 'Terminado'),
    ]),
    ('9. Reportes e Historial', [
        ('TCI-57', '9.1 Historial de mantenimiento por equipo/activo', '—', 'Media', 'Terminado'),
        ('TCI-58', '9.2 Reporte de órdenes por técnico y periodo', '—', 'Media', 'Terminado'),
        ('TCI-59', '9.3 Exportación a PDF/Excel', '—', 'Baja', 'Terminado'),
        ('TCI-60', '9.4 Dashboard con métricas clave', '—', 'Media', 'Terminado'),
    ]),
    ('10. Implementación y Despliegue', [
        ('TCI-61', '10.1 Despliegue en producción (VPS/Dokploy)', '—', 'Crítica', 'Terminado'),
        ('TCI-68', 'Configurar variables de entorno de producción', '—', '—', 'Terminado'),
        ('TCI-69', 'Desplegar servicios en Dokploy', '—', '—', 'Terminado'),
        ('TCI-70', 'Configurar dominio y SSL', '—', '—', 'Terminado'),
        ('TCI-71', 'Verificar backups automáticos', '—', '—', 'En progreso'),
        ('TCI-62', '10.2 Migración de datos iniciales', '—', 'Alta', 'En progreso'),
        ('TCI-63', '10.3 Pruebas finales con datos reales', '—', 'Crítica', 'En progreso'),
        ('TCI-64', '10.4 Capacitación a administradores', '—', 'Alta', 'Pendiente'),
        ('TCI-65', '10.5 Capacitación a técnicos', '—', 'Alta', 'Pendiente'),
        ('TCI-66', '10.6 Documentación de usuario', '—', 'Media', 'Terminado'),
        ('TCI-67', '10.7 Acompañamiento post-lanzamiento', '—', 'Media', 'Pendiente'),
    ]),
]

# (integrante, elementos terminados, elementos asignados)
CARGA = [
    ('Esdras Clother', 21, 21),
    ('Yina Funes', 15, 16),
    ('Roberto Ortega', 14, 14),
    ('Carlos Figueroa', 11, 11),
    ('Ángel Cardona', 10, 11),
]

SIN_ASIGNAR = 27

# Indicadores leídos del repositorio.
INDICADORES = {
    'casos_e2e': 212,
    'casos_unitarios': 35,
    'commits': 94,
    'commits_por_sprint': [('Sprint 1', 0), ('Sprint 2', 93), ('Sprint 3', 1)],
    'enums': 10,
    'migraciones': 8,
    'modelos': 22,
    'primer_commit': '2026-08-20',
    'rutas_http': 85,
    'suites_e2e': 8,
    'ultimo_commit': '2026-09-08',
}
