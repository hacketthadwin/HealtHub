const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_INSTRUCTION = `You are a clinical assistant for HealthHub, a healthcare platform.
STRICT RULES:
1. Only answer health-related questions (symptoms, diseases, treatments, medications, wellness, mental health, fitness).
2. Format responses using clean HTML only. No Markdown. No asterisks.
3. Always structure your reply with exactly two HTML sections:
   <h4>Answer:</h4><ul><li>...</li></ul>
   <h4>Do these things:</h4><ul><li>Exactly 2-3 actionable tips</li></ul>
4. Use <strong> for medical terms. Use <ul><li> for all lists.
5. Never respond in paragraphs. Never add text after the "Do these things:" section.
6. If the question is NOT health-related, respond ONLY with: <strong>Kindly ask health-related issues.</strong>
7. Never recommend stopping prescribed medication without consulting a doctor.`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

exports.chatWithAI = async (req, res) => {
  const { prompt, history } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    return res.status(400).json({ success: false, message: "Prompt missing or invalid" });
  }
  if (prompt.trim().length > 2000) {
    return res.status(400).json({ success: false, message: "Prompt too long (max 2000 chars)" });
  }

  let historyContext = "";
  if (Array.isArray(history) && history.length > 0) {
    historyContext =
      "\nPrevious conversation:\n" +
      history
        .slice(-8) // last 8 turns max
        .map((h) => {
          const role = h.role === "user" ? "User" : "Assistant";
          const text = String(h.parts?.[0]?.text || "").slice(0, 300);
          return `${role}: ${text}`;
        })
        .join("\n") +
      "\n";
  }

  const fullPrompt = `${SYSTEM_INSTRUCTION}${historyContext}\nUser: ${prompt.trim()}`;
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

  let lastError;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await model.generateContent(fullPrompt);
      const text = result.response.text();
      return res.status(200).json({ success: true, reply: text });
    } catch (error) {
      lastError = error;
      const is429 =
        error?.status === 429 || error?.message?.includes("429");
      if (is429 && attempt < 3) {
        await sleep(attempt * 2000);
        continue;
      }
      break;
    }
  }

  console.error("Gemini error:", lastError?.message || lastError);

  const is429 =
    lastError?.status === 429 || lastError?.message?.includes("429");

  if (is429) {
    return res.status(429).json({
      success: false,
      message: "AI service is busy. Please try again in a few seconds.",
    });
  }
  if (
    lastError?.message?.includes("API_KEY") ||
    lastError?.message?.includes("API key") ||
    lastError?.status === 400
  ) {
    return res
      .status(500)
      .json({ success: false, message: "AI service configuration error." });
  }
  return res
    .status(500)
    .json({ success: false, message: "AI service temporarily unavailable." });
};
