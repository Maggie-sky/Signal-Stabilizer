
export interface DiaryEntry {
  id: string;
  date: string;
  content: string;
  summary: string;
  images: string[]; // base64 strings
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export interface UserStats {
  preferredToneCount: Record<number, number>;
  keywords: string[];
}

export interface ReplySuggestion {
  title: string;
  text: string;
  rationalAnalysis: string;
  warmSupport: string;
}

export type AppTab = 'home' | 'diary' | 'calendar' | 'relax';
export type HomeMode = 'reply' | 'chat';
export type ChatPersona = 'senior' | 'mentor' | 'friend';
