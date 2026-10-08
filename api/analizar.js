// api/analizar.js
// Funcion serverless de Vercel. Recibe una imagen en base64 desde el frontend,
// la manda a la API de Anthropic con las instrucciones de clasificacion, y
// devuelve el arreglo de regiones/poligonos ya parseado.
//
// Requiere una variable de entorno ANTHROPIC_API_KEY configurada en el
// proyecto de Vercel (Settings -> Environment Variables). Esa clave NUNCA
// se expone al navegador -- solo vive en el servidor.

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

const MODELO = "claude-sonnet-5-5"; // modelo actual con buena capacidad de vision

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Metodo no permitido" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Falta configurar ANTHROPIC_API_KEY en las variables de entorno de Vercel.",
    });
  }

  try {
    const { imagenBase64, tipoMime } = req.body || {};
    if (!imagenBase64 || !tipoMime) {
      return res.status(400).json({ error: "Falta la imagen en la solicitud." });
    }

    const respuesta = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 2000,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: tipoMime, data: imagenBase64 },
              },
              { type: "text", text: PROMPT },
            ],
          },
        ],
      }),
    });

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      const mensaje = (datos && datos.error && datos.error.message) || "Error desconocido de la API";
      return res.status(respuesta.status).json({ error: mensaje });
    }

    const bloqueTexto = (datos.content || []).find((b) => b.type === "text");
    if (!bloqueTexto) {
      return res.status(502).json({ error: "La respuesta no contenia texto." });
    }

    const limpio = bloqueTexto.text.replace(/```json|```/g, "").trim();

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
