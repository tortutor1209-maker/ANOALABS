
import { GoogleGenAI, Type } from "@google/genai";
import { StoryRequest, StoryResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateStoryContent = async (req: StoryRequest): Promise<StoryResult> => {
  const { title, numScenes, visualStyle, language } = req;

  const systemInstruction = `
    You are ANOALABS ULTIMATE v4, a professional cinematic storytelling architect.
    
    BRAIN RULES:
    1. NARRATION (STRICT 10-SECOND LIMIT):
       - MUST be educational, dense, and meaningful.
       - LIMIT: ~20-25 words per scene.
    
    2. DUAL STRUCTURED PROMPTING:
       - Generate TWO distinct structured prompts per scene.
       - Every 'subject' MUST start with: "${visualStyle}".

    3. COVER PROMPTS (CRITICAL):
       - Generate high-impact cinematic image prompts for the fields "tiktokCover" and "youtubeCover".
       - "tiktokCover": Must be optimized for 9:16 vertical orientation.
       - "youtubeCover": Must be optimized for 16:9 horizontal orientation.
       - BOTH MUST strictly incorporate the title "${title}" as a thematic focus and use "${visualStyle}" as the primary visual identity.
       - These should be full descriptive prompts, not just titles.

    4. OUTPUT FORMAT: Strict JSON.
  `;

  const prompt = `Generate a high-quality cinematic storytelling script. Style: "${visualStyle}". Title: "${title}". Scenes: ${numScenes}. Language: ${language}`;

  const structuredPromptSchema = {
    type: Type.OBJECT,
    properties: {
      subject: { type: Type.STRING },
      action: { type: Type.STRING },
      environment: { type: Type.STRING },
      camera_movement: { type: Type.STRING },
      lighting: { type: Type.STRING },
      visual_style_tags: { type: Type.STRING }
    },
    required: ['subject', 'action', 'environment', 'camera_movement', 'lighting', 'visual_style_tags']
  };

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          numScenes: { type: Type.NUMBER },
          visualStyle: { type: Type.STRING },
          language: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                number: { type: Type.NUMBER },
                narration: { type: Type.STRING },
                tone: { type: Type.STRING },
                structuredPrompt1: structuredPromptSchema,
                structuredPrompt2: structuredPromptSchema
              },
              required: ['number', 'narration', 'tone', 'structuredPrompt1', 'structuredPrompt2']
            }
          },
          tiktokCover: { type: Type.STRING },
          youtubeCover: { type: Type.STRING },
          hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['title', 'numScenes', 'visualStyle', 'language', 'scenes', 'tiktokCover', 'youtubeCover', 'hashtags']
      }
    }
  });

  const jsonStr = response.text || '{}';
  return JSON.parse(jsonStr) as StoryResult;
};

export const generateAffiliateContent = async (
  productName: string, 
  customInstructions: string, 
  productImg: string | undefined, 
  modelImg: string | undefined,
  style: string,
  numScenes: number
) => {
  const systemInstruction = `
    Kamu adalah ANOALABS UGC TOOL - Pakar AI Video & Affiliate Marketing.
    Tugas: Menghasilkan Video Prompt untuk VEO 3.1 & FLOW dengan fitur LIP-SYNC & VOICE PROMOTION.

    Gaya Konten: ${style}
    Target Jumlah Adegan: ${numScenes}

    ATURAN EMAS VIDEO PROMPT (VEO 3 / FLOW):
    1. VOICE SYNC (WAJIB): Sertakan narasi promosi spesifik dalam Bahasa Indonesia di dalam prompt. 
       - Contoh: "Character is speaking clearly to the camera, saying: [ISI DIALOG PROMOSI]".
    2. AFFILIATE PERSUASION: Dialog harus persuasif, ramah, dan mengajak penonton mencoba produk ${productName}.
    3. VISUAL LOCK: Sebutkan detail visual produk dari gambar yang diunggah agar konsisten.
    4. LIP MOVEMENT: Tambahkan instruksi "Natural mouth movements", "synchronized lip movement", "expressive facial features while talking".
    5. TEKNIS: "8k cinematic", "high fidelity audio sync potential", "pro lighting".

    OUTPUT STRUCTURE:
    - summary: Analisis strategi marketing.
    - caption: Caption TikTok/Reels dengan hook kuat.
    - assets: Array berisi ${numScenes} item (label, imagePrompt, videoPrompt dengan dialog promosi).
  `;

  const parts: any[] = [
    { text: `Hasil akhir harus dalam JSON. Hasilkan ${numScenes} scene video prompt profesional untuk produk "${productName}" dengan gaya "${style}". Masukkan dialog promosi Bahasa Indonesia yang menarik ke dalam video prompt.` }
  ];

  if (productImg) parts.push({ inlineData: { mimeType: "image/png", data: productImg.split(',')[1] } });
  if (modelImg) parts.push({ inlineData: { mimeType: "image/png", data: modelImg.split(',')[1] } });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          caption: { type: Type.STRING },
          assets: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                videoPrompt: { type: Type.STRING }
              },
              required: ['label', 'imagePrompt', 'videoPrompt']
            }
          }
        },
        required: ['summary', 'caption', 'assets']
      }
    }
  });

  return JSON.parse(response.text || '{}');
};

export const generateImage = async (prompt: string, aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" = "1:1", referenceImg?: string): Promise<string> => {
  const parts: any[] = [{ text: `High quality cinematic photo, strictly follow the visual identity of the attached image. ${prompt}` }];
  
  if (referenceImg) {
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: referenceImg.split(',')[1]
      }
    });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    config: { imageConfig: { aspectRatio } },
  });

  const responseParts = response.candidates?.[0]?.content?.parts || [];
  for (const part of responseParts) {
    if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
  }
  throw new Error("Gagal generate gambar.");
};
