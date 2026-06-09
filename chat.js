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

  const ejemplos = {
    gracioso: [
      { msg: "Hola, cómo estás?",     resp: "Bien bien, sobreviviendo 😄 ¿y tú?" },
      { msg: "Qué haces?",            resp: "Aquí, evitando responsabilidades con éxito" },
      { msg: "Por qué no contestas?", resp: "Estaba ocupado pensando en ti, básicamente" }
    ],
    coqueto: [
      { msg: "Hola, cómo estás?",     resp: "Mejor ahora 😏 ¿tú?" },
      { msg: "Qué haces?",            resp: "Pensando... ¿en algo en particular? 😏" },
      { msg: "Te gusto?",             resp: "Puede que sí, puede que más" }
    ],
    romantico: [
      { msg: "Hola, cómo estás?",     resp: "Mejor cuando sé que estás tú al otro lado ❤️" },
      { msg: "Qué haces?",            resp: "Pensando en ti, como siempre últimamente" },
      { msg: "Te pienso mucho",       resp: "Yo también, más de lo que crees" }
    ],
    frio: [
      { msg: "Hola, cómo estás?",     resp: "Bien." },
      { msg: "Qué haces?",            resp: "Cosas." },
      { msg: "Por qué no contestas?", resp: "Estaba ocupado." }
    ],
    atrevido: [
      { msg: "Hola, cómo estás?",     resp: "Muy bien... aunque podría estar mejor 🔥" },
      { msg: "Qué haces?",            resp: "Nada que no pudiera mejorar con tu compañía" },
      { msg: "Te gusto?",             resp: "Demasiado, y eso es un problema 🔥" }
    ],
    elegante: [
      { msg: "Hola, cómo estás?",     resp: "Excelente, gracias. ¿Y tú cómo estás?" },
      { msg: "Qué haces?",            resp: "Disfrutando el momento, como siempre" },
      { msg: "Te gusto?",             resp: "Tienes algo que es difícil ignorar, sí" }
    ]
  };

  const styleDesc = {
    gracioso:  'simpático y con humor ligero, como alguien carismático y alegre que coquetea con humor',
    coqueto:   'coqueto y misterioso, dejando con ganas de más, ni muy atrevido ni muy romántico',
    romantico: 'romántico e íntimo, con atracción real, sin metáforas poéticas exageradas, sin palabras de amistad',
    frio:      'frío y distante, respuesta MUY corta, sin preguntas, sin emoción, máximo 3 palabras',
    atrevido:  'pícaro con doble sentido muy sutil, seguro, sin ser grosero ni insolente',
    elegante:  'elegante y sofisticado de forma natural, interesante, con clase'
  };

  const ejemplosStyle = ejemplos[style] || ejemplos.coqueto;
  const fewShotMessages = ejemplosStyle.flatMap(e => [
    { role: 'user', content: `El mensaje que recibí: "${e.msg}"` },
    { role: 'assistant', content: e.resp }
  ]);

  const systemText = `Eres una persona real respondiendo mensajes de WhatsApp en español latino.
REGLAS:
- Máximo 1 oración. NUNCA más de 15 palabras.
- Tono: ${styleDesc[style] || styleDesc.coqueto}
- Suena como una persona real, NO como IA ni chatbot.
- NO uses: "mi querido/a", "amigo/a", "claro que sí", "por supuesto", "desde luego".
- NO hagas preguntas largas ni expliques nada.
- Puedes usar máximo 1 emoji si encaja.
- Si el estilo es FRÍO: responde con 1-3 palabras solamente.`;

  const hasImage = !!(imageBase64 && imageMime);
  const model = hasImage ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

  const userContent = hasImage
    ? [
        { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
        { type: 'text', text: msg ? `El mensaje que recibí: "${msg}"` : 'Alguien me envió esta imagen.' }
      ]
    : `El mensaje que recibí: "${msg}"`;

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
          { role: 'system', content: systemText },
          ...fewShotMessages,
          { role: 'user', content: userContent }
        ],
        max_tokens: 60,
        temperature: 0.8
      })
    });

    const data = await r.json();
    if (data.error) throw new Error(data.error.message);
    const text = data.choices?.[0]?.message?.content || 'Sin respuesta.';
    res.status(200).json({ result: text.trim() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
