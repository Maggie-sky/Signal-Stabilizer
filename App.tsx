
import React, { useState, useEffect, useRef } from 'react';
import { 
  Home as HomeIcon, 
  Book as DiaryIcon, 
  Calendar as CalendarIcon, 
  Wind as RelaxIcon, 
  Mic, 
  Send, 
  Copy, 
  Check, 
  Volume2, 
  VolumeX,
  ArrowRight,
  History,
  X,
  MessageSquare,
  Repeat,
  Save,
  User,
  Coffee,
  Brain,
  ExternalLink,
  Sparkles,
  Heart,
  Cloud
} from 'lucide-react';
import { AppTab, HomeMode, ReplySuggestion, DiaryEntry, ChatMessage, UserStats, ChatPersona } from './types';
import { generateReplySuggestions, summarizeDiary, generateHealingImage, getChatModel } from './services/geminiService';
import { HEALING_QUOTES, RELAX_ARTICLES, DEFAULT_KEYWORDS, BREATHING_STEPS } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [homeMode, setHomeMode] = useState<HomeMode>('reply');
  const [chatPersona, setChatPersona] = useState<ChatPersona>('senior');
  const [input, setInput] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<ReplySuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTtsEnabled, setIsTtsEnabled] = useState(false);
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [stats, setStats] = useState<UserStats>({ preferredToneCount: {}, keywords: DEFAULT_KEYWORDS });
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const chatInstanceRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedDiaries = localStorage.getItem('diaries');
    if (savedDiaries) setDiaries(JSON.parse(savedDiaries));
    const savedStats = localStorage.getItem('stats');
    if (savedStats) setStats(JSON.parse(savedStats));

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'zh-CN';
      
      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setInput(prev => prev + ' ' + transcript);
      };
      recognition.onerror = () => setIsRecording(false);
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }

    chatInstanceRef.current = getChatModel(chatPersona);
  }, []);

  useEffect(() => {
    chatInstanceRef.current = getChatModel(chatPersona);
    setChatMessages([]);
  }, [chatPersona]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const saveDiaries = (newDiaries: DiaryEntry[]) => {
    setDiaries(newDiaries);
    localStorage.setItem('diaries', JSON.stringify(newDiaries));
  };

  const handleStartRecording = () => {
    if (recognitionRef.current) {
      setIsRecording(true);
      recognitionRef.current.start();
    } else {
      alert("您的浏览器不支持语音识别。");
    }
  };

  const handleStopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleGetSuggestions = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      const results = await generateReplySuggestions(input);
      setSuggestions(results);
    } catch (error) {
      alert("生成建议失败，请检查配置。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;
    const userMsg: ChatMessage = { role: 'user', text: input, timestamp: new Date().toLocaleTimeString() };
    setChatMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatInstanceRef.current.sendMessage({ message: input });
      const aiMsg: ChatMessage = { role: 'model', text: response.text || '', timestamp: new Date().toLocaleTimeString() };
      setChatMessages(prev => [...prev, aiMsg]);
      if (isTtsEnabled) speak(aiMsg.text);
    } catch (error) {
      alert("对话中断，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndAndSaveChat = async () => {
    if (chatMessages.length === 0) return;
    setIsLoading(true);
    try {
      const fullHistory = chatMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.text}`).join('\n');
      const summary = await summarizeDiary(fullHistory);
      const imageUrl = await generateHealingImage(summary);
      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        content: `与[${getPersonaName(chatPersona)}]的对话回顾：\n${fullHistory.slice(0, 500)}...`,
        summary,
        images: imageUrl ? [imageUrl] : []
      };
      saveDiaries([newEntry, ...diaries]);
      setChatMessages([]);
      chatInstanceRef.current = getChatModel(chatPersona);
      setActiveTab('diary');
    } catch (error) {
      alert("生成日记失败，请重试。");
    } finally {
      setIsLoading(false);
    }
  };

  const getPersonaName = (p: ChatPersona) => {
    if (p === 'senior') return '理性前辈';
    if (p === 'mentor') return '心理导师';
    return '暖心好友';
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const englishCount = (text.match(/[a-zA-Z]/g) || []).length;
    utterance.lang = (englishCount > text.length * 0.4) ? 'en-US' : 'zh-CN';
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const TabButton = ({ id, icon: Icon, label }: { id: AppTab; icon: any; label: string }) => (
    <button 
      onClick={() => setActiveTab(id)}
      className={`flex flex-col items-center justify-center w-full py-2 transition-all btn-bounce ${activeTab === id ? 'text-[#FF9999] scale-110' : 'text-[#5C4033] opacity-60'}`}
    >
      <Icon size={24} className={activeTab === id ? 'drop-shadow-[0_0_5px_#FFB6C1]' : ''} />
      <span className="text-[10px] mt-1 font-bold">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col min-h-screen pb-20 overflow-x-hidden">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md p-4 flex justify-between items-center h-16 border-b border-[#F5E1E5]">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#FFB6C1] to-[#FF9999] rounded-cute flex items-center justify-center shadow-soft inner-glow">
            <Sparkles size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#4A2C2A] leading-none">信号稳定器</h1>
            <span className="text-[9px] text-[#E9967A] font-medium tracking-wider">SOFT & WARM COMPANION</span>
          </div>
        </div>
        <button onClick={() => setIsTtsEnabled(!isTtsEnabled)} className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${isTtsEnabled ? 'bg-[#FFB6C1] text-white' : 'bg-[#FFF0E8] text-[#E9967A]'}`}>
          {isTtsEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
        </button>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full relative">
        {activeTab === 'home' && (
          <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Mode Switcher */}
            <div className="flex p-4 gap-3 sticky top-16 z-10">
              <button 
                onClick={() => setHomeMode('reply')}
                className={`flex-1 py-3 rounded-cute text-xs font-bold transition-all shadow-soft btn-bounce ${homeMode === 'reply' ? 'bg-gradient-to-r from-[#FFB6C1] to-[#FF9999] text-white' : 'bg-white text-[#E9967A]'}`}
              >
                回复助手 💌
              </button>
              <button 
                onClick={() => setHomeMode('chat')}
                className={`flex-1 py-3 rounded-cute text-xs font-bold transition-all shadow-soft btn-bounce ${homeMode === 'chat' ? 'bg-gradient-to-r from-[#FFB6C1] to-[#FF9999] text-white' : 'bg-white text-[#E9967A]'}`}
              >
                悄悄话 ☁️
              </button>
            </div>

            <div className="px-4 pb-24">
              {homeMode === 'reply' ? (
                <div className="space-y-6">
                  <section className="bg-white rounded-cute-lg p-6 shadow-soft border border-[#F5E1E5] mt-2 relative overflow-hidden">
                    <div className="absolute top-[-10px] right-[-10px] opacity-10"><Repeat size={80} /></div>
                    <h2 className="text-sm font-bold text-[#4A2C2A] mb-4 flex items-center gap-2">
                      <Heart size={16} className="text-[#FF9999]" /> 职场嘴替：下属回复
                    </h2>
                    <textarea 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="收到消息了？粘贴在这里，我来帮你写回复..."
                      className="w-full h-44 p-5 rounded-cute bg-[#FFF8F0] border-none focus:ring-2 focus:ring-[#FFB6C1] resize-none text-[#4A2C2A] text-sm mb-4 placeholder-[#5C4033]/30 shadow-inner"
                    />
                    <div className="flex gap-3">
                      <button
                        onMouseDown={handleStartRecording}
                        onMouseUp={handleStopRecording}
                        onTouchStart={handleStartRecording}
                        onTouchEnd={handleStopRecording}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg btn-bounce ${isRecording ? 'bg-[#FF9999] text-white animate-pulse' : 'bg-[#FFFACD] text-[#E9967A]'}`}
                      >
                        <Mic size={28} />
                      </button>
                      <button
                        onClick={handleGetSuggestions}
                        disabled={isLoading || !input.trim()}
                        className="flex-1 bg-gradient-to-r from-[#FFB6C1] to-[#FF9999] text-white rounded-cute font-bold shadow-lg btn-bounce disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2"
                      >
                        {isLoading ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <>生成话术 <Sparkles size={18}/></>}
                      </button>
                    </div>
                  </section>

                  <div className="space-y-4">
                    {suggestions.map((s, idx) => (
                      <div key={idx} className="bg-white rounded-cute-lg p-6 shadow-soft border border-[#F5E1E5] animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[11px] font-bold uppercase px-3 py-1 rounded-full ${s.title.includes('严肃') ? 'bg-[#E6E6FA] text-[#4A2C2A]' : 'bg-[#FFFACD] text-[#E9967A]'}`}>
                            {s.title}
                          </span>
                          <button onClick={() => copyToClipboard(s.text, idx)} className="w-8 h-8 rounded-full bg-[#FFF8F0] flex items-center justify-center text-[#E9967A]">
                            {copiedIndex === idx ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                        <div className="p-4 bg-[#FFF8F0] rounded-cute mb-4 border-l-4 border-[#FFB6C1]">
                          <p className="text-[#4A2C2A] font-medium text-sm leading-relaxed">{s.text}</p>
                        </div>
                        <div className="space-y-3 text-xs">
                          <div className="flex gap-2">
                            <span className="text-[#FF9999] font-bold">●</span>
                            <p className="text-[#5C4033]/60 italic">分析：{s.rationalAnalysis}</p>
                          </div>
                          <div className="flex gap-2 p-3 bg-pink-50/50 rounded-cute border border-pink-100">
                            <Heart size={12} className="text-[#FF9999] shrink-0 mt-0.5" />
                            <p className="text-[#4A2C2A] font-bold">心语：{s.warmSupport}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-[calc(100vh-320px)] animate-in slide-in-from-right-4 duration-300">
                  {/* Persona Selector */}
                  <div className="flex gap-3 mb-5 overflow-x-auto pb-2 scrollbar-hide px-1">
                    {[
                      { id: 'senior', name: '理性前辈', icon: User, color: '#E6E6FA' },
                      { id: 'mentor', name: '心理导师', icon: Brain, color: '#D4F4DD' },
                      { id: 'friend', name: '暖心好友', icon: Coffee, color: '#FFFACD' }
                    ].map(p => (
                      <button
                        key={p.id}
                        onClick={() => setChatPersona(p.id as ChatPersona)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all btn-bounce shadow-sm border ${chatPersona === p.id ? 'bg-[#FF9999] text-white border-[#FF9999]' : 'bg-white text-[#5C4033] border-[#F5E1E5]'}`}
                      >
                        <p.icon size={14} />
                        {p.name}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4 px-1 pb-4 scrollbar-hide">
                    {chatMessages.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-full text-[#5C4033]/30 text-center px-10">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 shadow-soft">
                          <Cloud size={48} className="text-[#FFB6C1]" />
                        </div>
                        <p className="text-sm font-medium">正在与 {getPersonaName(chatPersona)} 对话<br/>压力大的时候，随时找我聊聊</p>
                      </div>
                    )}
                    {chatMessages.map((m, i) => (
                      <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-up duration-300`}>
                        <div className={`max-w-[80%] p-4 shadow-soft text-sm leading-relaxed ${m.role === 'user' ? 'chat-bubble-user rounded-[20px]' : 'chat-bubble-ai rounded-[20px]'}`}>
                          <p className="whitespace-pre-wrap">{m.text}</p>
                          <span className="text-[9px] opacity-40 block mt-2 text-right">{m.timestamp}</span>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-white p-4 rounded-[20px] rounded-tl-none shadow-soft border border-[#F5E1E5]">
                          <div className="flex gap-1.5">
                            <div className="w-2 h-2 bg-[#FFB6C1] rounded-full animate-bounce"></div>
                            <div className="w-2 h-2 bg-[#FFB6C1] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-[#FFB6C1] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Input Bar */}
                  <div className="fixed bottom-24 left-0 right-0 px-4 max-w-lg mx-auto">
                    <div className="flex gap-2 items-center bg-white p-2 rounded-cute-lg shadow-soft border border-[#F5E1E5]">
                      <button 
                        onMouseDown={handleStartRecording}
                        onMouseUp={handleStopRecording}
                        onTouchStart={handleStartRecording}
                        onTouchEnd={handleStopRecording}
                        className={`w-12 h-12 rounded-cute flex items-center justify-center transition-all ${isRecording ? 'bg-[#FF9999] text-white animate-pulse shadow-inner' : 'bg-[#FFF8F0] text-[#E9967A]'}`}
                      >
                        <Mic size={20} />
                      </button>
                      <input 
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder={`向${getPersonaName(chatPersona)}倾诉...`}
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 text-[#4A2C2A] placeholder-[#5C4033]/30"
                      />
                      <button 
                        onClick={handleSendMessage}
                        disabled={isLoading || !input.trim()}
                        className="w-12 h-12 bg-gradient-to-br from-[#FFB6C1] to-[#FF9999] text-white rounded-cute flex items-center justify-center disabled:opacity-30 shadow-md btn-bounce"
                      >
                        <Send size={20} />
                      </button>
                    </div>
                    {chatMessages.length > 0 && (
                      <button 
                        onClick={handleEndAndSaveChat}
                        className="w-full mt-4 py-3 bg-[#FFFACD] text-[#E9967A] rounded-cute text-xs font-bold flex items-center justify-center gap-2 shadow-sm btn-bounce border border-[#FFE4C4]"
                      >
                        <Save size={16} /> 生成心情日记并存档 🧸
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'diary' && <MoodDiaryView diaries={diaries} saveDiaries={saveDiaries} />}
        {activeTab === 'calendar' && <CalendarView diaries={diaries} />}
        {activeTab === 'relax' && <RelaxView />}
      </main>

      {/* Footer Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-[#F5E1E5] flex justify-around items-center safe-bottom z-30 h-20 px-2 shadow-[0_-5px_15px_rgba(74,44,42,0.02)]">
        <TabButton id="home" icon={HomeIcon} label="信号调节" />
        <TabButton id="diary" icon={DiaryIcon} label="心情日记" />
        <TabButton id="calendar" icon={CalendarIcon} label="回顾" />
        <TabButton id="relax" icon={RelaxIcon} label="放松区" />
      </nav>
    </div>
  );
};

const MoodDiaryView: React.FC<{ diaries: DiaryEntry[]; saveDiaries: (d: DiaryEntry[]) => void }> = ({ diaries, saveDiaries }) => {
  const [content, setContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSaveDiary = async () => {
    if (!content.trim()) return;
    setIsProcessing(true);
    try {
      const summary = await summarizeDiary(content);
      const imageUrl = await generateHealingImage(summary);
      const newEntry: DiaryEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString(),
        content,
        summary,
        images: imageUrl ? [imageUrl] : []
      };
      saveDiaries([newEntry, ...diaries]);
      setContent('');
    } catch (error) {
      alert("保存失败，请重试。");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-4 pb-24 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <section className="bg-white rounded-cute-lg p-6 shadow-soft border border-[#F5E1E5]">
        <h2 className="text-lg font-bold text-[#4A2C2A] mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-[#FFB6C1]" /> 记录这一刻
        </h2>
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="今天的信号灯稳吗？写下你想说的..."
          className="w-full h-44 p-5 rounded-cute bg-[#FFF8F0] border-none focus:ring-2 focus:ring-[#FFB6C1] resize-none text-[#4A2C2A] text-sm mb-4 placeholder-[#5C4033]/30 shadow-inner"
        />
        <button
          onClick={handleSaveDiary}
          disabled={isProcessing || !content.trim()}
          className="w-full py-4 bg-gradient-to-r from-[#FFB6C1] to-[#FF9999] text-white rounded-cute font-bold shadow-lg btn-bounce disabled:opacity-50"
        >
          {isProcessing ? '正在为你感应插画...' : '封存此刻心情 ✨'}
        </button>
      </section>

      <div className="space-y-6">
        {diaries.length === 0 && (
          <div className="text-center py-16 opacity-30">
            <Heart size={48} className="mx-auto mb-4" />
            <p className="text-sm font-medium">暂无日记，去聊天或记录吧</p>
          </div>
        )}
        {diaries.map(entry => (
          <div key={entry.id} className="bg-white rounded-cute-lg overflow-hidden shadow-soft border border-[#F5E1E5] animate-in slide-up duration-500">
            {entry.images[0] && <img src={entry.images[0]} alt="Art" className="w-full h-56 object-cover" />}
            <div className="p-6">
              <div className="text-[10px] text-[#FF9999] mb-2 font-bold uppercase tracking-widest">{new Date(entry.date).toLocaleString()}</div>
              <p className="text-sm text-[#4A2C2A] font-bold italic mb-3 leading-relaxed">“{entry.summary}”</p>
              <div className="bg-[#FFF8F0] p-4 rounded-cute text-xs text-[#5C4033]/80 leading-loose">
                {entry.content}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const CalendarView: React.FC<{ diaries: DiaryEntry[] }> = ({ diaries }) => {
  const [selectedEntry, setSelectedEntry] = useState<DiaryEntry | null>(null);
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDiaryForDay = (day: number) => {
    return diaries.find(d => {
      const date = new Date(d.date);
      return date.getDate() === day && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });
  };

  return (
    <div className="p-4 pb-24 animate-in fade-in duration-300">
      <div className="bg-white rounded-cute-lg p-6 shadow-soft border border-[#F5E1E5] mb-6">
        <h2 className="text-lg font-bold text-center text-[#4A2C2A] mb-6">{now.getFullYear()}年 {now.getMonth() + 1}月</h2>
        <div className="grid grid-cols-7 gap-3">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => <div key={d} className="text-[10px] text-center font-bold text-[#E9967A]">{d}</div>)}
          {calendarDays.map(day => {
            const entry = getDiaryForDay(day);
            return (
              <button 
                key={day} 
                onClick={() => entry && setSelectedEntry(entry)}
                className={`aspect-square rounded-full flex items-center justify-center text-sm transition-all btn-bounce ${entry ? 'bg-gradient-to-br from-[#FFB6C1] to-[#FF9999] text-white font-bold scale-110 shadow-md' : 'bg-[#FFF8F0] text-[#5C4033]/40'}`}
              >
                {day}
              </button>
            );
          })}
        </div>
      </div>

      {selectedEntry && (
        <div className="fixed inset-0 z-50 bg-[#4A2C2A]/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setSelectedEntry(null)}>
          <div className="bg-[#FFF8F0] rounded-cute-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="relative">
              {selectedEntry.images[0] && <img src={selectedEntry.images[0]} alt="Art" className="w-full h-64 object-cover" />}
              <button onClick={() => setSelectedEntry(null)} className="absolute top-4 right-4 bg-white/80 p-2 rounded-full text-[#4A2C2A] shadow-md"><X size={20} /></button>
            </div>
            <div className="p-8">
              <div className="text-[10px] text-[#FF9999] font-bold mb-3 uppercase tracking-widest">{new Date(selectedEntry.date).toLocaleDateString()} 记忆</div>
              <h3 className="font-bold text-lg mb-4 text-[#4A2C2A] leading-relaxed italic">“{selectedEntry.summary}”</h3>
              <div className="max-h-44 overflow-y-auto pr-2 scrollbar-hide text-[#5C4033] text-sm leading-loose">
                {selectedEntry.content}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const RelaxView: React.FC = () => {
  const [quote, setQuote] = useState(HEALING_QUOTES[0]);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathText, setBreathText] = useState('开始深呼吸');

  const startBreathing = async () => {
    setIsBreathing(true);
    for (const step of BREATHING_STEPS) {
      setBreathText(step.text);
      await new Promise(r => setTimeout(r, step.duration));
    }
    setBreathText('感觉好些了吗？');
    setTimeout(() => { setIsBreathing(false); setBreathText('再次开始 🍃'); }, 2000);
  };

  return (
    <div className="p-4 pb-24 space-y-6 animate-in fade-in duration-300">
      <section className="bg-white rounded-cute-lg p-8 relative overflow-hidden shadow-soft border border-[#F5E1E5]">
        <div className="absolute top-[-20px] left-[-20px] w-32 h-32 bg-[#FFB6C1]/10 rounded-full blur-2xl"></div>
        <History className="text-[#FF9999] mb-4" />
        <p className="text-xl font-bold leading-relaxed mb-4 text-[#4A2C2A]">{quote.cn}</p>
        <p className="text-xs text-[#5C4033]/40 italic mb-8 leading-relaxed">"{quote.en}"</p>
        <button 
          onClick={() => setQuote(HEALING_QUOTES[Math.floor(Math.random()*HEALING_QUOTES.length)])} 
          className="py-2 px-4 rounded-full bg-[#FFF8F0] text-xs text-[#E9967A] font-bold flex items-center gap-2 hover:bg-[#FFE4C4] transition-colors btn-bounce"
        >
          换一句语录 <ArrowRight size={14} />
        </button>
      </section>

      <section className="bg-white p-10 rounded-cute-lg text-center border border-[#F5E1E5] shadow-soft relative overflow-hidden">
        <div className={`w-36 h-36 mx-auto rounded-full border-8 border-[#FFF8F0] flex items-center justify-center mb-8 transition-all duration-1000 ${isBreathing ? 'scale-125 bg-[#FFFACD]/30 border-[#FFB6C1]/20' : 'bg-transparent shadow-inner'}`}>
           <RelaxIcon size={48} className={`text-[#FF9999] ${isBreathing ? 'animate-pulse' : ''}`} />
        </div>
        <h3 className="text-lg font-bold mb-2 text-[#4A2C2A]">4-7-8 呼吸放松法</h3>
        <p className="text-xs text-[#5C4033]/50 mb-10 leading-relaxed px-6">有节奏的呼吸能有效安抚紧张的神经系统</p>
        <button 
          onClick={startBreathing}
          disabled={isBreathing}
          className="w-full py-4 bg-gradient-to-r from-[#FFB6C1] to-[#FF9999] text-white rounded-cute font-bold shadow-lg shadow-pink-200 active:scale-95 transition-all text-sm tracking-widest"
        >
          {breathText}
        </button>
      </section>

      <section className="space-y-4">
        <h3 className="text-xs font-bold text-[#E9967A] px-2 uppercase tracking-widest flex items-center gap-2">
          <Sparkles size={14} /> 舒压补给站 (Reading)
        </h3>
        {RELAX_ARTICLES.map((article, i) => (
          <a 
            key={i} 
            href={article.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-between p-5 bg-white rounded-cute-lg border border-[#F5E1E5] hover:border-[#FFB6C1] transition-all shadow-sm group active:scale-98"
          >
            <span className="text-sm text-[#4A2C2A] font-bold group-hover:text-[#FF9999] transition-colors">{article.title}</span>
            <div className="w-8 h-8 rounded-full bg-[#FFF8F0] flex items-center justify-center text-[#E9967A]">
              <ExternalLink size={14} />
            </div>
          </a>
        ))}
      </section>
    </div>
  );
};

export default App;
