import express from 'express';
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

// API Route: AI Insights
app.post("/api/insights", async (req, res) => {
  try {
    const { data } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: "Gemini API key not configured" });
    }

    const genAI = new GoogleGenAI({ 
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    
    const response = await genAI.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Based on this dairy delivery data: ${JSON.stringify(data)}, provide 3 short bullet points of business insights or optimizations. Keep it professional and encouraging.`
    });

    res.json({ insights: response.text });
  } catch (error) {
    console.error("AI Insight Error:", error);
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

// API Route: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

export default app;
