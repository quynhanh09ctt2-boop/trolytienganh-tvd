
import React, { useEffect, useRef, useState } from 'react';
import { Message } from '../types';

interface Props {
  history: Message[];
  isRecording: boolean;
  onTranslate: (messageId: string, text: string) => Promise<void>;
}

const ConversationView: React.FC<Props> = ({ history, isRecording, onTranslate }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());
  const [autoTranslate, setAutoTranslate] = useState<boolean>(() => {
    return localStorage.getItem('fluentify_auto_translate') === 'true';
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  useEffect(() => {
    localStorage.setItem('fluentify_auto_translate', String(autoTranslate));
  }, [autoTranslate]);

  useEffect(() => {
    if (!autoTranslate || history.length === 0) return;
    const lastMsg = history[history.length - 1];
    if (lastMsg.role === 'assistant' && !lastMsg.translation && !translatingIds.has(lastMsg.id)) {
      handleTranslateClick(lastMsg.id, lastMsg.text);
    }
  }, [history, autoTranslate]);

  const exportChatToExcel = () => {
    if (history.length === 0) return;

    const headers = ['Time', 'Role', 'Message', 'Translation'];
    const csvRows = [
      headers.join(','),
      ...history.map(msg => {
        const time = new Date(msg.timestamp).toLocaleTimeString();
        const role = msg.role === 'user' ? 'Student' : 'Aria (Tutor)';
        const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
        
        return [
          escape(time),
          escape(role),
          escape(msg.text),
          escape(msg.translation || '')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `English_Buddy_Chat_Log_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleTranslateClick = async (messageId: string, text: string) => {
    if (translatingIds.has(messageId)) return;
    setTranslatingIds(prev => new Set(prev).add(messageId));
    await onTranslate(messageId, text);
    setTranslatingIds(prev => {
      const next = new Set(prev);
      next.delete(messageId);
      return next;
    });
  };

  const renderContent = (text: string, role: 'user' | 'assistant') => {
    if (role === 'user') return <p className="text-sm leading-relaxed">{text}</p>;

    const parts = text.split(/(\[PRONUNCIATION:.*?\])/g);
    
    return (
      <div className="space-y-3">
        {parts.map((part, i) => {
          if (part.startsWith('[PRONUNCIATION:')) {
            const feedback = part.replace('[PRONUNCIATION:', '').replace(']', '').trim();
            return (
              <div key={i} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 shadow-sm">
                <div className="shrink-0 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest block mb-0.5">Aria's Pronunciation Tip</span>
                  <p className="text-sm text-amber-800 leading-relaxed italic">{feedback}</p>
                </div>
              </div>
            );
          }
          return part.trim() ? <p key={i} className="text-sm leading-relaxed">{part}</p> : null;
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-md rounded-3xl shadow-xl shadow-indigo-100/30 border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-indigo-50/60 bg-gradient-to-r from-indigo-50/40 via-purple-50/20 to-pink-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-xl">
            💬
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm md:text-base tracking-tight">Hội thoại bản xứ cùng Aria</h3>
            {isRecording ? (
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Đang nghe bạn nói...</span>
              </div>
            ) : (
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trực tuyến cùng mô hình Gemini AI</p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 px-3 py-2 bg-white/90 border border-indigo-100/50 rounded-xl text-[11px] font-bold text-indigo-700 cursor-pointer hover:bg-indigo-50 transition-all shadow-sm">
            <input 
              type="checkbox" 
              checked={autoTranslate} 
              onChange={(e) => setAutoTranslate(e.target.checked)}
              className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5 cursor-pointer accent-indigo-600"
            />
            <span>Dịch tức thì sang Tiếng Việt</span>
          </label>
 
          {history.length > 0 && (
            <button 
              onClick={exportChatToExcel}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-emerald-500 to-green-600 border border-transparent rounded-xl text-xs font-black text-white hover:from-emerald-600 hover:to-green-700 transition-all shadow-md shadow-emerald-100 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Xuất Chat (.CSV)
            </button>
          )}
        </div>
      </div>
 
      <div 
        ref={scrollRef}
        className="flex-1 p-6 overflow-y-auto space-y-6 scroll-smooth bg-gradient-to-b from-[#fbfbfe] to-white"
      >
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-indigo-150 animate-bounce">
              <span className="text-3xl">🎙️</span>
            </div>
            <div className="space-y-1.5">
              <p className="text-slate-800 font-extrabold text-lg">Chào mừng bạn gia nhập phòng hội thoại!</p>
              <p className="text-xs text-slate-500 font-medium max-w-sm mx-auto leading-relaxed">
                Nhấp nút <span className="font-bold text-indigo-600">"Bắt đầu luyện nói"</span> phía dưới góc trái, chào Aria bằng tiếng Anh hoặc tiếng Việt để bắt đầu trò chuyện nhé!
              </p>
            </div>
          </div>
        ) : (
          history.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
            >
              <div className={`group relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                msg.role === 'user' 
                ? 'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-800 text-white rounded-tr-none shadow-indigo-100' 
                : 'bg-white text-slate-800 rounded-tl-none border border-indigo-100/40 hover:border-indigo-200/80 transition-all font-medium shadow-slate-100'
              }`}>
                {renderContent(msg.text, msg.role)}
                
                {msg.translation && (
                  <div className={`mt-2 pt-2 border-t text-[13px] italic font-medium ${
                    msg.role === 'user' ? 'border-white/20 text-indigo-100' : 'border-indigo-50 text-indigo-600'
                  }`}>
                    💡 {msg.translation}
                  </div>
                )}
 
                {msg.role === 'assistant' && !msg.translation && (
                  <button
                    onClick={() => handleTranslateClick(msg.id, msg.text)}
                    disabled={translatingIds.has(msg.id)}
                    className="mt-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100/50 rounded-full text-xs font-semibold text-indigo-700 hover:text-indigo-900 hover:from-indigo-100 hover:to-purple-100 transition-all shadow-sm cursor-pointer"
                    title="Dịch sang tiếng Việt"
                  >
                    {translatingIds.has(msg.id) ? (
                      <>
                        <svg className="animate-spin h-3.5 w-3.5 text-indigo-600" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-[11px]">Đang dịch...</span>
                      </>
                    ) : (
                      <>
                        <span>🌐</span>
                        <span className="text-[11px]">Dịch Việt ngữ</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <p className="text-[9px] mt-1.5 font-bold text-slate-400 px-1 opacity-75">
                {msg.role === 'user' ? 'Bạn' : 'Aria (Tutor)'} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          ))
        )}
      </div>
      
      <div className="h-16 border-t border-slate-100 px-6 flex items-center justify-between bg-slate-50/50">
        <div className="flex-1 flex gap-1 items-end h-8 max-w-[150px]">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className={`w-1 rounded-full transition-all duration-300 ${isRecording ? 'bg-gradient-to-t from-pink-500 to-indigo-500 animate-wave' : 'bg-slate-200 h-1'}`} 
              style={{ 
                animationDelay: `${i * 0.04}s`, 
                height: isRecording ? `${25 + Math.random() * 75}%` : '4px',
              }} 
            />
          ))}
        </div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
          {isRecording ? '🎤 Trạng thái ghi âm đang hoạt động' : '🔈 Chờ ghi âm'}
        </div>
      </div>
    </div>
  );
};

export default ConversationView;
