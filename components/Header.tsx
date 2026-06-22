
import React from 'react';
import { AppView } from '../types';

interface Props {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  onShowGuide: () => void;
}

const Header: React.FC<Props> = ({ currentView, onViewChange, onShowGuide }) => {
  const downloadDesktopLauncher = () => {
    const url = window.location.href;
    
    // Mã kịch bản Batch cho Windows
    // Lệnh này sẽ mở trình duyệt ở chế độ --app (không viền)
    const batchContent = `@echo off
title English Buddy Launcher
echo Dang khoi dong tro ly tieng Anh English Buddy...
:: Thu mo bang Edge o che do App
start msedge --app="${url}"
if %errorlevel% neq 0 (
    :: Neu khong co Edge, thu mo bang Chrome
    start chrome --app="${url}"
)
if %errorlevel% neq 0 (
    :: Neu ca hai deu loi, mo bang trinh duyet mac dinh
    start "" "${url}"
)
exit`;

    const blob = new Blob([batchContent], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'English_Buddy.bat';
    link.click();
    URL.revokeObjectURL(link.href);
    
    onShowGuide();
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-indigo-100/80 sticky top-0 z-50 shadow-sm shadow-indigo-100/20">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => onViewChange('practice')}>
          <div className="w-10 h-10 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:scale-105 transition-all duration-300">
            <svg className="w-6 h-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 leading-tight tracking-tight">
              English Buddy
            </h1>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex items-center gap-2">
            <button 
              onClick={() => onViewChange('practice')}
              className={`px-4-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'practice' 
                  ? 'text-indigo-600 bg-indigo-50/80 border border-indigo-100/50 shadow-sm shadow-indigo-100' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>💬</span>
              <span>Luyện nói</span>
            </button>
            <button 
              onClick={() => onViewChange('pronunciation')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'pronunciation' 
                  ? 'text-purple-600 bg-purple-50/80 border border-purple-100/50 shadow-sm shadow-purple-100' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>🎯</span>
              <span>Luyện phát âm</span>
            </button>
            <button 
              onClick={() => onViewChange('vocabulary')}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'vocabulary' 
                  ? 'text-emerald-600 bg-emerald-50/80 border border-emerald-100/50 shadow-sm shadow-emerald-100' 
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>📚</span>
              <span>Từ vựng</span>
            </button>
          </nav>
          
          <div className="h-6 w-px bg-slate-200 mx-2 hidden md:block"></div>

          <button 
            onClick={downloadDesktopLauncher}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl text-xs font-bold hover:shadow-lg hover:shadow-indigo-100 transition-all shadow-md shadow-indigo-100/50 cursor-pointer border border-indigo-500/25"
          >
            <svg className="w-4 h-4 text-indigo-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Tải App .BAT</span>
          </button>
        </div>
      </div>
      
      {/* Mobile navigation rail */}
      <div className="md:hidden flex border-t border-slate-100 bg-white/95 px-4 h-12 items-center justify-around text-xs font-bold text-slate-500">
        <button 
          onClick={() => onViewChange('practice')}
          className={`flex items-center gap-1 py-2 px-3 rounded-lg ${currentView === 'practice' ? 'text-indigo-600 bg-indigo-50/70' : ''}`}
        >
          <span>💬 Luyện nói</span>
        </button>
        <button 
          onClick={() => onViewChange('pronunciation')}
          className={`flex items-center gap-1 py-2 px-3 rounded-lg ${currentView === 'pronunciation' ? 'text-purple-600 bg-purple-50/70' : ''}`}
        >
          <span>🎯 Luyện phát âm</span>
        </button>
        <button 
          onClick={() => onViewChange('vocabulary')}
          className={`flex items-center gap-1 py-2 px-3 rounded-lg ${currentView === 'vocabulary' ? 'text-emerald-600 bg-emerald-50/70' : ''}`}
        >
          <span>📚 Từ vựng</span>
        </button>
      </div>
    </header>
  );
};

export default Header;
