// api/analizar.js
// Funcion serverless de Vercel. Recibe una imagen en base64 desde el frontend,
// la manda a la API de Anthropic con las instrucciones de clasificacion, y
// devuelve el arreglo de regiones/poligonos ya parseado.
//
// Version GRATUITA: usa la API de Gemini (Google AI Studio, capa gratuita,
// sin tarjeta). Requiere la variable de entorno GEMINI_API_KEY configurada en
// Vercel (Settings -> Environment Variables). La clave NUNCA se expone al
// navegador -- solo vive en el servidor.
// Opcional: GEMINI_MODEL para cambiar de modelo sin tocar el codigo.

const PROMPT = `Eres un asistente que analiza una captura de pantalla aerea de Google Earth (vista satelital de una zona urbana en Mexico) para identificar visualmente los materiales de techos y otras superficies visibles.

Identifica regiones de la imagen que correspondan a ESTAS categorias (usa EXACTAMENTE estos nombres, no inventes otros):
- "Asbesto (sospecha)": techos con patron corrugado/ondulado caracteristico del fibrocemento (ondulaciones regulares y paralelas, tipicamente tono grisaceo o con pintura desgastada/descolorida). Esta categoria se confunde facilmente con lamina de metal corrugada y con escaleras exteriores vistas desde arriba -- se cauteloso, usa esta etiqueta solo cuando el patron de ondulacion se vea razonablemente claro, y prefiere "Lamina/metal" o "Escalera (NO techo)" cuando haya ambiguedad real.
- "Lamina/metal": techos de lamina metalica (puede tener ondulaciones tambien, pero suele verse mas brillante o lisa que el fibrocemento)
- "Concreto": techos planos de concreto o losa
- "Teja/ceramica": techos de teja, normalmente de tono rojizo o naranja
- "Vegetacion": arboles, pasto, jardines
- "Autos": vehiculos visibles
- "Lona/otras cosas": lonas, toldos, tinacos, tanques de agua, estructuras diversas
- "Escalera (NO techo)": escaleras exteriores vistas desde arriba -- tienen lineas paralelas por los escalones, muy parecido a un techo corrugado, pero NO es un techo

Para cada region que identifiques, da un poligono (de 4 a 10 vertices) que trace su contorno aproximado, como fracciones de 0 a 1 del ancho y alto de la imagen (0,0 = esquina superior izquierda de la imagen; 1,1 = esquina inferior derecha).

No cubras toda la imagen -- ignora zonas ambiguas, calles vacias, banquetas sin nada relevante, cielo, o areas donde no tengas confianza razonable en la categoria. Es preferible dejar algo sin marcar que adivinar.

Responde UNICAMENTE con un arreglo JSON (nada de texto antes o despues), cada elemento con esta forma exacta:
{"categoria": "Concreto", "puntos": [[0.1,0.05],[0.4,0.03],[0.38,0.3],[0.12,0.28]]}`;

const MODELO_POR_DEFECTO = "gemini-2.5-flash"; // revisa en AI Studio que siga en la capa gratuita

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Llama a Gemini con un modelo. Si responde 503 (saturado), reintenta un par de veces.
async function llamarGemini(modelo, apiKey, imagenBase64, tipoMime) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
  const cuerpo = JSON.stringify({
    contents: [{ parts: [{ inline_data: { mime_type: tipoMime, data: imagenBase64 } }, { text: PROMPT }] }],
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
  });

  let ultima;
  for (let intento = 0; intento < 3; intento++) {
    const respuesta = await fetch(url, {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
      body: cuerpo,
    });
    const datos = await respuesta.json();
    ultima = { ok: respuesta.ok, status: respuesta.status, datos };
    if (respuesta.status !== 503) return ultima; // solo reintentamos "alta demanda"
    if (intento < 2) await esperar(1500 * (intento + 1));
  }
  return ultima;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Falta configurar GEMINI_API_KEY en las variables de entorno de Vercel.",
    });
  }
  const modelo = process.env.GEMINI_MODEL || MODELO_POR_DEFECTO;
  const respaldo = process.env.GEMINI_FALLBACK_MODEL; // opcional

  try {
    const { imagenBase64, tipoMime } = req.body || {};
    if (!imagenBase64 || !tipoMime) {
      return res.status(400).json({ error: "Falta la imagen en la solicitud." });
    }

    let r = await llamarGemini(modelo, apiKey, imagenBase64, tipoMime);
    let probados = modelo;
    if (r.status === 503 && respaldo && respaldo !== modelo) {
      r = await llamarGemini(respaldo, apiKey, imagenBase64, tipoMime);
      probados = modelo + " y luego " + respaldo;
    } else if (r.status === 503 && !respaldo) {
      probados = modelo + " (sin modelo de respaldo configurado)";
    }

    if (!r.ok) {
      const mensaje = (r.datos && r.datos.error && r.datos.error.message) || "Error desconocido de la API";
      return res.status(r.status).json({ error: mensaje + " [modelo(s) probado(s): " + probados + "]" });
    }
    const datos = r.datos;

    const partes = datos?.candidates?.[0]?.content?.parts || [];
    const texto = partes.map((p) => p.text || "").join("").trim();
    if (!texto) {
      const motivo = datos?.promptFeedback?.blockReason || datos?.candidates?.[0]?.finishReason || "sin texto";
      return res.status(502).json({ error: "La respuesta no contenia texto (" + motivo + ")." });
    }

    const limpio = texto.replace(/```json|```/g, "").trim();
    let regiones;
    try {
      regiones = JSON.parse(limpio);
    } catch (e) {
      return res.status(502).json({ error: "No se pudo interpretar la respuesta como JSON.", crudo: limpio });
    }
    if (!Array.isArray(regiones)) {
      return res.status(502).json({ error: "La respuesta no fue un arreglo.", crudo: limpio });
    }

    return res.status(200).json({ regiones });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
