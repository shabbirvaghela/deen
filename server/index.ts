import "dotenv/config";
import express from "express";
import rateLimit from "express-rate-limit";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const app = express();
const port = Number(process.env.PORT || 3001);

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing from .env");
}

const gemini = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const model = process.env.GEMINI_MODEL || "gemini-3.8-flash";

app.use(express.json({ limit: "15kb" }));

app.use(
  "/api/explain",
  rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);

app.post("/api/explain", async (req, res) => {
  const startedAt = Date.now();

  try {
    const { type, originalText, sourceTranslation, reference } = req.body ?? {};

    if (
      !["ayah", "hadith"].includes(type) ||
      typeof originalText !== "string" ||
      !originalText.trim() ||
      originalText.length > 6000 ||
      typeof sourceTranslation !== "string" ||
      sourceTranslation.length > 10000 ||
      typeof reference !== "string" ||
      reference.length > 200
    ) {
      res.status(400).json({ error: "Invalid content input." });
      return;
    }

    console.log(`[Explain] Started: ${type} (${reference})`);

    const response = await gemini.models.generateContent({
      model,
      contents: JSON.stringify({
        contentType: type,
        originalText,
        suppliedTranslation: sourceTranslation,
        reference,
      }),
      config: {
        thinkingConfig: {
          thinkingLevel: ThinkingLevel.LOW,
        },
        maxOutputTokens: 500,
        systemInstruction: `
You are Deen, an Islamic learning assistant.

Return only JSON with these six string fields:
hinglishTranslation, simpleMeaning, context, example,
practicalLesson, sourceNote.

Use simple Roman Hindi + English (Hinglish).
Be concise and avoid repeating information.

- hinglishTranslation: 1-2 short sentences.
- simpleMeaning: 1-2 short sentences.
- context: 1 short sentence.
- example: 1 everyday example.
- practicalLesson: 1 actionable sentence.
- sourceNote: 1 short sentence.

Do not invent religious references, Quran verses,
hadith wording, or scholarly consensus.
Distinguish translation from explanation.
If context is not verified, say so.
Do not issue fatwas or claim authenticity beyond
the supplied hadith data.
          `,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            hinglishTranslation: { type: "STRING" },
            simpleMeaning: { type: "STRING" },
            context: { type: "STRING" },
            example: { type: "STRING" },
            practicalLesson: { type: "STRING" },
            sourceNote: { type: "STRING" },
          },
          required: [
            "hinglishTranslation",
            "simpleMeaning",
            "context",
            "example",
            "practicalLesson",
            "sourceNote",
          ],
        },
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const output: Record<string, unknown> = JSON.parse(text);

    const requiredFields = [
      "hinglishTranslation",
      "simpleMeaning",
      "context",
      "example",
      "practicalLesson",
      "sourceNote",
    ];

    for (const field of requiredFields) {
      if (typeof output[field] !== "string" || output[field].length > 5000) {
        throw new Error("Invalid AI response format.");
      }
    }

    res.setHeader("Cache-Control", "no-store");
    res.json(output);

    console.log(`[Explain] Completed in ${Date.now() - startedAt}ms`);
  } catch (error) {
    console.error(`[Explain] Failed after ${Date.now() - startedAt}ms:`, error);

    if (res.headersSent) return;

    const message = error instanceof Error ? error.message : "Unknown error";

    const isTimeout =
      message.toLowerCase().includes("timeout") ||
      message.toLowerCase().includes("timed out");

    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout
        ? "Explanation timed out. Please try again."
        : "Explanation temporarily unavailable. Please try again.",
    });
  }
});

app.listen(port, () => {
  console.log(`Deen API running on http://localhost:${port}`);
  console.log(`Gemini model: ${model}`);
});
