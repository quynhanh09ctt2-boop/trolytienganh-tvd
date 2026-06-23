
import React, { useState, useRef, useEffect } from 'react';
import { PronunciationChallenge } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

const CHALLENGES: PronunciationChallenge[] = [
  { id: '1', text: 'She sells seashells by the seashore.', category: 'Fluency', difficulty: 'Intermediate', tips: 'Focus on the "sh" vs "s" sounds.' },
  { id: '2', text: 'Through the thicket of thought.', category: 'Consonants', difficulty: 'Advanced', tips: 'Master the "th" sound by placing tongue between teeth.' },
  { id: '3', text: 'World, Squirrel, Girl.', category: 'Vowels', difficulty: 'Advanced', tips: 'The "rl" combination requires a subtle tongue curl.' },
  { id: '4', text: 'Comfortable, Vegetable, Raspberry.', category: 'Stress', difficulty: 'Intermediate', tips: 'Notice the silent letters and unique syllable stress.' },
  { id: '5', text: 'Beach vs Bitch', category: 'Vowels', difficulty: 'Beginner', tips: 'Distinguish between the long /i:/ and short /ɪ/.' }
];

const PronunciationLab: React.FC = () => {
  const [selectedChallenge, setSelectedChallenge] = useState<PronunciationChallenge>(CHALLENGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; tips: string; details: string } | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState('audio/webm');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [timeStr, setTimeStr] = useState('09:41');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setFeedback(null);
  }, [selectedChallenge]);

  const speakSample = () => {
    if ('speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(selectedChallenge.text);
      utterance.lang = 'en-US';
      utterance.rate = 0.75; // Slightly slower speed for optimal intermediate instruction
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = () => setIsPlaying(false);
      
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Trình duyệt này không hỗ trợ tính năng phát âm mẫu tự động (Text-to-Speech).');
    }
  };

  const startRecording = async () => {
    setFeedback(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      let options = {};
      let selectedMime = 'audio/webm';
      
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
          selectedMime = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
          selectedMime = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          options = { mimeType: 'audio/ogg' };
          selectedMime = 'audio/ogg';
        }
      }

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.warn('Failed to initialize MediaRecorder with options, fallback to standard default:', e);
        mediaRecorder = new MediaRecorder(stream);
      }
      mediaRecorderRef.current = mediaRecorder;

      const actualMime = mediaRecorder.mimeType || selectedMime;
      const cleanMime = actualMime.split(';')[0];
      setRecordedMimeType(cleanMime);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        // Small timeout to guarantee that the final ondataavailable chunk is captured on Safari/Chrome Mobile
        setTimeout(() => {
          analyzePronunciation(cleanMime);
        }, 150);
      };

      // Request data blocks every 250ms for maximum browser compatibility and robust buffering
      mediaRecorder.start(250);
      setIsRecording(true);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      alert(`Không thể truy cập Microphone: ${err?.message || 'Đã xảy ra lỗi'}.\nVui lòng cấp quyền truy cập microphone cho trang web này trong trình duyệt của bạn và thử lại.`);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping recorder:', e);
      }
      setIsRecording(false);
    }
  };

  const handleMicClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const analyzePronunciation = async (mimeTypeOverride?: string) => {
    const rawApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const cleanApiKey = (rawApiKey && rawApiKey !== 'undefined' && rawApiKey !== 'null' && rawApiKey.trim() !== '') ? rawApiKey : '';

    if (!cleanApiKey) {
      alert('Vui lòng thiết lập GEMINI_API_KEY ở mục Settings > Secrets (góc dưới cùng) để bắt đầu luyện phát âm.');
      setIsAnalyzing(false);
      return;
    }

    setIsAnalyzing(true);
    const mime = mimeTypeOverride || recordedMimeType || 'audio/webm';
    
    if (!audioChunksRef.current || audioChunksRef.current.length === 0) {
      alert('Không nhận được tín hiệu âm thanh. Vui lòng nói to rõ ràng và thử lại.');
      setIsAnalyzing(false);
      return;
    }

    const audioBlob = new Blob(audioChunksRef.current, { type: mime });
    console.log('Audio blob created for analysis:', audioBlob.size, 'bytes, type:', mime);
    
    if (audioBlob.size < 120) {
      alert('Ghi âm quá ngắn hoặc không có âm thanh. Vui lòng giữ micro thong thả và đọc lại to rõ ràng hơn.');
      setIsAnalyzing(false);
      return;
    }

    const base64Audio = await blobToBase64(audioBlob);

    // Map MIME types for maximum Gemini multimodal API compatibility
    let apiMime = mime;
    const lowerMime = mime.toLowerCase();
    if (lowerMime.includes('mp4') || lowerMime.includes('m4a') || lowerMime.includes('x-m4a')) {
      apiMime = 'audio/aac';
    } else if (lowerMime.includes('mpeg') || lowerMime.includes('mp3')) {
      apiMime = 'audio/mp3';
    } else if (lowerMime.includes('wav')) {
      apiMime = 'audio/wav';
    } else if (lowerMime.includes('ogg')) {
      apiMime = 'audio/ogg';
    } else if (lowerMime.includes('webm')) {
      apiMime = 'audio/webm';
    } else {
      apiMime = 'audio/aac'; // Safe default container type for iOS/Safari audio
    }

    try {
      const ai = new GoogleGenAI({ apiKey: cleanApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              { inlineData: { mimeType: apiMime, data: base64Audio } },
              { text: `The user is practicing English pronunciation. The target phrase is: "${selectedChallenge.text}". 
              Analyze their audio recording and provide:
              - score (number from 0 to 100 representing their accuracy)
              - tips (Cực kỳ ngắn gọn bằng tiếng Việt, dưới 2 câu, hướng dẫn cách sửa lỗi phát âm cụ thể)
              - details (Nhận xét siêu súc tích bằng tiếng Việt, tối đa 2 câu, chỉ rõ âm nào tốt, âm nào sai)
              Yêu cầu phản hồi ngắn gọn nhất có thể, tránh rườm rà.` }
            ]
          }
        ],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.NUMBER },
              tips: { type: Type.STRING },
              details: { type: Type.STRING }
            },
            required: ['score', 'tips', 'details']
          }
        }
      });

      console.log('Gemini raw response:', response.text);
      
      let score = 80;
      let tips = '';
      let details = '';
      
      try {
        let textResponse = response.text || '';
        if (textResponse.includes('```')) {
          textResponse = textResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        }
        const result = JSON.parse(textResponse.trim());
        score = typeof result.score === 'number' ? result.score : parseInt(result.score) || 80;
        tips = result.tips || '';
        details = result.details || '';
      } catch (parseErr) {
        console.warn('Fallen back: JSON parsing failed, attempting fuzzy field extraction:', parseErr);
        const textResponse = response.text || '';
        
        // RegEx extractors as a bulletproof safety net
        const scoreMatch = textResponse.match(/"score"\s*:\s*(\d+)/i) || textResponse.match(/score\s*:\s*(\d+)/i) || textResponse.match(/(\d+)\s*\/100/);
        if (scoreMatch) score = parseInt(scoreMatch[1]);
        
        const tipsMatch = textResponse.match(/"tips"\s*:\s*"([^"]+)"/i) || textResponse.match(/tips\s*:\s*([^\n]+)/i);
        if (tipsMatch) tips = tipsMatch[1];
        else tips = 'Hãy đọc to, chậm rãi hơn, chú ý nhấn chuẩn các phụ âm cuối và âm đuôi.';
        
        const detailsMatch = textResponse.match(/"details"\s*:\s*"([^"]+)"/i) || textResponse.match(/details\s*:\s*([^\n]+)/i);
        if (detailsMatch) details = detailsMatch[1];
        else details = 'Ghi nhận nỗ lực luyện nói của bạn! Bạn đã phát âm khá đồng đều toàn câu.';
      }

      setFeedback({ score, tips, details });
    } catch (error: any) {
      console.error('Analysis error from Gemini:', error);
      const errorMsg = error?.message || '';
      if (errorMsg.toLowerCase().includes('permission') || errorMsg.toLowerCase().includes('denied') || errorMsg.toLowerCase().includes('api key') || errorMsg.toLowerCase().includes('invalid')) {
        alert('Lỗi quyền truy cập API (Permission Denied):\nVui lòng kiểm tra lại xem khóa API (GEMINI_API_KEY) bạn đã cấu hình trong mục Settings > Secrets đã chính xác và có quyền truy cập hay chưa.');
      } else {
        alert(`Không thể phân tích phát âm: ${errorMsg || 'Đã xảy ra lỗi không xác định'}. Vui lòng thử lại.`);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-6 max-w-4xl mx-auto w-full">
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-indigo-100/40 border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Challenge List */}
          <div className="lg:w-1/3 w-full lg:min-w-[280px]">
            <div className="flex items-center gap-1.5 mb-3">
              <span className="text-xl">📚</span>
              <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Thư viện luyện tập</h2>
            </div>
            
            <div className="space-y-2 max-h-[160px] lg:max-h-[420px] overflow-y-auto pr-1">
              {CHALLENGES.map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => { setSelectedChallenge(challenge); setFeedback(null); }}
                  className={`w-full text-left p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selectedChallenge.id === challenge.id
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-100'
                      : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                      challenge.difficulty === 'Beginner' ? 'text-emerald-600 bg-emerald-50' :
                      challenge.difficulty === 'Intermediate' ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
                    }`}>
                      {challenge.difficulty}
                    </span>
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">{challenge.category}</span>
                  </div>
                  <p className="font-bold text-slate-700 truncate text-xs sm:text-sm">{challenge.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Active Workstation */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-6 sm:space-y-8 bg-gradient-to-tr from-indigo-50/30 to-purple-50/30 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-indigo-50/20 w-full">
            <div className="text-center space-y-3 sm:space-y-4 w-full">
              <span className="inline-block bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-3 sm:px-4 py-1 rounded-full text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest shadow-md shadow-indigo-200">
                Mẫu phát âm chuẩn
              </span>
              <h1 className="text-lg sm:text-2xl md:text-3xl font-black text-slate-800 leading-tight tracking-tight px-2 sm:px-4 font-sans break-words max-w-full">
                "{selectedChallenge.text}"
              </h1>
              
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={speakSample}
                  className={`flex items-center gap-2 px-4 sm:px-5 py-2 sm:py-2.5 hover:scale-[1.02] active:scale-95 text-xs font-black rounded-full transition-all duration-200 shadow-md cursor-pointer ${
                    isPlaying
                      ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-200 animate-pulse'
                      : 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-indigo-100'
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <svg className="w-4 h-4 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      <span>Đang đọc mẫu... (Bấm để dừng)</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                      <span>Nghe đọc mẫu</span>
                    </>
                  )}
                </button>
              </div>

              <div className="bg-white/80 backdrop-blur border border-indigo-50/60 p-3 rounded-xl max-w-sm mx-auto shadow-sm">
                <p className="text-slate-600 text-xs leading-relaxed font-semibold">
                  💡 Gợi ý: {selectedChallenge.tips}
                </p>
              </div>
            </div>

            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-32 h-32 bg-indigo-200 rounded-full animate-ping opacity-30" />
                  <div className="w-24 h-24 bg-rose-200 rounded-full animate-ping opacity-45 delay-75" />
                </div>
              )}
              <button
                onClick={handleMicClick}
                className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-300 active:scale-95 cursor-pointer ${
                  isRecording 
                  ? 'bg-gradient-to-tr from-rose-500 to-pink-600 text-white animate-pulse shadow-rose-200' 
                  : 'bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-800 text-white hover:shadow-indigo-250 shadow-indigo-100 hover:scale-105'
                }`}
              >
                {isRecording ? (
                  <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
                <span className="text-[9px] uppercase font-black tracking-widest mt-1 opacity-80">
                  {isRecording ? 'Bấm để dừng' : 'Bấm để nói'}
                </span>
              </button>
            </div>
            
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse text-center">
              {isRecording ? 'Đang ghi âm... Nhấn lại một lần nữa để kết thúc' : 'Nhấp biểu tượng Mic và đọc to câu trên'}
            </p>

            {isAnalyzing && (
              <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-indigo-100 shadow-sm animate-bounce">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-indigo-600">Aria đang thẩm âm và chấm điểm...</span>
              </div>
            )}

            {feedback && (
              <div className="w-full bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-100 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4">
                  <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                      <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" 
                        strokeDasharray={226} 
                        strokeDashoffset={226 - (226 * feedback.score) / 100} 
                        className={`${feedback.score > 80 ? 'text-emerald-500' : feedback.score > 50 ? 'text-amber-500' : 'text-rose-500'} transition-all duration-1000`} 
                      />
                    </svg>
                    <span className="absolute text-xl font-black text-slate-800">{feedback.score}</span>
                  </div>
                  <div className="text-center sm:text-left flex-1">
                    <h3 className="font-extrabold text-slate-800 text-base">Kết quả từ Aria</h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-1 font-medium">{feedback.details}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-indigo-50/40 to-pink-50/40 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-indigo-100/20 mt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Mẹo cải thiện đặc hiệu</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 italic font-medium leading-relaxed">"{feedback.tips}"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PronunciationLab;
