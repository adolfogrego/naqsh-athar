# naqsh-athar

**Naqsh-Athar** (نقش أثر) — El trazo que deja huella en la realidad.

Un manuscrito intencionado para influir activamente sobre el destino del mundo.
Proyecto de [Paratextual](https://paratextual.mx) / Adolfo Grego.

---

## Concepto

El usuario recibe un objeto —físico o digital— que contiene un trazo circular con texto manuscrito intencionado. La app permite:

1. Leer la historia y significado del objeto en 8 diapositivas
2. Transmitir el talismán (compartir vínculo o imagen) desde la slide de coin-flip
3. Descargar el trazo puro en la slide del trazo
4. Fotografiar su propio trazo intencionado y convertirlo en un QR circular estilizado
5. Compartir el Naqsh-Athar personalizado como imagen, vínculo vivo o documento imprimible

El talismán "circula" — cada receptor puede reintencionarlo y compartirlo.

---

## Estructura del repositorio

```
naqsh-athar/
├── public/
│   ├── index.html     # SPA completa (~862 KB, 5156 líneas)
│   └── 404.html       # Redirect a naqsh-athar.link (rutas inválidas)
├── api/
│   ├── guardar.js          # POST: guarda {photo, origin} → JSON en Blob
│   ├── guardar-orante.js   # POST: guarda imagen del Orante para og.js
│   ├── [id].js             # GET /api/data/:id → devuelve JSON del Blob
│   ├── og.js               # GET /api/og → genera imagen OG (1200×630 o 400×400)
│   └── page.js             # GET /:id → sirve index.html con OG tags inyectados
├── vercel.json
├── package.json
└── README.md
```

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | HTML/CSS/JS vanilla — un solo archivo `public/index.html` |
| Backend | Vercel Serverless Functions (Node.js ESM) |
| Storage | Vercel Blob (store público) |
| Dominio | `naqsh-athar.link` vía Neubox/cPanel → Vercel |
| Repositorio | GitHub privado `adolfogrego/naqsh-athar` |
| Deploy | Auto-deploy en push a `main` |

---

## Dependencias (`package.json`)

```json
{
  "name": "naqsh-athar",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@vercel/blob": "^0.22.0",
    "@napi-rs/canvas": "^0.1.44",
    "qrcode": "^1.5.4"
  }
}
```

- `@vercel/blob` — almacenamiento de JSON con foto + metadatos
- `@napi-rs/canvas` — renderizado de imágenes OG server-side (requerido por `og.js`)
- `qrcode` — generación de matriz QR server-side (requerido por `og.js`)

**Librerías inlineadas en `index.html`:**
- `pdf-lib` (CDN, `unpkg.com/pdf-lib@1.17.1`) — generación del PDF fanzine
- `qrcode-generator` — generación de QR client-side (embebida, `window.qrcode = qrcode`)
- Encoder GIF/LZW propio

---

## Variables de entorno (Vercel)

| Variable | Uso |
|---|---|
| `BLOB_READ_WRITE_TOKEN` | Token de escritura al Blob store |
| `BLOB_STORE_ID` | ID del store: `store_ExpJtLng1e3giozS` |

---

## Routing (`vercel.json`)

```json
{
  "outputDirectory": "public",
  "rewrites": [
    { "source": "/api/data/:id(\\d{12,15})", "destination": "/api/[id]?id=:id" },
    { "source": "/api/og",                   "destination": "/api/og" },
    { "source": "/:id(\\d{12,15})",          "destination": "/api/page?id=:id" }
  ],
  "functions": {
    "api/guardar.js":        { "maxDuration": 30 },
    "api/guardar-orante.js": { "maxDuration": 15 },
    "api/[id].js":           { "maxDuration": 10 },
    "api/og.js":             { "maxDuration": 15 },
    "api/page.js":           { "maxDuration": 10 }
  }
}
```

Las URLs con timestamp (`/:id`) pasan por `api/page.js` —no sirven `index.html` directamente— para que los scrapers sociales reciban los OG tags correctos server-side.

---

## URLs

| URL | Qué hace |
|---|---|
| `naqsh-athar.link/` | Portada con trazo Orante original |
| `naqsh-athar.link/050625150225` | Pieza generada el 5 jun 2025 a las 15:02:25 |
| `naqsh-athar.link/api/og` | Imagen OG 1200×630 de la portada base (Orante) |
| `naqsh-athar.link/api/og?id=050625150225&mode=og` | Imagen OG 1200×630 de una pieza concreta |
| `naqsh-athar.link/api/og?id=050625150225` | PNG 400×400 descargable (foto+QR) |
| `naqsh-athar.link/api/data/050625150225` | JSON crudo de la pieza |

---

## Arquitectura de datos

### Guardar (POST `/api/guardar`)

Recibe `{ photo, origin }` desde `index.html`. Valida y guarda en Blob:

```json
{ "photo": "data:image/jpeg;base64,...", "origin": "https://...", "portalUrl": "https://naqsh-athar.link/DDMMYYHHMISS" }
```

- `photo` — JPEG 500×500 px, calidad 0.75, máx ~300 KB base64 (`croppedLowRes`)
- `origin` — URL completa de donde vino el usuario
- `portalUrl` — `https://naqsh-athar.link/{id}` generado en el servidor

Devuelve `{ url, id }`.

### Guardar Orante (POST `/api/guardar-orante`)

Guarda la imagen del Orante en `orante.json` para que `og.js` pueda usarla en la URL base. Tiene lógica de caché: no sobreescribe si ya existe.

Llamada silenciosa y automática desde `index.html` al cargar (2 segundos de retraso, solo si la imagen de portada es `data:image/`).

### Leer (GET `/api/data/:id`)

Devuelve el JSON completo. Valida que la estructura contenga `photo`, `origin` y `portalUrl`; devuelve 422 si está incompleta. Redirige a home si no se encuentra.

### OG Image (GET `/api/og`)

Tres modos:

| Caso | Parámetros | Salida |
|---|---|---|
| Portada base | sin `id` | PNG 1200×630 con foto del Orante desde `orante.json` |
| OG de pieza | `?id=...&mode=og` | PNG 1200×630 con foto del usuario |
| Descarga | `?id=...` (sin `mode`) | PNG 400×400 con foto+QR para compartir |

Usa `@napi-rs/canvas` y la librería `qrcode`.

### Page server-side (GET `/:id`)

Lee `public/index.html` e inyecta los OG tags correctos:
- `og:image` → `https://naqsh-athar.link/api/og?id={id}&mode=og`
- `og:url` → `https://naqsh-athar.link/{id}`
- `og:title` → `Naqsh-Athar · {id}`

Los scrapers (WhatsApp, Telegram, LinkedIn, etc.) reciben caché de 1 hora. Los navegadores reciben `no-store` para que el JS siempre cargue fresco.

---

## Estructura de las 8 slides

| Posición | ID/Clase | Contenido |
|---|---|---|
| 0 | `.portada` | Portada — Orante con flip card (frente/reverso con QR) |
| 1 | — | **I. Al despertar** — introducción narrativa |
| 2 | — | **II. Recuerdo** — historia del medallón |
| 3 | — | **III. El nombre** — significado de Naqsh y Athar |
| 4 | — | **IV. La acción** — invitación a actuar |
| 5 | `#slide-trans` | **¿Qué debo hacer ahora?** — coin flip, transmisión |
| 6 | `.trazo-slide` | **El trazo** — SVG puro descargable |
| 7 | `#activar-slide` | **Activar** — cámara y generación del QR personal |

El slider usa transición especial al cambiar entre slide 5 (trans) y slide 6 (trazo): fade en lugar de deslizamiento.

---

## Paleta de colores

La app usa **6 variables CSS** (no 2):

| Variable | Valor | Uso |
|---|---|---|
| `--parchment` | `#f5f0e8` | Fondo principal, texto en contexto oscuro |
| `--parchment-mid` | `#e8e0cc` | Hover de botones en fondo claro |
| `--parchment-dark` | `#c4b896` | Subtítulos, textos secundarios |
| `--ink` | `#1a1008` | Negro cálido, texto en contexto claro |
| `--ink-mid` | `#5a3e28` | Cuerpo de texto en slides |
| `--ink-faint` | `#9a8a6a` | Textos terciarios, dots de navegación inactivos |
| `--ink-ghost` | `rgba(90,62,40,0.25)` | Sombras y separadores |

---

## Tipografía

| Fuente | Carga | Uso |
|---|---|---|
| Amiri Bold | Google Fonts | Textos árabes (`نقش أثر`) |
| EB Garamond | Google Fonts | Todo el cuerpo, títulos, botones |

> No se usa DM Sans.

---

## Variables globales críticas

| Variable / Función | Tipo | Descripción |
|---|---|---|
| `croppedJpg` | `string\|null` | Foto del usuario 900 px, JPEG 0.92 — para QR y PDF |
| `croppedLowRes` | `string\|null` | Foto del usuario 500 px, JPEG 0.75 — para guardar en Blob |
| `window._styledQRUrl` | `string\|null` | Data URL PNG del QR circular (pantalla) |
| `window._portalUrl` | `string\|null` | URL personalizada `https://naqsh-athar.link/{id}` |
| `window._modalOpen` | `boolean` | Guard: previene apertura múltiple del modal de cámara |
| `sliderLocked` | `boolean` | Bloquea navegación de slides durante captura |
| `lockSlider()` / `unlockSlider()` | funciones | Controlan `sliderLocked` |
| `setMode(m)` | función | Gestiona los 4 estados de `#activar-slide` |
| `confirmCrop()` | función | Genera `croppedJpg` y `croppedLowRes`, luego `attemptUpload()` |
| `attemptUpload()` | función | Genera QR base primero (offline-safe), luego sube a Blob |
| `generateStyledQR(url, photo, cb, mode)` | función | Genera QR circular estilizado en canvas |
| `generateResultImage(photo, cb)` | función | Genera imagen resultado tras el crop |
| `initPortadaFlip()` | función | Inicializa el flip card de portada |
| `transToggleTransmit()` | función | Abre/cierra sub-grupo de botones (slide 5) |
| `transShareLink()` | función | Comparte vínculo desde slide 5 |
| `transShareImage()` | función | Comparte imagen desde slide 5 |
| `transRegenerar()` | función | Regenera el coin flip (slide 5) |

---

## Flujo de la aplicación

### Bootstrap (al cargar con timestamp en URL)

1. Detecta ID con regex `/\/(\d{12,15})$/`
2. `fetch('/api/data/{id}')` → obtiene JSON
3. Inyecta `NAQSH_ORIGIN` como comment node en `<head>`
4. Actualiza `#portada-circle` con la foto del JSON
5. Establece `window._portalUrl`
6. Llama `initPortadaFlip()`

### Slide 5 — Coin flip / Transmisión

La moneda tiene dos caras generadas en canvas:
- Frente: Orante o foto del usuario anterior (versión timestamp)
- Reverso: QR estilizado con la foto y la URL de origen

Botones: **Transmitir** (toggle), **Vínculo**, **Imagen**, **Regenerar**.

### Slide 7 — Activar (estados)

| Estado | UI visible |
|---|---|
| `empty` | Trazo SVG pulsante como portal táctil |
| `adjusting` | Canvas con foto para centrar/zoom + botón "GRABAR Y REDIMENSIONAR" |
| `grabbing` | Animación de procesamiento |
| `confirmed` | QR estilizado + botones de descarga |

### Flujo de `attemptUpload()`

```
confirmCrop()
  → setMode('grabbing') → lockSlider()
  → generateResultImage(croppedJpg, cb)
      → generateStyledQR(BASE_URL, photo, ..., 'screen')  # QR de pantalla
      → generateStyledQR(BASE_URL, photo, ..., 'print')   # QR para PDF
      → window._styledQRUrl = printQrDataUrl
      → setMode('confirmed')
  → [background] fetch('/api/guardar', { photo: croppedLowRes, origin })
      → si 200 OK: window._portalUrl = url → regenera QR con URL personalizada
```

### Modos de `generateStyledQR`

| Modo | Tamaño puntos | Uso |
|---|---|---|
| `'screen'` | 0.12 | Canvas en la app |
| `'cover'` | 0.20 | Portada PDF (Front/Back Cover) |
| `'print'` | 0.85 | Esquinas trazo Cara B del PDF |

---

## Flujo Online vs Offline

| Escenario | Comportamiento |
|---|---|
| Servidor online | Upload a Blob → `_portalUrl` con timestamp → QR actualizado |
| Archivo local + online | Fetch a URL absoluta `https://naqsh-athar.link/api/guardar` (CORS: `*`) |
| Archivo local offline | QR con URL base `naqsh-athar.link` — PNG y HTML funcionan — PDF falla (pdf-lib viene de CDN) |

---

## PDF Fanzine

**Formato:** carta apaisada (792×612 pt), 2 páginas.

### Cara A — 8 paneles

Layout hoja desplegada (izquierda a derecha, fila inferior upright / fila superior rotada 180°):

| Posición | Panel | Contenido |
|---|---|---|
| Abajo-izq | Pages 5+6 | Spread IV — "La acción" (cursiva, ancho doble) |
| Abajo-centro | Back Cover | QR del usuario (fallback: QR base) |
| Abajo-der | Front Cover | Foto usuario fade 20% + texto árabe |
| Arriba-der | Pages 1+2 | Spread I — "Al despertar" (cursiva, ancho doble, rotado) |
| Arriba-centro-der | Page 3 | Sección II — "Recuerdo" (rotado) |
| Arriba-izq | Page 4 | Sección III — "El nombre" (rotado) |

Orden de lectura doblado: Front Cover → I → II → III → IV → Back Cover.

### Cara B — trazo completo

- Trazo SVG a página completa, 6% opacidad
- Textos laterales: izquierda rotado 90° CCW (Pedir/Obtener), derecha rotado 90° CW (Soltar/Dar)
- QR del usuario en 4 esquinas, modo `'print'`
- Líneas guía: marcas de doblez, línea horizontal central, corte punteado

**Fuente:** Times New Roman (StandardFonts de pdf-lib). Intenta cargar Amiri desde Google Fonts para el árabe; falla silenciosamente si no está disponible.

---

## Imágenes

| Nombre | Elemento DOM | Formato | Uso |
|---|---|---|---|
| Orante | `#portada-circle` | PNG ~180 KB inlineado | Portada base. En versión timestamp se sustituye por JPEG del usuario anterior |
| Trazo | `#act-trazo-bg`, `.trazo-img` | SVG inlineado | Fondo slide 7, descarga slide 6 |

**Detección de versión:** `portada-circle.src.startsWith('data:image/jpeg')` → versión timestamp.

---

## OpenGraph dinámico

`api/og.js` carga desde Blob `arabic-text.json` para superponer el texto árabe sobre las imágenes OG. Si el blob no existe, falla silenciosamente.

`api/guardar-orante.js` guarda `orante.json` la primera vez que alguien carga la portada base (llamada automática desde `index.html` con 2 s de retraso).

---

## Deploy

1. Conectar repo a Vercel
2. Activar Vercel Blob en el dashboard (Storage → Create) — debe ser **Public**, no Private
3. Agregar variables de entorno: `BLOB_READ_WRITE_TOKEN`, `BLOB_STORE_ID`
4. Deploy automático desde GitHub en push a `main`

> `addRandomSuffix: false` en `put()` para filenames limpios.
> La rewrite `/:id → /api/page.js` es necesaria para que las URLs con timestamp sirvan el SPA con OG correcto.

---

## Trazabilidad

Cada pieza guardada contiene en su JSON el campo `origin` (URL de donde provino el usuario), permitiendo mapear la cadena de intenciones. En el HTML cargado se inyecta como:

```html
<!-- NAQSH_ORIGIN: https://naqsh-athar.link/050625150225 -->
```

---

## Problemas resueltos (histórico)

| Problema | Fix |
|---|---|
| `window.qrcode` no asignado | La librería embebida no asignaba a `window` vía wrapper UMD. Fix: `window.qrcode = qrcode` antes del wrapper |
| Redirect loop en Vercel | Catch-all `/:path*` causaba loop. Fix: eliminado, reemplazado por `public/404.html` con meta refresh |
| `/api/guardar` interceptado | El catch-all redirigía llamadas API al index. Fix: eliminación del catch-all |
| `display:flex` inline | Sobreescribía `display:none` del CSS en "GRABAR Y REDIMENSIONAR", apareciendo en estados incorrectos |
| `lblChk` eliminado | Al quitar el checkmark se eliminó `<span id="act-lbl-chk">` pero el JS lo buscaba. Fix: span oculto restaurado |

---

## Pendientes

**Inmediatos**
- [ ] Ajustes estéticos PDF: posición, tamaños, espaciado
- [ ] Definir transparencia del QR para impresión vs pantalla vs compartir
- [ ] Sonidos aleatorios de 1 segundo al mostrar el sitio

**Estratégicos**
- [ ] GIF animado en `index.html` para compartir
- [ ] Manual del simulador QR (`simulador-qr.html`)
- [ ] Stripe para CR1PT06R4MA
- [ ] Newsletter, Buffer, Taller de Escritura Continua

---

## Principios de trabajo

- **Auditoría antes de cambiar:** leer el código exacto antes de modificar
- **Fidelidad de texto:** cambios en formato ACTUAL/NUEVO
- **Incremental:** un cambio a la vez, verificar antes de continuar
- **SVG > PNG:** preferir vectores para assets editables
- **No parches:** soluciones elegantes sobre acumulación de fixes
- **Buenas prácticas primero:** preguntar antes de implementar si hay dudas de arquitectura
