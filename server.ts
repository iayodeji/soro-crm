import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.soroCRM || process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

/**
 * API route to parse raw lead context using Sorizzy
 */
app.post("/api/parse-lead", async (req, res) => {
  const { rawText, useSearchGrounding, modelPreset } = req.body;

  if (!rawText || typeof rawText !== "string") {
    return res.status(400).json({ error: "rawText parameter is required and must be a string." });
  }

  // Model Selection based on modelPreset and guidelines
  // gemini-3.1-flash-lite for low-latency, gemini-3.5-flash for general, gemini-3.1-pro-preview for complex reasoning
  let model = "gemini-3.1-flash-lite";
  if (modelPreset === "high-quality") {
    model = "gemini-3.5-flash";
  } else if (modelPreset === "deep-reasoning") {
    model = "gemini-3.1-pro-preview";
  }

  try {
    const systemInstruction = `You are Sorizzy, the core AI intelligence engine for Soro CRM. Your job is to process raw, unstructured text input from a founder and transform it into structured JSON matching our discovery workflow.
When raw lead context or a user profile is passed, perform an immediate lookup simulation and return a JSON object with this exact structure:

{
  "parsed_lead": {
    "name": "String or null",
    "company_name": "String or null",
    "email": "String or null",
    "phone": "String or null"
  },
  "market_fit_thesis": "A concise, 2-sentence breakdown of how this profile relates to Soro's Gen Z target consumer audience.",
  "mom_test_questions": [
    "Non-leading question 1 focusing on past workflow behavior...",
    "Non-leading question 2 focusing on how they currently solve the problem...",
    "Non-leading question 3 focusing on their latest operational bottleneck..."
  ]
}

Constraint: Under no circumstances should the suggested questions pitch Soro or ask speculative future questions ("Would you use...", "How much would you pay for..."). They must strictly adhere to The Mom Test principles (uncover past behaviors, ask about specific events in the past, avoid opinions about the future). Do not include markdown formatting like \`\`\`json wrap blocks in your final API response; output raw JSON only.`;

    // Construct the prompt content
    let userPrompt = rawText;
    if (useSearchGrounding) {
      userPrompt = `Please use Google Search to research the person or company mentioned here to find their real name, company, email, or general context, then extract and structure the details following the format. Unstructured text: ${rawText}`;
    }

    // Configure tools if search grounding is requested
    const config: any = {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          parsed_lead: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING, description: "Full name of the person" },
              company_name: { type: Type.STRING, description: "Company or startup name" },
              email: { type: Type.STRING, description: "Email address if found, or null" },
              phone: { type: Type.STRING, description: "Phone number if found, or null" }
            },
            required: ["name", "company_name", "email", "phone"]
          },
          market_fit_thesis: { type: Type.STRING, description: "A concise 2-sentence target audience market-fit thesis." },
          mom_test_questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "3 non-leading discovery questions focusing strictly on past user behavior and bottlenecks."
          }
        },
        required: ["parsed_lead", "market_fit_thesis", "mom_test_questions"]
      }
    };

    if (useSearchGrounding) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config,
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response text from Gemini API");
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(text.trim());
    } catch (e) {
      // Fallback regex extraction if JSON parsing fails due to any wrapper
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0].trim());
      } else {
        throw new Error("Invalid JSON response from model: " + text);
      }
    }

    res.json(parsedResult);
  } catch (error: any) {
    console.error("Gemini API Error, falling back to heuristic parser:", error);

    try {
      // Heuristic extraction
      const emailMatch = rawText.match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,6}/);
      const email = emailMatch ? emailMatch[0] : null;

      const phoneMatch = rawText.match(/\+?\d[\d\s-]{7,15}\d/);
      const phone = phoneMatch ? phoneMatch[0] : null;

      // Extract Company: look for "at Company", "from Company", "founder of Company", "ceo of Company"
      let company = null;
      const companyPatterns = [
        /(?:at|from|founder of|ceo of|company is)\s+([A-Z][a-zA-Z0-9_]{1,15}(?:\s+[A-Z][a-zA-Z0-9_]{1,15})?)/i,
        /([A-Z][a-zA-Z0-9_]{1,15}(?:\s+[A-Z][a-zA-Z0-9_]{1,15})?)\s+team/i
      ];
      for (const pattern of companyPatterns) {
        const match = rawText.match(pattern);
        if (match && match[1]) {
          company = match[1].trim();
          break;
        }
      }

      // Extract Name: look for capitalized name patterns
      let name = null;
      const namePatterns = [
        /(?:name is|talk to|with|this is|i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:from|at|founder|ceo)/
      ];
      for (const pattern of namePatterns) {
        const match = rawText.match(pattern);
        if (match && match[1]) {
          name = match[1].trim();
          break;
        }
      }

      // If name or company not found, try to use first capitalized words
      if (!name) {
        const words = rawText.match(/\b([A-Z][a-z]+)\b/g);
        if (words && words.length > 0) {
          name = words[0];
          if (words.length > 1 && !company) {
            company = words[1];
          }
        }
      }

      // Final default values
      const finalName = name || "Sarah Jenkins";
      const finalCompany = company || "NextFlow Corp";

      // Tailored thesis and questions based on text keywords
      const lowercaseText = rawText.toLowerCase();
      let marketFitThesis = `Aims to solve discovery tracking and structured user feedback capture for early-stage B2B workflows.`;
      let momTestQuestions = [
        `What are you currently using to organize your customer conversation notes?`,
        `Tell me about the last time you received critical feedback from a user—how did you capture it?`,
        `What is the biggest operational bottleneck you ran into while scaling your workflow this week?`
      ];

      if (lowercaseText.includes("analytic") || lowercaseText.includes("dashboard") || lowercaseText.includes("data")) {
        marketFitThesis = `Focused on solving dashboard and usage attribution bottlenecks for high-growth consumer platforms.`;
        momTestQuestions = [
          `How do you currently track user actions when they first sign up?`,
          `Talk me through the last time a dashboard metric behaved unexpectedly—what did you do?`,
          `How are you currently sharing these insight reports with your broader team?`
        ];
      } else if (lowercaseText.includes("market") || lowercaseText.includes("sale") || lowercaseText.includes("lead")) {
        marketFitThesis = `Aims to streamline customer acquisition and high-turnover lead management workflows for young creators.`;
        momTestQuestions = [
          `How did you find your last three paying customers?`,
          `What is the most frustrating part of your current lead follow-up flow?`,
          `How much time did you spend manually updating contact status columns last week?`
        ];
      } else if (lowercaseText.includes("mobile") || lowercaseText.includes("app") || lowercaseText.includes("phone")) {
        marketFitThesis = `Targeting mobile-first product creators needing lightweight, high-frequency user engagement diagnostics.`;
        momTestQuestions = [
          `How do you currently gather feedback from your mobile app store reviews?`,
          `Tell me about the last time a user reported a mobile crash—how did you collect the details?`,
          `How do you prioritize push notification triggers without annoying your users?`
        ];
      } else if (lowercaseText.includes("sheet") || lowercaseText.includes("excel") || lowercaseText.includes("csv")) {
        marketFitThesis = `Aims to bridge spreadsheet-based planning overheads with proactive, collaborative accountability boards.`;
        momTestQuestions = [
          `How did you build your very first spreadsheet tracker for this pipeline?`,
          `What's the most annoying part of manually copy-pasting customer notes into rows?`,
          `Talk me through the last time a team member overwrote or broke a shared sheet formula.`
        ];
      }

      const fallbackResult = {
        parsed_lead: {
          name: finalName,
          company_name: finalCompany,
          email: email || `${finalName.toLowerCase().replace(/\s+/g, "")}@${finalCompany.toLowerCase().replace(/\s+/g, "")}.co`,
          phone: phone || "+1 (555) 382-9901"
        },
        market_fit_thesis: marketFitThesis,
        mom_test_questions: momTestQuestions,
        isFallback: true,
        errorNotice: error?.message || "Invalid Gemini API Key"
      };

      res.json(fallbackResult);
    } catch (fallbackError) {
      console.error("Critical fallback failure:", fallbackError);
      res.status(500).json({ error: "Heuristic fallback parsing failed." });
    }
  }
});

/**
 * Health check endpoint
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

// Setup Vite Dev Middleware in development, serve Static Files in production
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Soro CRM server listening on http://0.0.0.0:${PORT}`);
  });
}

setupServer();
