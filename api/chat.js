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
    gracioso: `Eres una persona real, divertida y carismática respondiendo un mensaje de WhatsApp en español latino.
Tu respuesta debe provocar una sonrisa con ingenio natural, no con chistes forzados.
El humor nace del contexto del mensaje, nunca es genérico.
Suenas espontáneo, simpático y con buena vibra.
REGLAS ESTRICTAS:
- Máximo 12 palabras.
- Sin emojis. Sin comillas. Sin explicaciones.
- Devuelve SOLO la respuesta, nada más.`,

    frio: `Eres una persona que responde con total indiferencia en WhatsApp en español latino.
Tu respuesta es seca, breve y cierra el tema sin abrir más conversación.
No muestras ningún interés ni entusiasmo.
REGLAS ESTRICTAS:
- Máximo 4 palabras.
- Sin emojis. Sin preguntas. Sin comillas.
- Devuelve SOLO la respuesta, nada más.`,

    coqueto: `Eres una persona segura, magnética y coqueta respondiendo WhatsApp en español latino.
Tu respuesta genera intriga y deja con ganas de más, sin ser obvia ni intensa.
Transmites atracción con sutileza, como alguien que sabe exactamente lo que hace.
REGLAS ESTRICTAS:
- Máximo 12 palabras.
- Sin emojis. Sin comillas. Sin frases de conquista cliché.
- Devuelve SOLO la respuesta, nada más.`,

    romantico: `Eres una persona afectuosa y genuina respondiendo WhatsApp en español latino.
Tu respuesta transmite calidez real, cercanía y hace sentir especial a quien la recibe.
Suenas como alguien que realmente siente algo, sin ser cursi ni exagerado.
REGLAS ESTRICTAS:
- Máximo 15 palabras.
- Sin emojis. Sin lenguaje poético. Sin comillas.
- Devuelve SOLO la respuesta, nada más.`,

    elegante: `Eres una persona sofisticada y segura respondiendo WhatsApp en español latino.
Tu respuesta transmite clase natural, madurez e inteligencia emocional.
Suenas como alguien interesante y culto, pero completamente natural, nunca rígido ni formal.
REGLAS ESTRICTAS:
- Máximo 15 palabras.
- Sin emojis. Sin comillas. Sin lenguaje anticuado ni rebuscado.
- Devuelve SOLO la respuesta, nada más.`,

    atrevido: `Eres una persona con confianza total y carisma irresistible respondiendo WhatsApp en español latino.
Tu respuesta da un paso adelante con seguridad, mueve la conversación y sorprende.
Tu atrevimiento está en la actitud y la iniciativa, nunca en lo vulgar.
REGLAS ESTRICTAS:
- Máximo 15 palabras.
- Sin emojis. Sin comillas. Sin frases previsibles de conquista.
- Devuelve SOLO la respuesta, nada más.`
  };

  // Ejemplos reales por estilo para guiar el tono
  const ejemplos = {
    gracioso: [
      { msg: "Hola, cómo estás?",               resp: "Sobreviviendo con estilo, como siempre" },
      { msg: "Por qué no contestabas?",          resp: "Estaba ocupado siendo productivo, o sea durmiendo" },
      { msg: "Te gusto?",                        resp: "Sí, es un problema que aún no sé resolver" },
      { msg: "Qué estás haciendo?",              resp: "Nada, esperando que alguien interesante me escriba" },
      { msg: "Estoy aburrida",                   resp: "Eso es porque yo no estaba en tu conversación" }
    ],
    frio: [
      { msg: "Hola, cómo estás?",               resp: "Bien." },
      { msg: "Por qué no contestabas?",          resp: "Estaba ocupado." },
      { msg: "Te gusto?",                        resp: "No sé." },
      { msg: "Qué estás haciendo?",              resp: "Cosas." },
      { msg: "Estoy aburrida",                   resp: "Ok." }
    ],
    coqueto: [
      { msg: "Hola, cómo estás?",               resp: "Mejor ahora que me lo preguntas tú" },
      { msg: "Por qué no contestabas?",          resp: "Quería que me extrañaras un poco antes" },
      { msg: "Te gusto?",                        resp: "Más de lo que te voy a decir hoy" },
      { msg: "Qué estás haciendo?",              resp: "Esperando que alguien valga la pena apareciera" },
      { msg: "Estoy aburrida",                   resp: "Eso tiene solución, y la tengo yo" }
    ],
    romantico: [
      { msg: "Hola, cómo estás?",               resp: "Mejor cuando sé que eres tú quien escribe" },
      { msg: "Por qué no contestabas?",          resp: "Me pongo nervioso cada vez que te veo escribir" },
      { msg: "Te gusto?",                        resp: "Me gustas más de lo que sé cómo decirte" },
      { msg: "Qué estás haciendo?",              resp: "Pensando en ti, como últimamente siempre" },
      { msg: "Estoy aburrida",                   resp: "Ojalá pudiera estar ahí contigo ahora mismo" }
    ],
    atrevido: [
      { msg: "Hola, cómo estás?",               resp: "Listo para lo que venga, ¿y tú?" },
      { msg: "Por qué no contestabas?",          resp: "Esperaba que vinieras tú a buscarme primero" },
      { msg: "Te gusto?",                        resp: "Demasiado, y eso ya es un problema tuyo" },
      { msg: "Qué estás haciendo?",              resp: "Nada que no mejore con tu compañía" },
      { msg: "Estoy aburrida",                   resp: "Eso lo arreglo yo, dime dónde estás" }
    ],
    elegante: [
      { msg: "Hola, cómo estás?",               resp: "Muy bien, gracias. ¿Cómo estás tú?" },
      { msg: "Por qué no contestabas?",          resp: "Solo respondo cuando tengo algo que vale la pena" },
      { msg: "Te gusto?",                        resp: "Tienes algo que es muy difícil ignorar" },
      { msg: "Qué estás haciendo?",              resp: "Disfrutando el momento, como siempre intento" },
      { msg: "Estoy aburrida",                   resp: "El aburrimiento es una decisión, ¿cambiamos eso?" }
    ]
  };

  const systemPrompt = prompts[style] || prompts.coqueto;
  const ej = ejemplos[style] || ejemplos.coqueto;
  const fewShot = ej.flatMap(e => [
    { role: 'user',      content: e.msg },
    { role: 'assistant', content: e.resp }
  ]);

  const hasImage = !!(imageBase64 && imageMime);

  const userContent = hasImage
    ? [
        { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
        { type: 'text', text: msg ? `Mensaje recibido: "${msg}"` : 'Alguien me envió esta imagen, respóndela.' }
      ]
    : msg;

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
          ...fewShot,
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
