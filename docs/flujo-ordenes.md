# TCI-78 — Estados y flujo de una Orden de Trabajo

Definición funcional y técnica de la máquina de estados de la Orden de Trabajo (OT).
Es la base de TCI-22 (modelo de datos), TCI-23 (CRUD), TCI-28 (asignación),
TCI-29 (historial), TCI-42 (cambio de estado del técnico) y TCI-53 (notificaciones).

## 1. Estados

| Estado | Significado | ¿Final? |
|---|---|---|
| `PENDIENTE` | OT creada, sin técnico asignado. Punto de entrada (creación manual por Admin o generación automática del plan preventivo, TCI-50). | No |
| `ASIGNADA` | Tiene técnico responsable, aún no se inicia el trabajo. | No |
| `EN_PROCESO` | El técnico inició el trabajo en sitio. Marca `fechaInicio`. | No |
| `EN_ESPERA` | Trabajo pausado por causa externa (falta de repuesto, acceso al sitio, aprobación del cliente). Requiere `motivo`. | No |
| `COMPLETADA` | Trabajo terminado, con descripción de lo realizado y evidencia. Marca `fechaFin`. | Sí |
| `CANCELADA` | No se ejecutará. Requiere `motivo`. | Sí |

**Nota sobre `EN_ESPERA`:** no estaba en la lista tentativa del work item, pero se agrega
porque el tiempo muerto por falta de repuesto o acceso es común en campo y, si no se
separa, contamina el tiempo de resolución que se reporta en el dashboard (TCI-60).

## 2. Transiciones permitidas

```
                 ┌──────────── reasignar ────────────┐
                 │                                   │
                 v                                   │
  PENDIENTE ──asignar──> ASIGNADA ──iniciar──> EN_PROCESO ──completar──> COMPLETADA
      ^                     │                    │    ^                      │
      └──── desasignar ─────┘                    │    │                      │
                                        pausar   │    │  reanudar     reabrir│(solo Admin)
                                                 v    │                      │
                                              EN_ESPERA <────────────────────┘
                                                                     
  PENDIENTE | ASIGNADA | EN_PROCESO | EN_ESPERA ──cancelar──> CANCELADA
```

Tabla de transiciones (origen → destino: acción — quién puede):

- `PENDIENTE` → `ASIGNADA` : **asignar** — Admin
- `PENDIENTE` → `CANCELADA` : **cancelar** — Admin
- `ASIGNADA` → `EN_PROCESO` : **iniciar** — Técnico asignado o Admin
- `ASIGNADA` → `ASIGNADA` : **reasignar** (cambia `tecnicoId`) — Admin
- `ASIGNADA` → `PENDIENTE` : **desasignar** — Admin
- `ASIGNADA` → `CANCELADA` : **cancelar** — Admin
- `EN_PROCESO` → `EN_ESPERA` : **pausar** (requiere motivo) — Técnico asignado o Admin
- `EN_PROCESO` → `COMPLETADA` : **completar** — Técnico asignado o Admin
- `EN_PROCESO` → `CANCELADA` : **cancelar** — Admin
- `EN_ESPERA` → `EN_PROCESO` : **reanudar** — Técnico asignado o Admin
- `EN_ESPERA` → `CANCELADA` : **cancelar** — Admin
- `COMPLETADA` → `EN_PROCESO` : **reabrir** (requiere motivo) — **solo Admin**
- `CANCELADA` → *(sin salida)* : una OT cancelada no se reabre; se crea una nueva.

Cualquier combinación que no esté en esta tabla es inválida y la API responde
**422 Unprocessable Entity**.

## 3. Reglas y guardas

1. **El estado no se cambia con un PATCH genérico.** Se expone un endpoint de acción por
   transición (`POST /ordenes/:id/asignar`, `/iniciar`, `/pausar`, `/reanudar`,
   `/completar`, `/cancelar`, `/reabrir`). Evita estados imposibles y da un punto único
   donde validar, auditar y notificar.
2. **Máquina de estados centralizada** en el backend (un mapa de transiciones en un
   `OrdenEstadoService`). El frontend solo pinta los botones de las transiciones
   permitidas para el estado y rol actuales; nunca decide él la validez.
3. **Un técnico solo opera sus propias OT** (`orden.tecnicoId === user.id`). Se valida en
   el servicio, no solo en el guard de rol (TCI-33).
4. **Requisitos para `completar`:** `trabajoRealizado` no vacío **y** al menos un adjunto
   de evidencia (TCI-43). Se controla con la bandera de configuración
   `EVIDENCIA_OBLIGATORIA`, hoy en **`false`** por decisión del 2026-08-25: la carga de
   evidencia ya funciona y se usa, pero todavía no bloquea el cierre. Encenderla es
   cambiar la variable, sin tocar código — pero antes conviene confirmarlo con TCI (ver §4).
   **La evidencia no se puede modificar en una orden `COMPLETADA` ni `CANCELADA`**, ni
   siquiera por un admin: es parte del acta de cierre. Para corregirla hay que reabrir la
   orden, lo que deja rastro en el historial.
5. **`pausar`, `cancelar` y `reabrir` exigen `motivo`** (texto libre), que se guarda en el
   historial.
6. **Todo cambio de estado escribe en `OrdenHistorial`** (TCI-29): usuario, timestamp,
   estado anterior, estado nuevo y motivo. El historial es solo-append; no se edita ni borra.
7. **Timestamps derivados** que fija la máquina de estados, no el usuario:
   `fechaAsignacion` (al asignar), `fechaInicio` (primer `iniciar`), `fechaFin` (al completar).
8. **Métricas que habilita** (TCI-60): tiempo de respuesta = `fechaInicio − fechaAsignacion`;
   tiempo de resolución = `fechaFin − fechaInicio` **menos** el tiempo acumulado en
   `EN_ESPERA` (se calcula recorriendo el historial).
9. **Eventos que disparan notificación** (TCI-53): `asignar`/`reasignar` → al técnico;
   `completar` → al Admin; `cancelar` → al técnico asignado; `reabrir` → al técnico.

## 4. Decisiones a confirmar con TCI

- ¿Se permite reabrir una OT completada, o el cierre es definitivo y se genera una OT nueva?
  (Propuesta: se permite, solo Admin, y queda registrado en el historial.)
- ¿La evidencia fotográfica es obligatoria para cerrar en todos los tipos de mantenimiento?
  (Pendiente. Hoy `EVIDENCIA_OBLIGATORIA=false`: se puede cerrar sin foto. Si TCI la quiere
  obligatoria, considerar que un técnico sin señal en campo se quedaría sin poder cerrar.)
- ¿Debe el cliente aprobar/firmar el cierre? (Propuesta: fuera de v1, ver fase 2 en TCI-22.)
