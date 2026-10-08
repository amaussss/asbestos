# Identificador automático de materiales — versión Vercel

Misma herramienta que la versión dentro de Claude, pero como una página web
independiente que tú controlas por completo. No depende de ninguna
capacidad especial de Claude.ai — llama directamente a la API de Anthropic
con tu propia clave.

## Qué incluye

```
asbesto-vercel/
├── api/
│   └── analizar.js     ← funcion serverless: recibe la imagen, llama a la API de Anthropic
├── index.html           ← la pagina (frontend)
├── package.json
└── README.md
```

Ya probado localmente (sintaxis, parseo de respuestas, manejo de errores,
y el flujo completo del frontend) — ver la conversación para el detalle de
las pruebas. Lo único que no se pudo probar es la llamada real a la API,
porque requiere tu clave.

## Paso 1 — Consigue una clave de API de Anthropic

Esto es **distinto** a tu cuenta normal de claude.ai. Ve a:

**https://console.anthropic.com/** → crea una cuenta/inicia sesión → sección
"API Keys" → crea una clave nueva (empieza con `sk-ant-...`).

**Importante:** esto tiene costo por uso (no es parte de una suscripción de
Claude.ai) — se cobra por imagen analizada, centavos de dólar por análisis
aproximadamente. Vas a necesitar agregar un método de pago en la consola.

## Paso 2 — Sube el código a GitHub

1. Crea un repositorio nuevo en GitHub (puede ser privado).
2. Sube estos 4 archivos (`api/analizar.js`, `index.html`, `package.json`,
   `README.md`) manteniendo la misma estructura de carpetas.

## Paso 3 — Despliega en Vercel

1. En vercel.com, "Add New Project" → importa el repositorio de GitHub.
2. Antes de darle "Deploy", ve a **Environment Variables** y agrega:
   - Nombre: `ANTHROPIC_API_KEY`
   - Valor: tu clave `sk-ant-...` del Paso 1
3. Dale "Deploy". Vercel detecta automáticamente `index.html` como sitio
   estático y `api/analizar.js` como función serverless — no necesitas
   configurar nada más (no hay build step).

## Paso 4 — Pruébalo

Abre la URL que te da Vercel (algo como `tu-proyecto.vercel.app`), sube una
captura de Google Earth, y dale "Analizar con Claude".

## Si algo falla

- **Error 500 "Falta configurar ANTHROPIC_API_KEY"** → revisa que la variable
  de entorno esté bien escrita en Vercel (exactamente `ANTHROPIC_API_KEY`,
  sin espacios) y vuelve a desplegar (Vercel a veces necesita un redeploy
  después de agregar variables nuevas).
- **Error 401 "invalid x-api-key"** → la clave está mal copiada o fue
  revocada en la consola de Anthropic.
- **Error 429 / "rate limit"** → espera un momento y reintenta; o revisa tus
  límites de uso en console.anthropic.com.

## Nota sobre el modelo usado

El código usa `claude-sonnet-5-5` (línea `MODELO` en `api/analizar.js`).
Si en el futuro quieres usar otro modelo (más barato/rápido o más
capaz), solo cambia ese valor — revisa los modelos disponibles en
la documentación de Anthropic antes de cambiarlo.
