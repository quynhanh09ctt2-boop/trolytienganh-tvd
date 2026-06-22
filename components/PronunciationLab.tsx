
import React, { useState, useRef } from 'react';
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setFeedback(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        analyzePronunciation();
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
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

  const analyzePronunciation = async () => {
    setIsAnalyzing(true);
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    const base64Audio = await blobToBase64(audioBlob);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            parts: [
              { inlineData: { mimeType: 'audio/webm', data: base64Audio } },
              { text: `The user is practicing English pronunciation. The target phrase is: "${selectedChallenge.text}". 
              Analyze their audio recording and provide a score (0-100), helpful tips for improvement, and a detailed breakdown of what they did well or poorly.` }
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

      const result = JSON.parse(response.text);
      setFeedback(result);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Could not analyze pronunciation. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full">
      <div className="bg-white/95 backdrop-blur-md p-8 rounded-3xl shadow-xl shadow-indigo-100/40 border border-slate-100">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Challenge List */}
          <div className="md:w-1/3 min-w-[240px]">
            <div className="flex items-center gap-1.5 mb-4">
              <span className="text-xl">📚</span>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Thư viện luyện tập</h2>
            </div>
            
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {CHALLENGES.map((challenge) => (
                <button
                  key={challenge.id}
                  onClick={() => { setSelectedChallenge(challenge); setFeedback(null); }}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selectedChallenge.id === challenge.id
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-100'
                      : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      challenge.difficulty === 'Beginner' ? 'text-emerald-600 bg-emerald-50' :
                      challenge.difficulty === 'Intermediate' ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
                    }`}>
                      {challenge.difficulty}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{challenge.category}</span>
                  </div>
                  <p className="font-bold text-slate-700 truncate text-sm">{challenge.text}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Active Workstation */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-gradient-to-tr from-indigo-50/30 to-purple-50/30 p-6 rounded-2xl border border-indigo-50/20">
            <div className="text-center space-y-4">
              <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-md shadow-indigo-200">
                Mẫu phát âm chuẩn
              </span>
              <h1 className="text-3xl font-black text-slate-800 leading-tight tracking-tight px-4 font-sans">
                "{selectedChallenge.text}"
              </h1>
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
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
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
                  {isRecording ? 'Thả ra' : 'Ấn và giữ'}
                </span>
              </button>
            </div>
            
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest animate-pulse">
              {isRecording ? 'Đang ghi âm... Thả ra để Aria chấm điểm' : 'Giữ Mic và đọc to câu trên'}
            </p>

            {isAnalyzing && (
              <div className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl border border-indigo-100 shadow-sm animate-bounce">
                <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-bold text-indigo-600">Aria đang thẩm âm và chấm điểm...</span>
              </div>
            )}

            {feedback && (
              <div className="w-full bg-white rounded-3xl p-6 border border-slate-100 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex flex-col sm:flex-row items-center gap-6 mb-4">
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
                  <div className="text-center sm:text-left">
                    <h3 className="font-extrabold text-slate-800 text-base">Kết quả từ Aria</h3>
                    <p className="text-sm text-slate-600 leading-relaxed mt-1">{feedback.details}</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-indigo-50/40 to-pink-50/40 p-4 rounded-2xl border border-indigo-100/20">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-pink-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Mẹo cải thiện đặc hiệu</span>
                  </div>
                  <p className="text-sm text-slate-700 italic font-medium leading-relaxed">"{feedback.tips}"</p>
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
