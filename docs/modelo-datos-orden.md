# TCI-22 — Modelo de datos de la Orden de Trabajo

Modelo de la OT y sus tablas satélite. Depende de TCI-78 (estados) y es el contrato que
consumen TCI-23 (CRUD), TCI-38 (historial por equipo), TCI-46 (repuestos por orden),
TCI-50 (generación automática) y TCI-57/58/60 (reportes).

## 1. Entidad principal: `OrdenTrabajo`

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | uuid (PK) | no | |
| `numero` | string(16) | no | Correlativo legible `OT-2026-0001`, **único**. Secuencia por año. |
| `titulo` | string(120) | no | Resumen corto para listados. |
| `descripcionProblema` | text | no | Lo que reporta el cliente. |
| `trabajoRealizado` | text | sí | Se llena al completar. Obligatorio para cerrar. |
| `estado` | enum `OrdenEstado` | no | Ver TCI-78. Default `PENDIENTE`. |
| `prioridad` | enum `Prioridad` | no | `BAJA` · `MEDIA` · `ALTA` · `URGENTE`. Default `MEDIA`. |
| `origen` | enum `OrigenOrden` | no | `MANUAL` · `PREVENTIVO_AUTOMATICO` (TCI-50). |
| `clienteId` | uuid FK → `Cliente` | no | TCI-36. `onDelete: Restrict`. |
| `sedeId` | uuid FK → `Sede` | sí | Ubicación del cliente donde se ejecuta. |
| `equipoId` | uuid FK → `Equipo` | **sí** | TCI-37. Nullable: hay servicios que no son sobre un activo registrado. |
| `tipoMantenimientoId` | uuid FK → `TipoMantenimiento` | no | TCI-30. |
| `planMantenimientoId` | uuid FK → `PlanMantenimiento` | sí | Origen si la generó el preventivo (TCI-50). |
| `tecnicoId` | uuid FK → `Usuario` | sí | Nulo mientras esté `PENDIENTE`. TCI-28. |
| `creadoPorId` | uuid FK → `Usuario` | no | Quién la registró. |
| `fechaProgramada` | timestamptz | sí | Cuándo se planea ejecutar. |
| `fechaLimite` | timestamptz | sí | Compromiso con el cliente (SLA). |
| `fechaAsignacion` | timestamptz | sí | La fija la máquina de estados. |
| `fechaInicio` | timestamptz | sí | Idem. |
| `fechaFin` | timestamptz | sí | Idem. |
| `horasTrabajadas` | decimal(6,2) | sí | Capturado por el técnico al cerrar. |
| `costoManoObra` | decimal(12,2) | no | Default 0. |
| `costoRepuestos` | decimal(12,2) | no | Default 0. Recalculado desde `OrdenRepuesto`. |
| `costoTotal` | decimal(12,2) | no | `costoManoObra + costoRepuestos`. Persistido para reportes. |
| `moneda` | char(3) | no | Default `HNL`. |
| `createdAt` / `updatedAt` | timestamptz | no | |
| `deletedAt` | timestamptz | sí | **Soft delete**: una OT nunca se borra físicamente. |

**Índices:** `numero` (unique) · `(estado)` · `(tecnicoId, estado)` — la consulta del panel
de técnico (TCI-41) · `(clienteId)` · `(equipoId)` — historial por equipo (TCI-38/57) ·
`(fechaProgramada)` — calendario (TCI-51) · `(deletedAt)`.

## 2. Tablas satélite

**`OrdenHistorial`** (TCI-29) — auditoría solo-append, nunca se edita ni borra.
`id` · `ordenId` FK · `usuarioId` FK · `tipo` enum (`CAMBIO_ESTADO`, `ASIGNACION`,
`COMENTARIO`, `EDICION`) · `estadoAnterior` · `estadoNuevo` · `campo` · `valorAnterior` ·
`valorNuevo` · `comentario` (text, aquí van los motivos de pausa/cancelación) · `createdAt`.
Índice `(ordenId, createdAt)`.

**`OrdenAdjunto`** (TCI-43) — evidencia.
`id` · `ordenId` FK · `usuarioId` FK · `url` · `nombreArchivo` · `mimeType` ·
`tamanoBytes` · `tipo` enum (`EVIDENCIA_ANTES`, `EVIDENCIA_DESPUES`, `DOCUMENTO`) · `createdAt`.

**`OrdenRepuesto`** (TCI-46) — consumo de inventario.
`id` · `ordenId` FK · `repuestoId` FK → `Repuesto` (TCI-45) · `cantidad` decimal(10,2) ·
`costoUnitario` decimal(12,2) · `registradoPorId` FK · `createdAt`.
**El `costoUnitario` es un snapshot** al momento del consumo: si mañana cambia el precio del
repuesto, el costo histórico de la OT no se altera. Cada fila genera además un movimiento de
salida en el inventario (TCI-48).

**`TipoMantenimiento`** (TCI-30) — catálogo editable, no un enum.
`id` · `codigo` (unique) · `nombre` · `color` (para el calendario) · `requiereEquipo` bool ·
`activo` bool. Semilla inicial: Preventivo · Correctivo · Emergencia · Instalación · Inspección.

## 3. Reglas de integridad

1. `numero` se genera en una transacción con secuencia por año (`OT-{año}-{correlativo}`).
2. `onDelete: Restrict` en `clienteId`, `equipoId` y `tecnicoId`: no se puede borrar un
   cliente, equipo o usuario que tenga órdenes. Se desactivan (`activo = false`), no se borran.
3. Si `tipoMantenimiento.requiereEquipo = true`, `equipoId` es obligatorio (validado en el servicio).
4. `costoRepuestos` y `costoTotal` se recalculan en cada alta/baja de `OrdenRepuesto`, dentro
   de la misma transacción.
5. Soft delete en `OrdenTrabajo`; todas las consultas filtran `deletedAt: null` por defecto
   (middleware de Prisma).
6. Los montos van en `decimal`, nunca en `float`.

## 4. Fuera de v1 (fase 2)

Firma digital del cliente al cierre · geolocalización del check-in del técnico ·
checklists configurables por tipo de equipo · facturación y cotizaciones ·
tarifas por técnico o por tipo de servicio.
