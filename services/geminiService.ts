
import { GoogleGenAI, Type } from "@google/genai";
import { ReplySuggestion, ChatPersona } from "../types";

/**
 * 增强型指数退避重试包装函数
 * 针对 Vercel 环境下常见的网络抖动、429 频率限制及 503 服务不可用进行自动重试
 */
const withRetry = async <T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const status = error?.status;
    const message = error?.message?.toLowerCase() || "";
    
    // 如果是 4xx 客户端错误（除 429 外），通常重试无效
    if (status && status >= 400 && status < 500 && status !== 429) {
      throw error;
    }

    if (retries <= 0) throw error;

    const isNetworkError = message.includes("fetch") || message.includes("network") || message.includes("failed to execute");
    const isRateLimit = status === 429 || message.includes("429");
    const isServerError = (status && status >= 500) || message.includes("500") || message.includes("503");

    if (isNetworkError || isRateLimit || isServerError) {
      console.warn(`检测到可恢复错误，正在尝试重试（剩余次数: ${retries}）...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    
    throw error;
  }
};

const getAI = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY 未配置，请在 Vercel 环境变量中设置。");
  }
  return new GoogleGenAI({ apiKey });
};

export const generateReplySuggestions = async (prompt: string): Promise<ReplySuggestion[]> => {
  const ai = getAI();
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `你是一位职场经验丰富的“理性前辈”和“暖心助手”。请作为用户的“嘴替”，以【下属】的身份帮他回复这条消息：
      
      收到的消息：${prompt}
      
      请生成2个版本：
      1. 严肃专业版：用词严谨、边界清晰、体现执行力。
      2. 温暖活泼版：亲和力强、带点幽默感、适合关系较好的同事。

      输出必须是严格的JSON数组格式，包含 title, text, rationalAnalysis, warmSupport 字段。`,
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
  });
};

export const summarizeDiary = async (content: string): Promise<string> => {
  const ai = getAI();
  return withRetry(async () => {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `请将下述用户与AI的对话记录总结成一篇“心情日记”。
      要求：
      1. 捕捉今日的情绪核心（是焦虑、疲惫还是得到了宽慰）。
      2. 用温柔、感性的文字描述，字数约150字。
      3. 语气像是一位老友在深夜为你写下的回忆。
      对话内容：${content}`,
    });
    return response.text || "今天也是努力生活的一天。";
  });
};

const PERSONA_PROMPTS: Record<ChatPersona, string> = {
  senior: '你是一位轨道交通资深工程师，说话理性、务实、严谨，注重逻辑和职业规范。',
  mentor: '你是一位心理导师，非常有同理心，擅长引导式对话，帮助用户排解职场焦虑。',
  friend: '你是一位接地气的暖心好友，语气轻松幽默，会和用户一起吐槽，提供情绪支持。'
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
