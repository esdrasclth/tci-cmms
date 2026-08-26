# Despliegue en producción

Guía para levantar el CMMS en el VPS con Dokploy. Cubre `TCI-61`, `TCI-68`,
`TCI-69`, `TCI-70` y `TCI-71`.

> **Estado.** Los artefactos están listos y probados en local. Falta lo que
> depende de infraestructura: el VPS, el dominio y las credenciales.

---

## 1. Qué se despliega

Tres servicios, definidos en `docker-compose.prod.yml`:

| Servicio | Imagen | Puerto interno | Se asoma a internet |
|---|---|---|---|
| `postgres` | `postgres:18-alpine` | 5432 | **No** |
| `backend` | `./backend/Dockerfile` | 3001 | Sí, vía proxy |
| `frontend` | `./frontend/Dockerfile` | 3000 | Sí, vía proxy |

**Postgres no publica puertos.** Solo se llega a él desde la red interna de
compose. El compose de desarrollo sí lo expone en el 5436, y por eso son dos
archivos distintos y no uno con condicionales.

MinIO no está aquí: los adjuntos usan un almacenamiento S3 externo (`S3_ENDPOINT`).

---

## 2. Variables de entorno (TCI-68)

Se ponen en el panel de Dokploy. **Ninguna tiene valor por defecto en
producción**: si falta una, el arranque falla y dice cuál. Es preferible a
levantar con una contraseña conocida.

### Obligatorias

| Variable | Qué es | Ejemplo |
|---|---|---|
| `POSTGRES_USER` | Usuario de la base | `tci` |
| `POSTGRES_PASSWORD` | 🔒 Contraseña de la base | *(generar)* |
| `POSTGRES_DB` | Nombre de la base | `tci_cmms` |
| `BETTER_AUTH_SECRET` | 🔒 Firma las sesiones | *(generar, 32+ bytes)* |
| `BETTER_AUTH_URL` | URL **pública** del backend | `https://api.cmms.tcihn.com` |
| `CORS_ORIGIN` | URL **pública** del frontend | `https://cmms.tcihn.com` |
| `NEXT_PUBLIC_API_URL` | URL del backend, **en compilación** | `https://api.cmms.tcihn.com` |
| `S3_ENDPOINT` | API S3 del almacenamiento — **no la consola web** | `https://s3.brandsofts.com` |
| `S3_ACCESS_KEY` | 🔒 | |
| `S3_SECRET_KEY` | 🔒 | |
| `S3_BUCKET` | Bucket de adjuntos | `tci-cmms` |

Las cuatro de S3 son **obligatorias aunque no se vaya a subir ningún archivo**:
el backend las exige al construir `AlmacenamientoService` y, si faltan, no
arranca. Se comprobó levantando el contenedor sin ellas.

`S3_REGION` (`us-east-1`) y `S3_FORCE_PATH_STYLE` (`true`) tienen valor por
defecto. El segundo es `true` para MinIO, que usa rutas
`endpoint/bucket/clave`; con S3 de AWS iría en `false`.

🔒 = secreto. **Se ponen directamente en Dokploy**, no se escriben en el repo ni
se mandan por chat.

Para generar los dos secretos, en el servidor:

```bash
openssl rand -base64 32
```

### El sitio TIENE que servirse por HTTPS

Con `NODE_ENV=production`, Better Auth marca la cookie de sesión como `Secure`.
Un navegador **no guarda una cookie `Secure` recibida por HTTP**, así que sobre
HTTP simple el login responde 200, la cookie se descarta y todo lo demás
responde 401.

Es un síntoma desconcertante —"entra pero no entra"— y se comprobó levantando el
conjunto en local sobre HTTP: el login devolvía 200 y `GET /api/ordenes`, 401.

Consecuencia: **no se puede probar el sistema por IP ni por HTTP antes de montar
el certificado.** Primero el dominio y el SSL (`TCI-70`), luego las pruebas.

La cookie va con `SameSite=Lax`. Eso funciona entre subdominios del mismo
dominio (`cmms.tcihn.com` y `api.cmms.tcihn.com` son el mismo sitio para el
navegador). Si el frontend y el backend acabaran en **dominios distintos**, haría
falta `SameSite=None`, que a su vez exige `Secure` — otra razón para mantener los
dos bajo `tcihn.com`.

### Tres URLs que tienen que cuadrar

Es el error de despliegue más fácil de cometer y el más difícil de diagnosticar,
porque se manifiesta como un 401 sin explicación:

- `BETTER_AUTH_URL` y `NEXT_PUBLIC_API_URL` apuntan **al backend**.
- `CORS_ORIGIN` apunta **al frontend**.

Si `CORS_ORIGIN` no es exactamente el origen desde el que carga el navegador
—con protocolo, sin barra final—, la cookie de sesión no viaja y todo responde
401. Ver `backend/src/main.ts`.

### Opcionales

| Variable | Por defecto | Para qué |
|---|---|---|
| `RESEND_API_KEY` | *(vacío)* | 🔒 Correo saliente. **Pendiente del dominio**, ver la entrada de Intake. Sin ella el sistema funciona igual: los avisos siguen dentro de la aplicación. |
| `CORREO_REMITENTE` | *(vacío)* | `CMMS TCI <no-reply@tcihn.com>` |
| `PREVENTIVO_CRON` | `0 6 * * *` | Cuándo genera órdenes preventivas (`TCI-50`) |
| `PREVENTIVO_AUTOMATICO` | `true` | `false` la apaga |
| `AVISOS_CRON` | `0 7 * * *` | Cuándo manda el resumen de vencimientos (`TCI-52`) |
| `AVISOS_PREVENTIVOS` | `true` | `false` lo apaga |
| `REPORTES_UTC_OFFSET` | `-6` | Zona horaria del negocio. Honduras es UTC−6 todo el año |
| `EVIDENCIA_OBLIGATORIA` | `false` | Si `true`, no se puede cerrar una orden sin foto |

**Durante la carga de datos iniciales (`TCI-62`) conviene poner
`PREVENTIVO_AUTOMATICO=false`**: si no, la primera noche el generador crea una
orden por cada equipo que se acaba de dar de alta, porque ninguno tiene
preventivo previo y todos cuentan como vencidos.

---

## 3. Desplegar (TCI-69)

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

**Las migraciones se aplican solas al arrancar el backend**
(`prisma migrate deploy` en su `CMD`). En Dokploy no hay un paso previo de
despliegue donde correrlas, así que van ahí.

### El primer administrador

El registro público está cerrado: no hay pantalla de alta. La primera cuenta la
crea el seed:

```bash
docker compose -f docker-compose.prod.yml exec backend \
  sh -c 'SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npx tsx prisma/seed.ts'
```

Después de entrar, cambie esa contraseña desde el panel de usuarios.

### Comprobar que salió bien

```bash
docker compose -f docker-compose.prod.yml ps        # los tres "healthy"
curl -f https://api.cmms.tcihn.com/health           # {"status":"ok",...}
```

Los tres servicios tienen healthcheck, que es de lo que se fía Dokploy para dar
el despliegue por bueno. El del backend usa `fetch` de Node en vez de `curl`
porque la imagen es alpine y no lo trae.

---

## 4. Dominio y SSL (TCI-70)

Dokploy gestiona los certificados con Let's Encrypt. Hacen falta **dos**
registros DNS apuntando al VPS:

| Registro | Apunta a | Sirve |
|---|---|---|
| `cmms.tcihn.com` | IP del VPS | frontend, puerto 3000 |
| `api.cmms.tcihn.com` | IP del VPS | backend, puerto 3001 |

Se pueden servir bajo un solo dominio con rutas, pero entonces
`NEXT_PUBLIC_API_URL` y `CORS_ORIGIN` cambian y hay que **reconstruir la imagen
del frontend**, no solo reiniciarla (ver el punto 5).

> Este paso es el que además destraba Resend: sin dominio verificado no se puede
> firmar el correo saliente, y con él se cierran `TCI-34` y el canal de correo
> de `TCI-52` y `TCI-54`.

---

## 5. Un cuidado con el frontend

`NEXT_PUBLIC_API_URL` **se resuelve en la compilación, no al arrancar**: Next lo
incrusta en el paquete JavaScript que descarga el navegador. Por eso entra como
`build arg` y no como variable del contenedor.

Consecuencia práctica: **si cambia el dominio del backend, hay que reconstruir
la imagen del frontend.** Reiniciar el contenedor no sirve. Comprobado: el valor
aparece literalmente dentro de `.next/static/chunks/*.js`.

---

## 6. Respaldos (TCI-71)

`scripts/respaldo.sh` hace el volcado y `scripts/verificar-respaldo.sh`
comprueba que **restaura de verdad**, que es la única forma de saber que un
respaldo sirve.

```bash
./scripts/respaldo.sh                       # volcado comprimido en ./respaldos
./scripts/verificar-respaldo.sh             # restaura el último en una base temporal
```

Para que corra solo, en el crontab del host:

```cron
30 2 * * * cd /ruta/al/proyecto && ./scripts/respaldo.sh >> respaldos/respaldo.log 2>&1
```

A las 2:30, antes de que el generador preventivo empiece a escribir a las 6:00.

**Falta decidir dos cosas** y sin ellas `TCI-71` no se puede cerrar:

1. **Dónde se guardan.** Hoy quedan en `./respaldos` del propio VPS. Un respaldo
   en el mismo servidor no protege del caso que más importa —que el servidor se
   pierda—, así que hay que copiarlos fuera: MinIO, S3 u otro sitio.
2. **Cuánto se conservan.** El script borra los de más de `RETENCION_DIAS` días
   (30 por defecto).

---

## 7. Lo que falta antes de poder desplegar

| | Qué | De quién depende |
|---|---|---|
| VPS | Host, acceso, y si Dokploy ya está instalado | Cliente / equipo |
| Dominio | Cuál se usa y quién controla el DNS | Cliente |
| Secretos | Contraseña de Postgres, MinIO, `BETTER_AUTH_SECRET` | Se generan y se ponen en Dokploy |
| Respaldos | Dónde se copian fuera del VPS y retención | Decisión |
| Datos iniciales | Si TCI tiene clientes y equipos en Excel (`TCI-62`) | Cliente |
