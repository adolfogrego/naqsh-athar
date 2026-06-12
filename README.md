# naqsh-athar
Naqsh-Athar: El trazo que deja huella en la realidad

Un manuscrito intencionado para influir activamente sobre el destino del mundo.
Estructura
/
├── public/
│   └── index.html     ← documento principal (template único)
├── api/
│   ├── guardar.js           ← guarda HTML generado en Vercel Blob
│   └── [id].js              ← sirve HTML por timestamp ID
├── vercel.json              ← routing: / y /:id
└── package.json
URLs

naqsh-athar.link/ → portada con trazo original
naqsh-athar.link/050625150225 → pieza generada el 5 jun 2026 a las 15:02:25

Deploy

Conectar repo a Vercel
Activar Vercel Blob en el dashboard (Storage → Create)
Deploy automático desde GitHub

Trazabilidad
Cada HTML generado contiene un comentario invisible:
<!-- NAQSH_ORIGIN: https://naqsh-athar.link/050625150225 -->
que registra de qué pieza provino, permitiendo mapear la cadena de intenciones.

--------------------------

CONCEPTO ORIGINAL:

Brief Técnico y Conceptual — Naqsh-Athar
Para continuación con nuevo agente
---
1. El Proyecto
Naqsh-Athar (`naqsh-athar.link`) es una aplicación web de una sola página (SPA) que funciona como talismán digital interactivo. Es parte de Paratextual, editorial cultural mexicana de Adolfo Grego.
Concepto
El usuario recibe un objeto — físico o digital — que contiene un trazo circular con texto manuscrito intencionado. La app permite:
Leer la historia y significado del objeto en 7 diapositivas
Fotografiar su propio trazo intencionado
Convertirlo en un QR circular estilizado (el "Naqsh-Athar personalizado")
Compartirlo como imagen, vínculo vivo o documento imprimible
El talismán "circula" — cada receptor puede reintencionarlo y compartirlo.
---
2. Convocatoria
El proyecto fue desarrollado para presentarse a un concurso editorial (detalles específicos de la convocatoria no disponibles en este contexto). El entregable principal incluye:
La aplicación web funcional en `naqsh-athar.link`
Un PDF díptico horizontal A4 (4 páginas) como presentación impresa
---
3. Arquitectura Técnica
Stack
Frontend: HTML/CSS/JS vanilla — archivo único `public/index.html` (~724 KB)
Backend: Vercel Serverless Functions (Node.js)
Storage: Vercel Blob (público, región IAD1)
Dominio: `naqsh-athar.link` via Neubox/cPanel → Vercel
Repo: GitHub privado `adolfogrego/naqsh-athar`
Deploy: Auto-deploy en push a `main`
Archivos clave
```
naqsh-athar/
├── public/
│   ├── index.html     # App completa — 724 KB
│   └── 404.html       # Redirect a index para URLs desconocidas
├── api/
│   ├── guardar.js     # Recibe HTML, valida, sube a Blob
│   └── [id].js        # Sirve HTML desde Blob por timestamp ID
├── vercel.json        # Routing: /:id(12-15 dígitos) → [id].js
└── package.json
```
Variables de entorno (Vercel)
`BLOB_READ_WRITE_TOKEN` — token de escritura al Blob store
`BLOB_STORE_ID` — ID del store: `store_ExpJtLng1e3giozS`
---
4. Flujo de la Aplicación
7 Diapositivas (slider horizontal)
Portada — نقش أثر / imagen intencionada / slogan
I. Al despertar — introducción narrativa
II. Recuerdo — historia del medallón
III. El nombre — significado de Naqsh y Athar
IV. La acción — invitación a actuar
V. La intención — trazo descargable para imprimir
VI. Transmutación — captura de foto y generación del QR
Estados de la Slide 6
`empty` → trazo pulsante como portal táctil
`adjusting` → foto en canvas para centrar/zoom + botón "GRABAR Y REDIMENSIONAR"
`grabbing` → animación de procesamiento
`confirmed` → QR estilizado + botones de descarga
Variables globales críticas
Variable	Contenido
`window._styledQRUrl`	PNG del QR circular (foto + QR + árabe centrado)
`window._portalUrl`	URL personalizada con timestamp (ej: `naqsh-athar.link/080626183521`)
`croppedJpg`	Foto del usuario 900px (base64)
`croppedLowRes`	Foto 500px — se embebe en el HTML que se sube al servidor
---
5. Flujo Online vs Offline
Desde servidor (naqsh-athar.link) — Online
`confirmCrop()` → `setMode('grabbing')` → `lockSlider()`
`generateStyledQR(BASE_URL, foto)` → `_styledQRUrl` asignado → `setMode('confirmed')`
En background: `fetch('/api/guardar')` → si 200 OK → `_portalUrl` ← timestamp → QR actualizado
Botones: PNG usa `_styledQRUrl`, Compartir usa `_portalUrl`, PDF usa pdf-lib (CDN)
Desde archivo local (file://) — Online
Igual que arriba pero fetch va a `https://naqsh-athar.link/api/guardar` (URL absoluta)
Requiere CORS: `Access-Control-Allow-Origin: *` en `guardar.js` ✓
Desde archivo local — Offline
QR se genera con URL base `naqsh-athar.link` (sin timestamp)
No intenta upload
PNG y HTML descargables funcionan
PDF falla (pdf-lib viene de CDN)
---
6. Funciones Principales
`generateStyledQR(url, photoDataUrl, callback)`
Genera el QR circular estilizado en canvas:
Foto de fondo con overlay pergamino (50% opacidad)
Puntos QR circulares sobre la foto
Anclajes con gap transparente (canvas separado con `destination-out`)
نقش أثر en Amiri Bold 52px al centro, opacidad 80%
Librería `qrcode-generator` embebida inline con `window.qrcode = qrcode`
`downloadStyledPng(photoDataUrl, filename)`
Usa SVG template (coordenadas de diseñador) para descargar PNG:
Círculo 500×500 con clipPath
Fondo transparente
Foto/QR dentro del círculo
`attemptUpload()`
Siempre genera QR base primero (offline-safe)
Si online: sube `outerHTML` con foto embebida a `/api/guardar`
Si éxito: actualiza QR con URL personalizada
Mensaje "Naqsh-Athar guardado" en pantalla al completar
---
7. PDF Díptico
Generado en el cliente con `pdf-lib` (CDN, requiere conexión).
Estructura (A4 horizontal, 841×595 pt):
Página 1: Portada izq (imagen intencionada + árabe placeholder + slogan + URL) | Imagen usuario der (círculo 5cm)
Página 2: I. Al despertar (izq) | IV. La acción (der)
Página 3: II. Recuerdo (izq) | III. El nombre (der)
Página 4: Canvas vertical del trazo (mismo que PNG descargable) rotado 90° — textos invertidos izq/der, QR estilizado en 4 esquinas
Pendiente: Sustituir placeholder árabe en portada por SVG que Adolfo proporcionará.
---
8. Diseño Visual
Paleta (solo 2 colores)
`--parchment: #f5f0e8` — fondo principal, letras en contexto oscuro
`--ink: #1a1008` — negro cálido, letras en contexto claro
Tipografía
Amiri Bold — árabe (subset embebido ~5KB, woff2)
EB Garamond — cuerpo de texto (Google Fonts)
DM Sans — subtítulos y UI
Convención de botones
Fondo pergamino → botón ink, letras pergamino
Fondo negro (slide 6) → botón pergamino, letras ink
Border-radius: 8px en todos
---
9. Pendientes
[ ] SVG árabe para portada del PDF (Adolfo lo proporcionará)
[ ] Textos de ajuste fino por slide (formato ACTUAL/NUEVO que Adolfo entregará)
[ ] Segundo botón de descarga PNG — versión letras pergamino (Horizonte 2)
[ ] Stripe para CR1PT06R4MA (proyecto separado)
[ ] Revisión final del PDF díptico con imagen de usuario real
[ ] Sonidos aleatorios en la presentación (mencionado, no trabajado)
---
10. Problemas Resueltos Hoy
`window.qrcode` no asignado — la librería embebida no asignaba a `window` via el wrapper UMD. Fix: `window.qrcode = qrcode` antes del wrapper.
Redirect loop en Vercel — catch-all `/:path*` causaba loop infinito. Fix: eliminado y reemplazado por `public/404.html` con meta refresh.
`/api/guardar` interceptado — el catch-all redirigía las llamadas API al index, devolviendo HTML en vez de JSON. Fix: eliminación del catch-all.
`display:flex` inline — sobreescribía `display:none` del CSS en botón "GRABAR Y REDIMENSIONAR", apareciendo en estados incorrectos.
`lblChk` eliminado — al quitar el checkmark se eliminó el `<span id="act-lbl-chk">` pero el JS seguía buscándolo. Fix: span oculto restaurado.
---
11. Principios de Trabajo con Adolfo
Auditoría antes de cambiar: leer el código exacto antes de modificar
Texto fidelidad: cambios de texto en formato ACTUAL/NUEVO
Incremental: un cambio a la vez, verificar antes de continuar
SVG > PNG: preferir vectores para assets editables
No parches: soluciones elegantes sobre acumulación de fixes
Buenas prácticas primero: preguntar antes de implementar si hay dudas de arquitectura


ACTUALIZACIONES AL 12 DE JUNIO
Naqsh-Athar — Contexto de Desarrollo
Última actualización: 12 junio 2026  
Proyecto: Paratextual / Adolfo Grego  
Repo: `adolfogrego/naqsh-athar` (privado)  
Deploy: Vercel Hobby, auto-deploy en push a main  
Dominio: `naqsh-athar.link`
---
Stack
Frontend: HTML/CSS/JS vanilla — un solo archivo `public/index.html` (~760KB)
Backend: Vercel serverless functions en `api/`
Storage: Vercel Blob (store Public) — archivos JSON por timestamp
Dependencias: `@vercel/blob ^0.22.0` (en `package.json`)
Librerías inlined: pdf-lib, qrcode-generator, encoder GIF LZW propio
---
Estructura del repo
```
naqsh-athar/
├── api/
│   ├── guardar.js        ← POST: guarda {photo, origin, portalUrl} como JSON en Blob
│   └── \[id].js           ← GET /api/data/:id → devuelve JSON del Blob
├── public/
│   ├── index.html        ← SPA principal (\~760KB)
│   └── 404.html          ← redirect a naqsh-athar.link (solo para rutas inválidas)
├── package.json
├── vercel.json
└── README.md
```
---
vercel.json (actual)
```json
{
  "outputDirectory": "public",
  "rewrites": \[
    { "source": "/api/data/:id(\\\\d{12,15})", "destination": "/api/\[id]?id=:id" },
    { "source": "/:id(\\\\d{12,15})", "destination": "/index.html" }
  ],
  "functions": {
    "api/guardar.js": { "maxDuration": 30 },
    "api/\[id].js": { "maxDuration": 10 }
  }
}
```
---
Arquitectura de datos (nueva — junio 2026)
Guardar (POST /api/guardar)
Recibe `{photo, origin}` desde el frontend.  
Guarda `{photo, origin, portalUrl}` como `{id}.json` en Blob.  
Devuelve `{url, id}`.
`photo`: JPEG data URL, 500×500px, calidad 0.75, máx ~150KB base64
`origin`: URL completa de donde vino el usuario
`portalUrl`: `https://naqsh-athar.link/{id}` generado en el servidor
Leer (GET /api/data/:id)
Usa `list()` del SDK `@vercel/blob`.  
Devuelve el JSON directamente.  
Si no encuentra → redirect a home.
Bootstrap en el frontend
Al cargar `index.html` con un timestamp en la URL:
Detecta el ID con regex `/\\/(\\d{12,15})$/`
Hace `fetch('/api/data/{id}')`
Inyecta `NAQSH\_ORIGIN` como comment node en `<head>`
Actualiza `portada-circle.src` con la foto del JSON
Establece `window.\_portalUrl`
Llama `initPortadaFlip()`
Orden crítico: el bootstrap debe completarse antes de que `initPortadaFlip` lea el DOM.
---
Imágenes
Nombre	Variable/ID DOM	Formato	Uso
Orante	`portada-circle`	PNG 180KB embebido	Portada. En versión timestamp se sustituye por foto del usuario anterior (JPEG)
Trazo	`act-trazo-bg`, `trazo-img`	SVG embebido	Fondo slide VI, descarga slide V
`croppedJpg`: foto del usuario actual, 900px, JPEG 0.92 — para QR y PDF
`croppedLowRes`: foto del usuario actual, 500px, JPEG 0.75 — para guardar en Blob
Detección de versión: `portada-circle.src.startsWith('data:image/jpeg')` → versión timestamp
---
PDF Fanzine
Formato: carta apaisada (792×612pt), 2 páginas
Cara A — 8 paneles
Layout hoja desplegada (de izquierda a derecha, fila inferior upright / fila superior rotada 180°):
Posición	Panel	Contenido
Abajo-izq	Pages 5+6	Spread IV — "La acción" (cursiva, ancho doble)
Abajo-centro	Back Cover	QR del usuario (fallback: QR base)
Abajo-der	Front Cover	Foto usuario fade 20% + texto árabe نقش أثر arriba
Arriba-der	Pages 1+2	Spread I — "Al despertar" (cursiva, ancho doble, rotado)
Arriba-centro-der	Page 3	Sección II — "Recuerdo" (rotado)
Arriba-izq	Page 4	Sección III — "El nombre" (rotado)
Orden de lectura doblado: Front Cover → págs.1+2 (I) → pág.3 (II) → pág.4 (III) → págs.5+6 (IV) → Back Cover
Cara B — trazo completo
Trazo SVG a página completa, 6% opacidad
Textos laterales: izquierda rotado 90°CCW (Pedir/Obtener), derecha rotado 90°CW (Soltar/Dar)
QR del usuario en 4 esquinas, modo `'print'`
Líneas guía
Marcas de doblez: 1cm en cada borde para las 3 líneas verticales
Línea horizontal central: completa, grosor 0.25
Corte punteado: solo entre x=PW y x=3*PW en y=PH
Renderizado de paneles
Función `renderTextToCanvas(slideKey, panelW, panelH, isSpread, foldAtBottom)`
`embedPanel(doc, ...)` rota 180° en canvas antes de embeber como PNG
Todos los títulos anclados a `TITLE\_FROM\_FOLD\_PT = 8mm` del doblez
Spreads I y IV: fuente más grande (8pt body), cursiva, margen reducido
Fuente: Times New Roman (StandardFonts de pdf-lib)
QR en PDF
Tres modos de `generateStyledQR`:
Modo	Puntos	Uso
`'screen'`	0.12	Canvas en app
`'cover'`	0.20	Portada PDF (Front/Back Cover)
`'print'`	0.85	Esquinas trazo Cara B
Lógica QR en PDF:
`rightPhotoDataUrl`: `croppedJpg` → `portada-circle` JPEG → pergamino (fallbacks en orden)
Back Cover: QR con `rightPhotoDataUrl` en modo `'cover'`
Cara B esquinas: QR con `rightPhotoDataUrl` en modo `'print'`
Árabe: intenta cargar Amiri desde Google Fonts; falla silenciosamente si no está disponible
---
Flip card en portada
Versión base (PNG Orante): frente = Orante, reverso = QR con pergamino o `croppedJpg`
Versión timestamp (JPEG foto): frente = foto usuario anterior con fade radial 20%, reverso = QR con esa foto + URL del `NAQSH\_ORIGIN`
CSS: `outline:none; -webkit-tap-highlight-color:transparent` — sin cuadro al tap en móvil
---
Modal portal (slide VI)
Fade-in circular intercepta apertura de cámara
Cierre: tap en backdrop (con `stopPropagation` para no re-abrir)
Guard `window.\_modalOpen` previene re-apertura y conflictos de navegación
---
Helpers globales
```js
applyRadialFade(canvas, fadeStart)  // fadeStart=0.80 → último 20% desvanece
parchmentCircle()                    // canvas pergamino fallback para QR
srcToDataUrl(src)                    // imagen → PNG data URL via canvas
```
---
Simulador QR (simulador-qr.html)
Herramienta standalone ~840KB. Controles por columna (color, scan, bright):
Normalización: whitening, contraste, B&N, multiply
QR overlay: puntos, pergamino, árabe, tamaño módulo, forma, foto, fade bordes
Panel GIF animado con encoder LZW inline
Nuevo: botón "↑ Subir foto" en cada columna — reemplaza la imagen base independientemente
Toggle claro/oscuro
---
Vercel — notas operativas
Blob store debe ser Public (no Private)
`BLOB\_READ\_WRITE\_TOKEN` debe estar en Environment Variables
`addRandomSuffix: false` en `put()` para filenames limpios
La rewrite `/:id → /index.html` es necesaria para que las URLs con timestamp sirvan el SPA
Sin esa rewrite, `404.html` redirige al home antes de que el JS cargue
---
Pendientes
Inmediatos
[ ] Ajustes estéticos PDF: posición, tamaños, espaciado
[ ] Definir transparencia del QR para impresión vs pantalla vs compartir
[ ] Sonidos aleatorios de 1 segundo al mostrar el sitio
Estratégicos
[ ] OpenGraph dinámico — `api/og.js` con imagen por URL
[ ] GIF animado en `index.html` para compartir
[ ] Manual del simulador QR
[ ] Stripe para CR1PT06R4MA
[ ] Newsletter, Buffer, Taller de Escritura Continua
