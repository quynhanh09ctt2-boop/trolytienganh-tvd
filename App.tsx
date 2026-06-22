
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ConversationView from './components/ConversationView';
import TopicSelector from './components/TopicSelector';
import StatusBadge from './components/StatusBadge';
import VocabularySection from './components/VocabularySection';
import PronunciationLab from './components/PronunciationLab';
import { GoogleGenAI, Modality, Type } from '@google/genai';
import { Message, SessionStatus, Topic, VocabularyItem, AppView } from './types';
import { TOPICS, getSystemInstruction } from './constants';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('practice');
  const [status, setStatus] = useState<SessionStatus>(SessionStatus.DISCONNECTED);
  const [history, setHistory] = useState<Message[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic>(TOPICS[0]);
  const [speakingRate, setSpeakingRate] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [isRecording, setIsRecording] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [vocabularyList, setVocabularyList] = useState<VocabularyItem[]>(() => {
    const saved = localStorage.getItem('fluentify_vocab');
    return saved ? JSON.parse(saved) : [];
  });
  
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const currentInputTranscription = useRef('');
  const currentOutputTranscription = useRef('');

  useEffect(() => {
    localStorage.setItem('fluentify_vocab', JSON.stringify(vocabularyList));
  }, [vocabularyList]);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
    }
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const handleTranslate = async (messageId: string, text: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate the following English sentence to Vietnamese naturally. If there is pronunciation feedback in brackets, translate that too. Text: "${text}"`,
      });
      const translation = response.text?.trim();
      if (translation) {
        setHistory(prev => prev.map(msg => msg.id === messageId ? { ...msg, translation } : msg));
      }
    } catch (error) {
      console.error('Translation error:', error);
    }
  };

  const handleTranslateVocab = async (vocabId: string) => {
    const item = vocabularyList.find(i => i.id === vocabId);
    if (!item || (item.definitionTranslation && item.exampleTranslation)) return;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Translate the following dictionary entry to Vietnamese.
        Definition: "${item.definition}"
        Example: "${item.example}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              definitionTranslation: { type: Type.STRING },
              exampleTranslation: { type: Type.STRING }
            },
            required: ["definitionTranslation", "exampleTranslation"]
          }
        }
      });
      const result = JSON.parse(response.text);
      setVocabularyList(prev => prev.map(i => i.id === vocabId ? { ...i, ...result } : i));
    } catch (error) {
      console.error('Vocab translation error:', error);
    }
  };

  const extractNewVocabulary = async (userText: string, assistantText: string) => {
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Analyze this dialogue exchange and extract 1 or 2 high-value English vocabulary words or phrases. User: "${userText}" Aria: "${assistantText}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                word: { type: Type.STRING },
                definition: { type: Type.STRING },
                example: { type: Type.STRING },
                translation: { type: Type.STRING }
              },
              required: ["word", "definition", "example", "translation"]
            }
          }
        }
      });
      const items = JSON.parse(response.text);
      if (Array.isArray(items)) {
        setVocabularyList(prev => {
          const newItems = items.filter(item => !prev.some(p => p.word.toLowerCase() === item.word.toLowerCase()));
          return [...prev, ...newItems.map(item => ({ ...item, id: Math.random().toString(), learnedAt: Date.now() }))];
        });
      }
    } catch (error) {}
  };

  const startSession = async () => {
    if (!process.env.API_KEY) {
      alert('Vui lòng thiết lập GEMINI_API_KEY ở mục Settings > Secrets để bắt đầu!');
      return;
    }
    try {
      setStatus(SessionStatus.CONNECTING);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const sessionPromise = ai.live.connect({
        model: 'gemini-3.1-flash-live-preview',
        callbacks: {
          onopen: () => {
            setStatus(SessionStatus.CONNECTED);
            setIsRecording(true);
            sessionPromise.then(session => session.sendRealtimeInput({ text: selectedTopic.prompt }));
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              sessionPromise.then(session => session.sendRealtimeInput({ audio: createBlob(inputData) }));
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) currentOutputTranscription.current += message.serverContent.outputTranscription.text;
            if (message.serverContent?.inputTranscription) currentInputTranscription.current += message.serverContent.inputTranscription.text;
            if (message.serverContent?.turnComplete) {
              const u = currentInputTranscription.current.trim();
              const a = currentOutputTranscription.current.trim();
              if (u) setHistory(prev => [...prev, { id: Date.now() + 'u', role: 'user', text: u, timestamp: Date.now() }]);
              if (a) {
                setHistory(prev => [...prev, { id: Date.now() + 'a', role: 'assistant', text: a, timestamp: Date.now() }]);
                extractNewVocabulary(u, a);
              }
              currentInputTranscription.current = ''; currentOutputTranscription.current = '';
            }
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextOutRef.current) {
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, audioContextOutRef.current.currentTime);
              const audioBuffer = await decodeAudioData(decode(base64Audio), audioContextOutRef.current, 24000, 1);
              const source = audioContextOutRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextOutRef.current.destination);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }
          },
          onerror: () => setStatus(SessionStatus.ERROR),
          onclose: () => { setStatus(SessionStatus.DISCONNECTED); setIsRecording(false); }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          systemInstruction: getSystemInstruction(speakingRate),
          inputAudioTranscription: {}, outputAudioTranscription: {},
        }
      });
      sessionRef.current = await sessionPromise;
    } catch (err) { setStatus(SessionStatus.ERROR); }
  };

  const stopSession = () => {
    if (sessionRef.current) sessionRef.current.close();
    setIsRecording(false);
    setStatus(SessionStatus.DISCONNECTED);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50/80 via-[#fff8f8] to-[#f3faf8] relative font-sans text-slate-800">
      <Header currentView={view} onViewChange={setView} onShowGuide={() => setShowGuide(true)} />
      
      {showGuide && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 border border-indigo-100">
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-white text-center">
              <h3 className="text-xl font-bold flex items-center justify-center gap-2">
                <span>⚡</span> Cách sử dụng File .BAT
              </h3>
              <p className="text-indigo-100 text-sm mt-1">Khởi chạy ứng dụng chuyên nghiệp, mượt mà hơn</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0 font-bold shadow-inner">1</div>
                <div>
                  <h4 className="font-bold text-slate-800">Cấp quyền chạy</h4>
                  <p className="text-sm text-slate-500">Vì Windows bảo mật kỹ, khi mở file lần đầu bạn hãy chọn <span className="font-bold text-indigo-600">More info</span> và nhấn <span className="font-bold text-indigo-600">Run anyway</span>.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0 font-bold shadow-inner">2</div>
                <div>
                  <h4 className="font-bold text-slate-800">Trải nghiệm App Mode</h4>
                  <p className="text-sm text-slate-500">File này sẽ tự động mở ứng dụng trong một cửa sổ riêng biệt không có thanh địa chỉ, giúp bạn tập trung học tập tốt hơn.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center shrink-0 font-bold shadow-inner">3</div>
                <div>
                  <h4 className="font-bold text-slate-800">Lưu ra Desktop</h4>
                  <p className="text-sm text-slate-500">Kéo file <span className="font-mono text-indigo-600">English_Buddy.bat</span> ra màn hình Desktop để truy cập nhanh bất cứ lúc nào.</p>
                </div>
              </div>
              <button 
                onClick={() => setShowGuide(false)}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100 cursor-pointer"
              >
                Đã hiểu, đóng hướng dẫn
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 flex flex-col lg:flex-row gap-6">
        {view === 'practice' ? (
          <>
            <div className="space-y-6 lg:w-1/3">
              <section className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-indigo-100/40 border border-indigo-100/50 hover:shadow-xl transition-all duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-black text-slate-800 flex items-center gap-1.5">
                    <span className="text-xl">🎯</span> Chủ đề hội thoại
                  </h2>
                  <span className="text-[10px] uppercase font-bold text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full">
                    Gợi ý Việt-Anh
                  </span>
                </div>
                <TopicSelector topics={TOPICS} selected={selectedTopic} onSelect={setSelectedTopic} disabled={status !== SessionStatus.DISCONNECTED} />
              </section>
              <section className="bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-lg shadow-indigo-100/40 border border-indigo-100/50 hover:shadow-xl transition-all duration-300">
                <h2 className="text-lg font-black text-slate-800 mb-4 animate-fade-in flex items-center gap-1.5">
                  <span>⚙️</span> Điều khiển
                </h2>
                
                {/* Tốc độ nói và độ dài câu trả lời */}
                <div className="mb-5 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-2.5">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Tốc độ & Độ dài phản hồi
                    </label>
                    <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      Aria Voice
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-2">
                    {(['slow', 'normal', 'fast'] as const).map((rate) => (
                      <button
                        key={rate}
                        disabled={status !== SessionStatus.DISCONNECTED}
                        onClick={() => setSpeakingRate(rate)}
                        className={`py-2 px-1 rounded-lg text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          speakingRate === rate
                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-100 font-extrabold scale-[1.02]'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        } ${status !== SessionStatus.DISCONNECTED ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span className="text-sm">
                          {rate === 'slow' ? '🐢' : rate === 'normal' ? '🚶' : '⚡'}
                        </span>
                        <span>
                          {rate === 'slow' ? 'Chậm' : rate === 'normal' ? 'Vừa' : 'Nhanh'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
                    {speakingRate === 'slow' ? (
                      <span className="text-indigo-600 font-medium">
                        ✨ <b>Chế độ Chậm</b>: Trợ lý nói cực kỳ chậm, từ tốn, dùng từ đơn giản và <b>chỉ trả lời 1-2 câu ngắn gọn</b> giúp bạn dễ nghe, dễ luyện nói theo.
                      </span>
                    ) : speakingRate === 'normal' ? (
                      <span>
                        🌍 <b>Chế độ Vừa</b>: Tốc độ đàm thoại phù hợp với người học, phản hồi ngắn gọn khoảng 2-3 câu vừa phải.
                      </span>
                    ) : (
                      <span>
                        🔥 <b>Chế độ Nhanh</b>: Giao tiếp với tốc độ tự nhiên của người bản xứ.
                      </span>
                    )}
                  </p>
                </div>

                <button
                  onClick={status === SessionStatus.CONNECTED ? stopSession : startSession}
                  className={`w-full py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    status === SessionStatus.CONNECTED 
                      ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 shadow-sm' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100'
                  }`}
                >
                  {status === SessionStatus.CONNECTED ? 'Kết thúc buổi học' : 'Bắt đầu luyện nói'}
                </button>
              </section>
            </div>
            <div className="flex-1 lg:w-2/3 h-[calc(100vh-180px)] flex flex-col">
              <ConversationView history={history} isRecording={isRecording} onTranslate={handleTranslate} />
            </div>
          </>
        ) : view === 'vocabulary' ? (
          <VocabularySection 
            vocabulary={vocabularyList} 
            onRemove={(id) => setVocabularyList(v => v.filter(i => i.id !== id))}
            onTranslate={handleTranslateVocab}
          />
        ) : (
          <PronunciationLab />
        )}
      </main>
    </div>
  );
};

export default App;
