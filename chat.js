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

  const styleInstructions = {
    gracioso:  `Responde con alegría y un toque coqueto, como alguien simpático que hace sonreír. 
                No es una broma ni un chiste. Es alguien carismático que responde con energía positiva y un guiño sutil.
                Ejemplo de tono: "Bien y tú? Aunque contigo siempre es mejor el día 😄"`,

    coqueto:   `Responde de forma coqueta y equilibrada — ni muy atrevida ni muy romántica. 
                Como alguien que genera intriga y deja querer más, con una sonrisa implícita.
                Ejemplo de tono: "Bien, aunque mejor ahora que me preguntas 😏"`,

    romantico: `Responde de forma romántica e íntima, con emoción real y atracción genuina.
                Como alguien que siente algo especial por la otra persona.
                NUNCA uses palabras de amistad. Sin exceso de metáforas poéticas.
                Ejemplo de tono: "Mejor cuando sé que hay alguien como tú pensando en mí ❤️"`,

    frio:      `Responde con UNA sola oración muy corta, seca y distante.
                Sin emoción, sin preguntas, sin interés aparente.
                Ejemplo de tono: "Bien." o "Aquí, ¿y?"`,

    atrevido:  `Responde de forma pícara y con doble sentido muy sutil — sin pasarse de la raya.
                Como alguien seguro y divertido que deja volar la imaginación sin ser grosero.
                Ejemplo de tono: "Muy bien... aunque podría estar mejor con la compañía correcta 🔥"`,

    elegante:  `Responde con clase y sofisticación natural, como alguien interesante y seguro.
                Con vocabulario refinado pero sin sonar pretencioso.
                Ejemplo de tono: "Excelente, gracias. ¿Y tú, cómo llevas el día?"`
  };

  const systemText = `Eres una persona real respondiendo un mensaje de chat en español latino.
REGLAS OBLIGATORIAS:
- Máximo 1-2 oraciones. NUNCA más de 2.
- Suena como una persona real, natural y espontánea. NUNCA como una IA.
- NO uses: "mi querido/a", "amigo/a", "estimado/a", "por supuesto", "claro que sí".
- NO seas insolente, agresivo ni sarcástico en exceso.
- NO expliques, no philosophes, no des lecciones.
- Responde directamente al mensaje recibido.
- Puedes usar 1 emoji máximo si encaja naturalmente.
${styleInstructions[style] || styleInstructions.coqueto}`;

  const hasImage = !!(imageBase64 && imageMime);
  const model = hasImage ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.3-70b-versatile';

  const userContent = hasImage
    ? [
        { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}` } },
        { type: 'text', text: msg ? `El mensaje que recibí dice: "${msg}"` : 'Alguien me envió esta imagen. Respóndela de forma natural.' }
      ]
    : `El mensaje que recibí dice: "${msg}"`;

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
          { role: 'user', content: userContent }
        ],
        max_tokens: 100,
        temperature: 0.85
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
