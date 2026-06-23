import React, { useState, useRef } from 'react';
import { PronunciationChallenge } from '../types';
import { GoogleGenAI } from '@google/genai';

const CHALLENGES: PronunciationChallenge[] = [
  { id: '1', text: 'She sells seashells by the seashore.', category: 'Fluency', difficulty: 'Intermediate', tips: 'Focus on the "sh" vs "s" sounds.' },
  { id: '2', text: 'Through the thicket of thought.', category: 'Consonants', difficulty: 'Advanced', tips: 'Master the \"th\" sound by placing tongue between teeth.' },
  { id: '3', text: 'World, Squirrel, Girl.', category: 'Vowels', difficulty: 'Advanced', tips: 'The "rl" combination requires a subtle tongue curl.' },
  { id: '4', text: 'Comfortable, Vegetable, Raspberry.', category: 'Stress', difficulty: 'Intermediate', tips: 'Notice the silent letters and unique syllable stress.' },
  { id: '5', text: 'Beach vs Bitch', category: 'Vowels', difficulty: 'Beginner', tips: 'Distinguish between the long /i:/ and short /ɪ/.' }
];

// SỬA TẠI ĐÂY: Sử dụng biến môi trường chuẩn của Vite để nhận key từ Vercel
const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || (process.env.GEMINI_API_KEY as string) });

const PronunciationLab: React.FC = () => {
  const [selectedChallenge, setSelectedChallenge] = useState<PronunciationChallenge>(CHALLENGES[0]);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState<{ score: number; tips: string; details: string } | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      setFeedback(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await analyzePronunciation(audioBlob);
        
        // Tắt luồng micro sau khi thu xong để bảo mật
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Không thể truy cập Microphone. Vui lòng kiểm tra quyền trình duyệt.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const analyzePronunciation = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    try {
      // Chuyển đổi blob âm thanh sang định dạng base64 mã hóa
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];

        // Gọi mô hình gemini-2.5-flash tối ưu tác vụ chấm điểm
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: 'audio/webm',
                    data: base64Data
                  }
                },
                {
                  text: `Analyze the user's pronunciation for this target text: "${selectedChallenge.text}". 
                  Compare the audio to the target text. Assess accuracy, stress, and rhythm.
                  Provide a feedback score out of 100, specific details on what was wrong, and actionable tips to improve.`
                }
              ]
            }
          ],
          config: {
            // SỬA TẠI ĐÂY: Chuẩn hóa cấu hình schema JSON ép kiểu dữ liệu trả về chính xác
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT" as any,
              properties: {
                score: { type: "INTEGER" as any },
                tips: { type: "STRING" as any },
                details: { type: "STRING" as any }
              },
              required: ["score", "tips", "details"]
            }
          }
        });

        const responseText = response.text;
        if (responseText) {
          const result = JSON.parse(responseText);
          setFeedback(result);
        } else {
          throw new Error("Empty response from AI");
        }
      };
    } catch (err) {
      console.error("Error analyzing pronunciation:", err);
      alert("Có lỗi xảy ra khi phân tích phát âm. Vui lòng thử lại!");
      setFeedback({
        score: 0,
        details: "Hệ thống không thể phân tích được âm thanh thu vào. Cần kiểm tra lại kết nối micro và API Key.",
        tips: "Hãy thử nói to, rõ ràng và đảm bảo không gian xung quanh không quá ồn."
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      <div className="text-center md:text-left space-y-2">
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
          🎧 Phòng Thẩm Âm <span className="text-indigo-600">Pronunciation Lab</span>
        </h1>
        <p className="text-sm text-slate-500 font-medium">
          Thử thách phát âm các mẫu câu tiếng Anh học thuật và nhận đánh giá chi tiết tức thì từ Trợ lý Aria.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột danh sách thử thách */}
        <div className="lg:col-span-1 space-y-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block px-1">Danh sách thử thách</span>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {CHALLENGES.map((challenge) => (
              <button
                key={challenge.id}
                onClick={() => { setSelectedChallenge(challenge); setFeedback(null); }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                  selectedChallenge.id === challenge.id
                    ? 'bg-purple-50/90 border-purple-400 shadow-sm'
                    : 'bg-white border-slate-100 hover:bg-slate-50'
                }`}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    challenge.difficulty === 'Advanced' ? 'bg-rose-50 text-rose-600' :
                    challenge.difficulty === 'Intermediate' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
                  }`}>
                    {challenge.difficulty}
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">{challenge.category}</span>
                </div>
                <p className="text-sm font-bold text-slate-700 line-clamp-2">{challenge.text}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cột giao diện luyện tập trực quan */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 to-indigo-500" />
            
            <div className="space-y-2">
              <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest block">Mẫu câu tập luyện</span>
              <p className="text-xl md:text-2xl font-black text-slate-800 leading-snug font-serif bg-slate-50/60 p-4 rounded-xl border border-slate-100/50">
                "{selectedChallenge.text}"
              </p>
              <p className="text-xs text-slate-400 font-medium italic px-1">Gợi ý phát âm: {selectedChallenge.tips}</p>
            </div>

            {/* Bảng điều khiển Micro thu âm */}
            <div className="flex flex-col items-center justify-center py-6 space-y-4 bg-slate-50/40 rounded-2xl border border-dashed border-slate-200">
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isAnalyzing}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-white transition-all transform shadow-lg cursor-pointer active:scale-95 ${
                  isRecording 
                    ? 'bg-rose-500 animate-pulse scale-105 shadow-rose-200' 
                    : isAnalyzing 
                      ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                      : 'bg-gradient-to-tr from-purple-600 to-indigo-600 hover:shadow-indigo-100 shadow-md'
                }`}
              >
                {isAnalyzing ? (
                  <svg className="w-8 h-8 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 013-3h0a3 3 0 013 3v1a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>
              <div className="text-center">
                <p className="text-sm font-extrabold text-slate-700">
                  {isRecording ? "Đang lắng nghe... Thả chuột để hoàn thành" : isAnalyzing ? "Aria đang phân tích ngữ âm..." : "Nhấn và giữ nút Micro để nói"}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">Hệ thống tự động chấm điểm dựa trên giọng bản xứ</p>
              </div>
            </div>

            {/* Khung hiển thị kết quả chấm điểm */}
            {feedback && (
              <div className="space-y-4 border-t border-slate-100 pt-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  <div className="relative w-16 h-16 flex items-center justify-center bg-white rounded-full shadow-inner border border-slate-100 shrink-0">
                    <svg className="w-14 h-14 transform -rotate-90">
                      <circle cx="28" cy="28" r="24" stroke="#f1f5f9" strokeWidth="4" fill="transparent" />
                      <circle 
                        cx="28" cy="28" r="24" 
                        stroke={feedback.score > 80 ? '#10b981' : feedback.score > 50 ? '#f59e0b' : '#ef4444'} 
                        strokeWidth="4" fill="transparent" 
                        strokeDasharray={2 * Math.PI * 24}
                        strokeDashoffset={2 * Math.PI * 24 * (1 - feedback.score / 100)}
                        className="transition-all duration-1000"
                      />
                    </svg>
                    <span className="absolute text-base font-black text-slate-800">{feedback.score}</span>
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <h3 className="font-extrabold text-slate-800 text-sm md:text-base">Kết quả từ Trợ lý Aria</h3>
                    <p className="text-xs md:text-sm text-slate-600 leading-relaxed font-medium">{feedback.details}</p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50/40 to-indigo-50/40 p-4 rounded-xl border border-purple-100/30">
                  <div className="flex items-center gap-2 mb-1.5">
                    <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-[10px] font-black text-purple-700 uppercase tracking-wider">Mẹo sửa lỗi đặc hiệu</span>
                  </div>
                  <p className="text-xs md:text-sm text-slate-600 font-medium leading-relaxed">{feedback.tips}</p>
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
