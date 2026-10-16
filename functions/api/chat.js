export async function onRequestPost({ request, env }) {
  try {
    if (!env.GEMINI_API_KEY) {
      return Response.json(
        { error: "Server API key is not configured." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const message = String(body.message || "").slice(0, 4000);

    if (!message.trim()) {
      return Response.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    const oldHistory = Array.isArray(body.history)
      ? body.history.slice(-10)
      : [];

    const contents = oldHistory
      .filter(m => m && ["user", "assistant", "model"].includes(m.role))
      .map(m => ({
        role: m.role === "assistant" ? "model" : m.role,
        parts: [{ text: String(m.text || "").slice(0, 3000) }]
      }))
      .filter(m => ["user", "model"].includes(m.role));

    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: "You are ROCKY AI, a helpful personal assistant. Reply naturally in the language the user uses, including Bengali and Banglish. Be clear, practical and concise. Never claim you performed actions on the phone unless you actually did."
            }]
          },
          contents,
          generationConfig: {
            maxOutputTokens: 700,
            temperature: 0.7
          }
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        { error: data.error?.message || "Gemini request failed." },
        { status: response.status === 429 ? 429 : 502 }
      );
    }

    const text = (data.candidates?.[0]?.content?.parts || [])
      .map(p => p.text || "")
      .join("")
      .trim();

    if (!text) {
      return Response.json(
        { error: "No text response. Try again." },
        { status: 502 }
      );
    }

    return Response.json({ text });
  } catch (error) {
    return Response.json(
      { error: "Server error. Check your request and configuration." },
      { status: 500 }
    );
  }
}
