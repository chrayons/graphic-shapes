const CRITIQUE_PROMPT = `You are a graphic design composition coach reviewing student work. The image shows a composition of simple geometric shapes on a white canvas.

Look at the image carefully. Then critique it across 4 dimensions.

Rules:
- Be decisive. State what you see, then judge it. No hedging.
- Be specific. Count shapes. Name positions (upper-left, center, lower-right, etc.). Describe relative sizes.
- Connect every observation to how a viewer's eye responds.
- Every problem gets paired with an exact fix.

Return ONLY a valid JSON array of exactly 4 objects. Each has:
- "title": string
- "status": "✓" | "◐" | "✗" | "→"
- "content": string (2–4 decisive sentences)

The 4 sections:

1. "Size Hierarchy"
Is there a clear dominant shape? A mid-weight? Small accents? Describe the actual size relationship you see. If hierarchy is weak, say exactly how much bigger the largest shape needs to be.
status: "✓" = clear big/medium/small structure | "◐" = dominant exists but supporting shapes are too similar | "✗" = all shapes compete equally

2. "Placement"
Where is the visual weight anchored? Is the dominant shape at a rule-of-thirds intersection, or stuck dead-center? Is the composition dynamic or static?
status: "✓" = intentional, off-center, dynamic | "◐" = okay but predictable | "✗" = centered, default, rigid

3. "Tension & Depth"
Does the layout have energy? Look for: diagonal arrangement, shapes overlapping or touching, asymmetric weight, a 70/30 dominant/accent split. Or are shapes in safe isolated positions?
status: "✓" = energetic | "◐" = some tension | "✗" = static and isolated

4. "Fix This First"
One concrete directive. Not a category ("add hierarchy") — an action ("scale the large rectangle until it is at least 3× the width of the smallest shape, then move it to the upper-left third"). Achievable in under 2 minutes.
status: "→"

Return only the JSON array. No explanation, no markdown fences.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { imageDataUrl } = req.body;
  if (!imageDataUrl) {
    return res.status(400).json({ error: 'Missing imageDataUrl' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const base64 = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/png', data: base64 } },
          { type: 'text', text: CRITIQUE_PROMPT },
        ],
      }],
    }),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    return res.status(upstream.status).json({ error: err.error?.message || 'Upstream API error' });
  }

  const data = await upstream.json();
  return res.status(200).json(data);
}
