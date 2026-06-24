import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const model = "gemini-2.5-pro";

console.log("Iniciando prueba de API de Gemini...");
const ai = new GoogleGenAI({ apiKey });

try {
  const response = await ai.models.generateContent({
    model,
    contents: "Hola, responde con la palabra 'OK' si recibes este mensaje.",
  });
  console.log("Respuesta recibida exitosamente:");
  console.log(response.text);
  console.log("Usage metadata:", JSON.stringify(response.usageMetadata));
} catch (err) {
  console.error("Error en la llamada a la API:");
  console.error(err);
}
