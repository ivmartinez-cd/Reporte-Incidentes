import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const thinkingBudget = process.env.GEMINI_THINKING_BUDGET !== undefined ? Number(process.env.GEMINI_THINKING_BUDGET) : undefined;

console.log(`Iniciando prueba de API de Gemini usando modelo: ${model}...`);
const ai = new GoogleGenAI({ apiKey });

try {
  const config = {};
  if (thinkingBudget !== undefined) {
    config.thinkingConfig = { thinkingBudget };
  }
  
  const response = await ai.models.generateContent({
    model,
    contents: "Hola, responde con la palabra 'OK' si recibes este mensaje.",
    config,
  });
  console.log("Respuesta recibida exitosamente:");
  console.log(response.text);
  console.log("Usage metadata:", JSON.stringify(response.usageMetadata));
} catch (err) {
  console.error("Error en la llamada a la API:");
  console.error(err);
}
