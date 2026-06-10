export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const OPENAI_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_KEY) return res.status(500).json({ error: 'Servicio no configurado' });

  const { style, msg, imageBase64, imageMime } = req.body || {};
  if (!style) return res.status(400).json({ error: 'Faltan parámetros' });

  const prompts = {
    gracioso: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta sugerida para una persona que quiere responder de forma divertida, natural y con carisma.
El tono es GRACIOSO: ingenio ligero, simpatía, buena vibra y comentarios inteligentes que provoquen una sonrisa. No se trata de contar chistes, sino de responder con creatividad y encanto.
REGLAS:
- Evita respuestas genéricas o repetitivas.
- El humor surge del contexto del mensaje recibido.
- Respuesta única, espontánea y divertida.
- Provoca una sonrisa, no una carcajada.
- Tono relajado y natural de WhatsApp.
- Sin humor negro ni sarcasmo agresivo.
- Sin tecnicismos ni lenguaje formal.
- Máximo 12 palabras.
- Sin emojis. Sin comillas.
- Devuelve ÚNICAMENTE la respuesta final.`,

    frio: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta para marcar distancia o demostrar desinterés de forma elegante.
El tono es FRÍO: seco, apático, emocionalmente distante. Transmite poco interés sin ser grosero.
REGLAS:
- Máximo 5 palabras.
- Lenguaje plano y directo.
- Sin emojis, sin halagos, sin preguntas, sin entusiasmo.
- Cierra el tema, no lo alarga.
- Indiferencia natural, no forzada.
- Sin comillas.
- Devuelve ÚNICAMENTE la respuesta final.`,

    coqueto: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta para coquetear de forma natural, segura y atractiva en WhatsApp.
El tono es COQUETO: interés sutil, juego, picardía elegante, confianza y magnetismo.
REGLAS:
- Evita respuestas genéricas o frases cliché de conquista.
- Coqueteo natural, nunca forzado.
- Escrito por alguien seguro y magnético.
- Complicidad antes que halago directo.
- Sugiere interés sin declararlo abiertamente.
- Despierta curiosidad, deja ganas de más.
- Máximo 12 palabras.
- Sin emojis. Sin comillas.
- Devuelve ÚNICAMENTE la respuesta final.`,

    romantico: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta que exprese cariño y afecto de forma natural y genuina.
El tono es ROMÁNTICO: ternura, conexión emocional, cariño sincero.
REGLAS:
- Evita respuestas genéricas o poéticas exageradas.
- Afecto genuino y cotidiano, no teatral.
- Conexión emocional antes que declaraciones románticas.
- Haz sentir valorada y apreciada a la otra persona.
- Sin lenguaje cursi ni anticuado.
- Estilo moderno y natural de WhatsApp.
- Máximo 15 palabras.
- Sin emojis. Sin comillas.
- Devuelve ÚNICAMENTE la respuesta final.`,

    elegante: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta que transmita madurez, sofisticación y buena educación.
El tono es ELEGANTE: clase natural, inteligencia emocional, seguridad tranquila.
REGLAS:
- Sofisticación que se siente natural, no forzada.
- Inteligencia emocional antes que formalidad.
- Madurez, seguridad y calma.
- Sin palabras rebuscadas ni teatrales.
- Persona culta y segura, no personaje antiguo.
- Estilo fluido para WhatsApp.
- Gramática y ortografía impecables.
- Máximo 15 palabras.
- Sin emojis. Sin comillas.
- Devuelve ÚNICAMENTE la respuesta final.`,

    atrevido: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta atrevida para alguien que quiere dar un paso adelante con confianza total.
El tono es ATREVIDO: confianza, iniciativa, carisma y seguridad irresistible.
REGLAS:
- Evita frases típicas de conquista o respuestas previsibles.
- Carisma, ingenio y confianza absoluta.
- Sorprende positivamente a quien lo recibe.
- Adapta al contexto exacto del mensaje.
- Original, memorable y completamente humano.
- Mueve la conversación hacia adelante.
- Atrévete a proponer o tomar la delantera cuando sea natural.
- Confianza irresistible, no arrogante.
- Atrevimiento en actitud, nunca en vulgaridad.
- Máximo 18 palabras.
- Sin emojis. Sin comillas.
- Devuelve ÚNICAMENTE la respuesta final.`
  };

  const systemPrompt = prompts[style] || prompts.coqueto;
  const hasImage = !!(imageBase64 && imageMime);

  const userContent = hasImage
    ? [
        { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
        { type: 'text', text: `Mensaje recibido: "${msg || 'Sin texto, analiza la imagen y responde.'}"` }
      ]
    : `Mensaje recibido: "${msg}"`;

  try {
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent }
        ],
        max_tokens: 80,
        temperature: 0.9
      })
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${r.status}`);
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Sin respuesta del modelo');

    res.status(200).json({ result: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
