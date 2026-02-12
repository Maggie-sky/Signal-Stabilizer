
import { ReplySuggestion, ChatPersona, ChatMessage } from "../types";

/**
 * 统一的 API 请求包装器，调用本地 Vercel Serverless Function
 */
async function callQwenAPI(messages: { role: string, content: string }[], model: string = "qwen-turbo") {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, model })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'API 请求失败');
  }

  const data = await response.json();
  return data.reply;
}

export const generateReplySuggestions = async (prompt: string): Promise<ReplySuggestion[]> => {
  const systemPrompt = `你是一位职场经验丰富的“理性前辈”和“暖心助手”。请帮用户（下属身份）回复消息。
  请生成2个版本：1. 严肃专业版 2. 温暖活泼版。
  输出必须是严格的 JSON 数组格式，包含 title, text, rationalAnalysis, warmSupport 字段。不要输出任何其他解释文字。`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `收到的消息：${prompt}` }
  ];

  const reply = await callQwenAPI(messages, "qwen-plus");
  try {
    // 简单清洗可能存在的 Markdown 代码块包裹
    const jsonStr = reply.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error("JSON 解析失败", reply);
    throw new Error("回复解析失败，请重试");
  }
};

export const summarizeDiary = async (content: string): Promise<string> => {
  const messages = [
    { role: 'system', content: "你是一位感性的老友，请将对话记录总结成一篇150字左右的心情日记。" },
    { role: 'user', content: `对话内容：${content}` }
  ];
  return await callQwenAPI(messages);
};

const PERSONA_PROMPTS: Record<ChatPersona, string> = {
  senior: '你是一位轨道交通资深工程师，说话理性、务实、严谨。',
  mentor: '你是一位心理导师，非常有同理心，擅长引导式对话。',
  friend: '你是一位接地气的暖心好友，语气轻松幽默，会和用户一起吐槽。'
};

export const sendChatMessage = async (persona: ChatPersona, history: ChatMessage[], newMessage: string): Promise<string> => {
  const messages = [
    { role: 'system', content: PERSONA_PROMPTS[persona] },
    ...history.map(m => ({ 
      role: m.role === 'user' ? 'user' : 'assistant', 
      content: m.text 
    })),
    { role: 'user', content: newMessage }
  ];
  return await callQwenAPI(messages);
};
