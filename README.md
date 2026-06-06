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
