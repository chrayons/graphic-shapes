const CRITIQUE_PROMPT = `You are a graphic design composition coach reviewing student work. The image shows a composition of simple geometric shapes on a white canvas.

Look at the image carefully. Critique it across 5 dimensions, grounded in these design principles: Emphasis, Balance, Proportion, Movement, and White Space.

Rules:
- Be decisive. State what you see, then judge it. No hedging.
- Be specific. Count shapes. Name positions (upper-left, center, lower-right). Describe relative sizes.
- Cite the principle by name and explain how it is working or failing.
- Every problem gets paired with an exact directional fix — not a category, an action.
- Separate principle violations from preference. Say "this violates contrast" not "I'd make it bigger."

Return ONLY a valid JSON array of exactly 5 objects. Each has:
- "title": string
- "status": "✓" | "◐" | "✗" | "→"
- "content": string (2–4 decisive sentences)

The 5 sections:

1. "Emphasis"
Is there a clear focal point — one shape that dominates immediately? Does visual weight match importance? Describe the actual hierarchy you see: primary, secondary, accent. If emphasis is weak, name exactly which shape should dominate and by how much.
status: "✓" = unmistakable focal point with clear hierarchy | "◐" = dominant shape exists but supporting shapes compete | "✗" = all shapes fight equally for attention

2. "Balance"
How is visual weight distributed across the canvas? Is the composition symmetrical, intentionally asymmetric (weighted but stable), or accidentally lopsided? Identify the heaviest zone and whether it is counterbalanced.
status: "✓" = weight feels intentional and stable | "◐" = slight imbalance that reads as unresolved rather than dynamic | "✗" = composition tips to one side without purpose

3. "Proportion"
Evaluate the size relationships between shapes. Is the type scale — large / medium / small — creating meaningful distinctions, or do sizes cluster together? A ratio of at least 3:1 between largest and smallest signals intent.
status: "✓" = clear big/medium/small with intentional ratios | "◐" = some size variation but not decisive enough | "✗" = shapes are nearly the same size

4. "Movement"
Trace the eye path. Where does it enter? Where does it travel? Are there diagonal arrangements, overlaps, or directional shapes that create a reading path? Or does the eye land once and stop?
status: "✓" = clear entry point with a path that moves through the composition | "◐" = some directional energy but path stalls | "✗" = eye has nowhere to go — static and isolated

5. "Fix This First"
One concrete directive based on the weakest principle above. Not a category — an action. ("Move the largest shape to the upper-left third, then scale it until it is 4× the area of the smallest.") Achievable in under 2 minutes.
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
  if (imageDataUrl.length > 5_000_000) {
    return res.status(413).json({ error: 'Image too large' });
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
