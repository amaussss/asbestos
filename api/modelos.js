// api/modelos.js
// Abre https://TU-SITIO.vercel.app/api/modelos para ver que modelos puede usar
// TU clave de Gemini para generar contenido. Sirve para elegir GEMINI_MODEL y
// GEMINI_FALLBACK_MODEL sin adivinar nombres.
export default async function handler(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Falta GEMINI_API_KEY." });
  try {
    const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", {
      headers: { "x-goog-api-key": apiKey },
    });
    const datos = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: datos?.error?.message || "Error al listar modelos" });
    const modelos = (datos.models || [])
      .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
      .map((m) => m.name.replace(/^models\//, ""))
      .sort();
    return res.status(200).json({
      modelo_configurado: process.env.GEMINI_MODEL || "(ninguno, usa el de por defecto)",
      respaldo_configurado: process.env.GEMINI_FALLBACK_MODEL || "(ninguno)",
      modelos_disponibles_para_tu_clave: modelos,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
