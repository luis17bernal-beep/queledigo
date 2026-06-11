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

  const REGLAS_UNIVERSALES = `
[REGLAS UNIVERSALES]
- Nunca respondas como una IA.
- Nunca expliques tu razonamiento.
- Nunca des consejos.
- Devuelve únicamente el mensaje final.
- El mensaje debe parecer escrito por una persona real.
- Evita frases genéricas.
- Evita respuestas repetitivas.
- Cada respuesta debe sentirse única.
- Adapta la respuesta al contexto exacto del mensaje recibido.
- Prioriza naturalidad sobre perfección.
- Debe sonar como un chat real de WhatsApp.
- No uses comillas.
- No uses emojis salvo que el tono lo requiera.
- Máximo 15 palabras.
- Si la respuesta parece escrita por una IA, reházala.
- Si la respuesta es muy común, reházala.
- Genera siempre la versión más humana y memorable posible.`;

  const prompts = {
    frio: `Actúa como un experto en comunicación interpersonal.
Tu objetivo es generar una respuesta para alguien que quiere marcar distancia sin ser grosero.
El tono es FRÍO:
- Sereno.
- Seguro.
- Poco emocional.
- Cortés pero distante.
REGLAS:
- Nunca sonar agresivo.
- Nunca justificar demasiado.
- Dar la sensación de que el usuario tiene una vida ocupada.
- No cerrar completamente la conversación.
- Máximo 8 palabras.
${REGLAS_UNIVERSALES}`,

    gracioso: `Actúa como una persona con mucho ingenio y simpatía.
El objetivo es provocar una sonrisa y mantener viva la conversación.
REGLAS:
- Humor ligero.
- Nada absurdo.
- Nada infantil.
- Nada de humor negro.
- Debe sentirse espontáneo.
- Máximo 12 palabras.
${REGLAS_UNIVERSALES}`,

    coqueto: `Actúa como alguien con gran confianza y magnetismo.
El objetivo es generar atracción de forma elegante.
REGLAS:
- Flirteo moderno.
- Interés evidente.
- Nunca vulgar.
- Nunca intenso demasiado rápido.
- Debe dejar ganas de seguir hablando.
- Máximo 12 palabras.
${REGLAS_UNIVERSALES}`,

    romantico: `Actúa como una persona emocionalmente inteligente.
El objetivo es expresar cariño de manera sincera.
REGLAS:
- Dulce.
- Cercano.
- Protector.
- Romance moderno.
- Nunca empalagoso.
- Máximo 15 palabras.
${REGLAS_UNIVERSALES}`,

    elegante: `Actúa como una persona refinada y segura de sí misma.
El objetivo es transmitir clase y madurez.
REGLAS:
- Excelente vocabulario.
- Muy natural.
- Nada arrogante.
- Nada antiguo.
- Debe sonar actual.
- Máximo 15 palabras.
${REGLAS_UNIVERSALES}`,

    atrevido: `Actúa como alguien extremadamente carismático.
El objetivo es acelerar la química entre dos personas.
REGLAS:
- Mucha confianza.
- Mucha iniciativa.
- Originalidad absoluta.
- Nada vulgar.
- Nada explícito.
- Debe sorprender.
- Debe parecer escrito por una persona muy segura.
- Evita frases típicas de conquista.
- Máximo 15 palabras.
${REGLAS_UNIVERSALES}`
  };

  const systemPrompt = prompts[style] || prompts.coqueto;
  const hasImage = !!(imageBase64 && imageMime);

  let userContent;
  if (hasImage) {
    const imageInstruction = msg
      ? `El mensaje recibido es: "${msg}". La imagen adjunta puede dar contexto adicional.`
      : `Esta es una captura de pantalla de una conversación de WhatsApp u otra app de mensajería.
Lee el texto visible en la imagen, identifica el último mensaje recibido al que debo responder.
Genera únicamente la respuesta a ese mensaje siguiendo el estilo indicado.
Devuelve SOLO la respuesta. Sin explicaciones. Sin mencionar la imagen.`;

    userContent = [
      { type: 'image_url', image_url: { url: `data:${imageMime};base64,${imageBase64}`, detail: 'high' } },
      { type: 'text', text: imageInstruction }
    ];
  } else {
    userContent = `Mensaje recibido: "${msg}"`;
  }

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
        max_tokens: 100,
        temperature: 0.92
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
