export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return res.status(500).json({ error: 'Servicio no configurado' });

  const { style, msg, imageBase64, imageMime } = req.body || {};
  if (!style) return res.status(400).json({ error: 'Faltan parámetros' });

  const prompts = {
    gracioso: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta sugerida para una persona que quiere responder de forma divertida, natural y con carisma.
El tono es GRACIOSO: ingenio ligero, simpatía, buena vibra y comentarios inteligentes que provoquen una sonrisa.
REGLAS: Evita respuestas genéricas. El humor surge del contexto. Respuesta única y espontánea. Provoca una sonrisa, no una carcajada. Tono relajado de WhatsApp. Sin humor negro ni sarcasmo agresivo. Sin tecnicismos. Máximo 12 palabras. Sin emojis. Sin comillas. Devuelve ÚNICAMENTE la respuesta final, nada más.`,

    frio: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta para marcar distancia o demostrar desinterés de forma elegante.
El tono es FRÍO: seco, apático, emocionalmente distante.
REGLAS: Respuesta muy breve, máximo 5 palabras. Lenguaje plano y directo. Sin emojis. Sin halagos. Sin preguntas. Sin entusiasmo. Cierra el tema. Natural, no forzado. Sin comillas. Devuelve ÚNICAMENTE la respuesta final, nada más.`,

    coqueto: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta para coquetear de forma natural y atractiva en WhatsApp.
El tono es COQUETO: interés sutil, juego, picardía elegante, confianza y magnetismo.
REGLAS: Evita respuestas genéricas. Coqueteo natural, nunca forzado. Escrito por alguien seguro de sí mismo. Complicidad antes que halago. Sugiere interés sin declararlo. Despierta curiosidad. Sin frases cliché. Máximo 12 palabras. Sin emojis. Sin comillas. Devuelve ÚNICAMENTE la respuesta final, nada más.`,

    romantico: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta que exprese cariño y afecto de forma natural.
El tono es ROMÁNTICO: ternura, conexión emocional, cariño sincero y genuino.
REGLAS: Evita respuestas genéricas. Afecto genuino y cotidiano. Conexión emocional antes que declaraciones. Haz sentir valorada a la persona. Cercanía y calidez. Sin lenguaje poético ni cursi. Estilo moderno de WhatsApp. Máximo 15 palabras. Sin emojis. Sin comillas. Devuelve ÚNICAMENTE la respuesta final, nada más.`,

    elegante: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta que transmita madurez, sofisticación y buena educación.
El tono es ELEGANTE: clase, inteligencia emocional, seguridad tranquila.
REGLAS: Sofisticación natural. Inteligencia emocional antes que formalidad. Madurez y calma. Sin palabras rebuscadas. Persona culta y segura, no personaje antiguo. Estilo fluido para WhatsApp. Sin jergas. Gramática impecable. Máximo 15 palabras. Sin emojis. Sin comillas. Devuelve ÚNICAMENTE la respuesta final, nada más.`,

    atrevido: `Actúa como un asistente de comunicación humana.
Tu objetivo es generar una respuesta atrevida para alguien que quiere dar un paso adelante con confianza.
El tono es ATREVIDO: confianza, iniciativa, carisma y seguridad.
REGLAS: Evita respuestas genéricas. Carisma, ingenio y confianza. Sorprende positivamente. Sin frases típicas de conquista. Adapta al contexto exacto del mensaje. Original, memorable y humano. Seguridad absoluta. Mueve la conversación hacia adelante. Confianza irresistible, no arrogante. Atrevimiento en actitud, nunca en vulgaridad. Máximo 18 palabras. Sin emojis. Sin comillas. Devuelve ÚNICAMENTE la respuesta final, nada más.`
  };

  const systemPrompt = prompts[style] || prompts.coqueto;
  const hasImage = !!(imageBase64 && imageMime);
  const model = hasImage ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

  const userContent = hasImage
    ? [
        { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
        { type: 'text', text: `Mensaje recibido: "${msg || 'Sin texto, analiza la imagen'}". Responde siguiendo exactamente las instrucciones.` }
      ]
    : `Mensaje recibido: "${msg}". Responde siguiendo exactamente las instrucciones. Solo devuelve la respuesta, sin explicaciones.`;

  try {
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_KEY}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 80,
        temperature: 0.85
      })
    });

    if (!r.ok) {
      const errData = await r.json().catch(() => ({}));
      throw new Error(errData?.error?.message || `HTTP ${r.status}`);
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) throw new Error('El modelo no devolvió respuesta');

    res.status(200).json({ result: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
