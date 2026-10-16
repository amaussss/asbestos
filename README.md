# Identificador automático de materiales — versión 100% gratuita

Página web independiente: subes una captura de Google Earth y un modelo de
visión (Gemini, capa gratuita de Google AI Studio) marca los materiales con
polígonos de colores.

Costo total: **$0** — GitHub (gratis) + Vercel plan Hobby (gratis, uso
personal/no comercial) + Gemini API capa gratuita (sin tarjeta de crédito).

## Qué incluye

```
asbesto-vercel/
├── api/analizar.js   ← funcion serverless: recibe la imagen y llama a Gemini
├── index.html         ← la pagina (frontend)
├── package.json
└── README.md
```

## Paso 1 — Clave gratuita de Gemini

1. Entra a https://aistudio.google.com/ con una cuenta de Google.
2. "Get API key" → "Create API key".
3. Copia la clave. **No agregues método de pago** — la capa gratuita no lo pide.

## Paso 2 — Sube el código a GitHub

Crea un repositorio y sube los archivos manteniendo la estructura
(`api/analizar.js`, `index.html`, `package.json`).

## Paso 3 — Despliega en Vercel

1. Vercel → "Add New Project" → importa el repositorio.
2. En **Environment Variables** agrega:
   - `GEMINI_API_KEY` = tu clave del Paso 1
   - (opcional) `GEMINI_MODEL` = nombre de otro modelo, si el de por defecto
     (`gemini-2.5-flash`) deja de estar en la capa gratuita
3. Deploy. No hay build step.

## Limitaciones de lo gratis (importante saberlas)

- **Límite de uso:** la capa gratuita tiene un tope de solicitudes por minuto
  y por día (cambia con el tiempo; tus límites reales se ven en AI Studio).
  Para uso personal o de pocas personas alcanza; para mucha gente a la vez, no.
- **Privacidad:** en la capa gratuita, Google puede usar lo que envías para
  mejorar sus productos (revisa sus términos actuales). Son capturas de
  satélite públicas, pero no subas nada sensible.
- **Disponibilidad:** Google cambia qué modelos son gratuitos. Si da error de
  cuota o "modelo no encontrado", cambia `GEMINI_MODEL` por otro que AI Studio
  marque como gratuito.
- **Calidad sin probar:** el código está probado con respuestas simuladas
  (parseo, errores, flujo completo del frontend), pero NO con Gemini real.
  Qué tan bien identifica techos en estas imágenes borrosas es una pregunta
  abierta — la confusión lámina/metal vs. fibrocemento vs. escaleras sigue
  siendo difícil para cualquier modelo. Pruébalo con las 6 imágenes de
  validación (terreno confirmado) antes de confiar en él.

## Si algo falla

- **500 "Falta configurar GEMINI_API_KEY"** → revisa el nombre exacto de la
  variable en Vercel y haz un redeploy.
- **429 / "quota"** → llegaste al límite gratuito; espera un minuto o al día
  siguiente.
- **400 / 403 "API key not valid"** → clave mal copiada; genera otra.
- **404 "model not found"** → cambia `GEMINI_MODEL`.
- **502 "sin texto (SAFETY)"** → el modelo bloqueó la respuesta; reintenta.
