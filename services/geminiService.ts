
import { GoogleGenAI, Type } from "@google/genai";
import { ReplySuggestion, ChatPersona } from "../types";

// Initialize AI
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateReplySuggestions = async (prompt: string): Promise<ReplySuggestion[]> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `你是一位职场经验丰富的“理性前辈”和“暖心助手”。现在请你作为用户的“嘴替”，以【下属】的身份，帮他回复这条消息。
    
    收到的消息内容（来自领导或同事）：${prompt}
    
    请严格生成以下2个版本的回复：
    1. 严肃专业版：用词严谨、职业化、边界清晰，体现出下属的专业素质和高效执行力。
    2. 温暖活泼版：亲和力强、积极乐观、带一点点温度和幽默感，适合关系较好的同事或比较开明的领导。

    输出要求：
    - 必须包含：标题 (title)、回复正文 (text)、理性分析 (rationalAnalysis)、暖心话 (warmSupport)。
    - 理性分析：说明为什么要这样回复。
    - 暖心话：一句话舒缓用户的职场压力。
    
    输出必须是严格的JSON数组格式。`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            text: { type: Type.STRING },
            rationalAnalysis: { type: Type.STRING },
            warmSupport: { type: Type.STRING }
          },
          required: ["title", "text", "rationalAnalysis", "warmSupport"]
        }
      }
    }
  });

  return JSON.parse(response.text || "[]");
};

export const summarizeDiary = async (content: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `请将这段内容（下属与AI的对话记录）总结成一个200-300字的段落，作为一篇“心情日记”。要求捕捉情绪变化、工作压力源、对话中的积极点，语气要温和如老友。
    内容原文：${content}`,
  });
  return response.text || "";
};

export const generateHealingImage = async (summary: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        {
          text: `A warm, healing, cozy scene based on this theme: ${summary}. 
          Style: Soft lighting, minimalist, Ghibli-inspired aesthetic, like a quiet railway office at twilight, a warm desk lamp reflecting on blueprints, or a peaceful rainy subway station. No people. High quality, soft warm colors.`,
        },
      ],
    },
    config: {
      imageConfig: {
        aspectRatio: "1:1"
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return "";
};

const PERSONA_PROMPTS: Record<ChatPersona, string> = {
  senior: '你是一位有着10年经验的轨道交通资深工程师。你专业、理性、务实，说话严谨，注重逻辑和职业规范，会给作为下属的用户非常具体的职业和逻辑指导。',
  mentor: '你是一位心理导师，专注用户的情绪健康。你非常有同理心，擅长引导式对话，帮助用户排解职场焦虑和内耗，提供丰富的情绪价值。',
  friend: '你是一位暖心的老同学、好朋友。你说话接地气，幽默风趣，会和用户一起吐槽也会真心安慰，语气轻松愉快，像哥们一样聊天。'
};

export const getChatModel = (persona: ChatPersona = 'senior') => {
  const ai = getAI();
  return ai.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: PERSONA_PROMPTS[persona],
    },
  });
};
