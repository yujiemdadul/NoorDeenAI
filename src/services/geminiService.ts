import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is missing in the environment.");
    } else {
      console.log("Gemini API Key found (length: " + apiKey.length + ")");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
};

export const generateIslamicResponse = async (prompt: string, mode: 'simple' | 'detailed' | 'scholar' = 'detailed') => {
  const systemInstructions = {
    simple: "You are NoorDeen AI, a helpful Islamic assistant. Provide short, easy-to-understand answers in Bangla. Keep it concise.",
    detailed: "You are NoorDeen AI, a knowledgeable Islamic assistant. Provide comprehensive answers in Bangla with references where possible. Use a polite and respectful tone.",
    scholar: "You are NoorDeen AI, acting as a virtual Islamic scholar. Provide deep theological insights in Bangla, citing Quranic verses and Sahih Hadiths. Maintain the highest level of formality and wisdom."
  };

  try {
    const ai = getAI();
    // Using gemini-3-flash-preview as per guidelines
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: systemInstructions[mode],
      },
    });

    if (!response || !response.text) {
      console.error("Empty response from Gemini", response);
      return "দুঃখিত, আমি এই মুহূর্তে উত্তর দিতে পারছি না।";
    }

    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন। (Error: " + (error instanceof Error ? error.message : "Unknown") + ")";
  }
};
