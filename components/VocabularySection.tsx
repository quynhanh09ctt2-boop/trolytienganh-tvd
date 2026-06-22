
import React, { useState } from 'react';
import { VocabularyItem } from '../types';

interface Props {
  vocabulary: VocabularyItem[];
  onRemove: (id: string) => void;
  onTranslate: (id: string) => Promise<void>;
}

const VocabularySection: React.FC<Props> = ({ vocabulary, onRemove, onTranslate }) => {
  const [activeTab, setActiveTab] = useState<'list' | 'flashcards'>('list');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [translatingIds, setTranslatingIds] = useState<Set<string>>(new Set());

  const nextCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev + 1) % vocabulary.length);
  };

  const prevCard = () => {
    setIsFlipped(false);
    setCurrentCardIndex((prev) => (prev - 1 + vocabulary.length) % vocabulary.length);
  };

  const handleTranslateClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTranslatingIds(prev => new Set(prev).add(id));
    await onTranslate(id);
    setTranslatingIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const exportToExcel = () => {
    if (vocabulary.length === 0) return;

    const headers = ['Word', 'Translation (Vietnamese)', 'Definition', 'Definition Translation', 'Example', 'Example Translation', 'Date Learned'];
    const csvRows = [
      headers.join(','),
      ...vocabulary.map(item => {
        const escape = (text: string) => `"${(text || '').replace(/"/g, '""')}"`;
        const date = new Date(item.learnedAt).toLocaleDateString();
        return [
          escape(item.word),
          escape(item.translation),
          escape(item.definition),
          escape(item.definitionTranslation || ''),
          escape(item.example),
          escape(item.exampleTranslation || ''),
          escape(date)
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `English_Buddy_Vocabulary_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (vocabulary.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Tủ từ vựng đang trống</h2>
        <p className="text-slate-500 max-w-md">
          Hãy bắt đầu hội thoại ở tab Luyện nói. Aria sẽ tự động gợi ý các từ vựng hay dựa trên cuộc trò chuyện của bạn!
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ngân hàng từ vựng</h2>
          <p className="text-sm text-slate-500">Đã lưu {vocabulary.length} mục</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Xuất Excel
          </button>

          <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
            <button 
              onClick={() => setActiveTab('list')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Danh sách
            </button>
            <button 
              onClick={() => setActiveTab('flashcards')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'flashcards' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Flashcards
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pb-10 pr-2">
          {vocabulary.map((item, index) => {
            const borderColors = [
              'border-l-indigo-500', 
              'border-l-purple-500', 
              'border-l-pink-500', 
              'border-l-emerald-500', 
              'border-l-amber-500', 
              'border-l-sky-500'
            ];
            const borderLeftClass = borderColors[index % borderColors.length];
            return (
              <div 
                key={item.id} 
                className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm shadow-indigo-50/30 hover:border-indigo-200 transition-all hover:-translate-y-0.5 hover:shadow-md relative border-l-4 ${borderLeftClass}`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-extrabold text-slate-800 tracking-tight">{item.word}</h3>
                  <div className="flex items-center gap-1">
                    {!item.definitionTranslation && (
                      <button 
                        onClick={(e) => handleTranslateClick(e, item.id)}
                        disabled={translatingIds.has(item.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/70 rounded-lg transition-all cursor-pointer"
                        title="Dịch chi tiết"
                      >
                        {translatingIds.has(item.id) ? (
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5a18.022 18.022 0 01-3.827-5.806m1.048 5.806a18.022 18.022 0 003.827-5.806m1.048 5.806L9 11m0 0l-1.048 2.5m1.048-2.5l1.048 2.5M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button 
                      onClick={() => onRemove(item.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                <p className="text-sm font-bold text-indigo-600 mb-2">{item.translation}</p>
                
                <div className="space-y-2 mt-3 text-slate-600">
                  <div className="group/def">
                    <p className="text-xs text-slate-500 leading-relaxed font-semibold">Định nghĩa:</p>
                    <p className="text-xs text-slate-600 leading-relaxed mb-0.5">{item.definition}</p>
                    {item.definitionTranslation && (
                      <p className="text-xs text-indigo-500/90 italic font-medium mt-0.5">
                        → {item.definitionTranslation}
                      </p>
                    )}
                  </div>

                  <div className="bg-gradient-to-r from-indigo-50/50 to-pink-50/50 p-3 rounded-xl border border-indigo-100/30">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1">Ví dụ ngữ cảnh:</p>
                    <p className="italic text-xs text-slate-700 font-medium">"{item.example}"</p>
                    {item.exampleTranslation && (
                      <p className="text-xs text-purple-600/90 font-semibold mt-1">
                        → {item.exampleTranslation}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-8 py-10">
          <div className="perspective-1000 w-full max-w-sm h-96 cursor-pointer" onClick={() => setIsFlipped(!isFlipped)}>
            <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
              {/* Front */}
              <div className="absolute inset-0 backface-hidden bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center text-white border-4 border-white/80">
                <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full mb-4">Vocabulary Flashcard</span>
                <h3 className="text-4xl font-black tracking-tight drop-shadow-sm">{vocabulary[currentCardIndex].word}</h3>
                <p className="mt-8 text-white/70 text-xs animate-bounce font-bold tracking-wide">Nhấn vào đây để lật mặt sau 👆</p>
              </div>
              {/* Back */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 bg-gradient-to-tr from-slate-900 via-indigo-950 to-purple-950 rounded-3xl shadow-xl flex flex-col items-center justify-center p-8 text-center text-white overflow-y-auto border-4 border-slate-850">
                <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/30 px-3 py-1 rounded-full mb-4 text-indigo-300">Meaning & Context</span>
                <h3 className="text-2xl font-black text-indigo-300 mb-3 tracking-tight">{vocabulary[currentCardIndex].translation}</h3>
                
                <div className="space-y-4 w-full">
                  <div>
                    <p className="text-xs text-slate-300 font-bold uppercase tracking-wider mb-0.5">Definition</p>
                    <p className="text-sm text-indigo-100 opacity-95 leading-relaxed font-medium">
                      {vocabulary[currentCardIndex].definition}
                    </p>
                    {vocabulary[currentCardIndex].definitionTranslation && (
                      <p className="text-xs text-pink-300 italic mt-1 font-semibold">({vocabulary[currentCardIndex].definitionTranslation})</p>
                    )}
                  </div>

                  <div className="bg-white/10 w-full p-4 rounded-2xl text-left border border-white/10">
                    <p className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-200 mb-1">Example</p>
                    <p className="italic text-xs text-indigo-50">"{vocabulary[currentCardIndex].example}"</p>
                    {vocabulary[currentCardIndex].exampleTranslation && (
                      <p className="text-xs text-amber-200 font-semibold mt-1">→ {vocabulary[currentCardIndex].exampleTranslation}</p>
                    )}
                  </div>
                </div>

                {!vocabulary[currentCardIndex].definitionTranslation && (
                  <button 
                    onClick={(e) => handleTranslateClick(e, vocabulary[currentCardIndex].id)}
                    disabled={translatingIds.has(vocabulary[currentCardIndex].id)}
                    className="mt-6 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 rounded-xl text-xs font-bold transition-all shadow-md shadow-pink-900/30 cursor-pointer"
                  >
                    {translatingIds.has(vocabulary[currentCardIndex].id) ? '⏳ Đang dịch...' : '🌐 Dịch chi tiết'}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button href="#" onClick={prevCard} className="p-3 bg-white border border-slate-200 rounded-full shadow-lg shadow-indigo-100/50 hover:bg-indigo-50 hover:text-indigo-600 transition-all text-slate-600 active:scale-90 cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="font-extrabold text-slate-600 text-sm">
              Flashcard {currentCardIndex + 1} / {vocabulary.length}
            </span>
            <button href="#" onClick={nextCard} className="p-3 bg-white border border-slate-200 rounded-full shadow-lg shadow-indigo-100/50 hover:bg-indigo-50 hover:text-indigo-600 transition-all text-slate-600 active:scale-90 cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VocabularySection;
