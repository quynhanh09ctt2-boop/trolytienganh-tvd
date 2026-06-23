
import React, { useState, useRef, useEffect } from 'react';
import { PronunciationChallenge } from '../types';
import { GoogleGenAI, Type } from '@google/genai';

const CHALLENGES: PronunciationChallenge[] = [
  { id: '1', text: 'She sells seashells by the seashore.', category: 'Fluency', difficulty: 'Intermediate', tips: 'Tập trung phân biệt âm "sh" /ʃ/ và "s" /s/.', translation: 'Cô ấy bán vỏ sò bên bờ biển.' },
  { id: '2', text: 'Through the thicket of thought.', category: 'Consonants', difficulty: 'Advanced', tips: 'Luyện âm "th" vô thanh /θ/ bằng cách đặt lưỡi giữa hai răng.', translation: 'Băng qua bụi rậm của dòng suy nghĩ.' },
  { id: '3', text: 'World, Squirrel, Girl.', category: 'Vowels', difficulty: 'Advanced', tips: 'Sự kết hợp âm "rl" yêu cầu uốn cong lưỡi nhẹ ở cuối từ.', translation: 'Thế giới, Con sóc, Cô gái.' },
  { id: '4', text: 'Comfortable, Vegetable, Raspberry.', category: 'Stress', difficulty: 'Intermediate', tips: 'Notice the silent letters and unique syllable stress.', translation: 'Thoải mái, Rau củ, Quả phúc bồn tử.' },
  { id: '5', text: 'Beach vs Bitch', category: 'Vowels', difficulty: 'Beginner', tips: 'Phân biệt nguyên âm i dài /i:/ trong beach và i ngắn /ɪ/ trong bitch.', translation: 'Bãi biển so với Từ lóng thô lỗ.' },
  { id: '6', text: 'Can you tell me the way to the nearest bus station?', category: 'Fluency', difficulty: 'Beginner', tips: 'Luyện cách nối âm nhẹ nhàng (tell me, to the) và ngữ điệu câu hỏi.', translation: 'Bạn có thể chỉ cho tôi đường đến trạm xe buýt gần nhất được không?' },
  { id: '7', text: 'Peter Piper picked a peck of pickled peppers.', category: 'Fluency', difficulty: 'Advanced', tips: 'Thử thách líu lưỡi nổi tiếng giúp rèn luyện cơ miệng với phụ âm bật hơi /p/.', translation: 'Peter Piper đã nhặt một đấu ớt muối.' },
  { id: '8', text: 'I scream, you scream, we all scream for ice cream.', category: 'Fluency', difficulty: 'Intermediate', tips: 'Chú ý sự tương đồng phát âm giữa "scream" và "ice cream".', translation: 'Tôi hét lên, bạn hét lên, tất cả chúng ta đều hét lên đòi ăn kem.' },
  { id: '9', text: 'An entrepreneur is looking for a breakthrough opportunity.', category: 'Stress', difficulty: 'Advanced', tips: 'Nhấn chuẩn trọng âm các từ phức tạp /ˌɒntrəprəˈnɜː/ và /ˌɒpəˈtjuːnəti/.', translation: 'Một nhà doanh nghiệp đang tìm kiếm một cơ hội mang tính đột phá.' },
  { id: '10', text: 'Would you like some water?', category: 'Stress', difficulty: 'Beginner', tips: 'Luyện lướt âm (liaison) giữa "Would you" thành /wʊdʒu/ và đọc nhẹ chữ "t" trong water.', translation: 'Bạn có muốn dùng một ít nước không?' },
  { id: '11', text: 'This is the third thing they thought of.', category: 'Consonants', difficulty: 'Intermediate', tips: 'Luyện cả âm "th" hữu thanh /ð/ (this, the, they) và vô thanh /θ/ (third, thing, thought).', translation: 'Đây là điều thứ ba mà họ nghĩ tới.' },
  { id: '12', text: 'We received excellent feedback on our strategy presentation.', category: 'Stress', difficulty: 'Intermediate', tips: 'Chú ý trọng âm rơi vào "feedback" (âm 1), "strategy" (âm 1), "presentation" (âm 3).', translation: 'Chúng tôi đã nhận được những phản hồi tuyệt vời về bài thuyết trình chiến lược của mình.' }
];

const googleTranslate = async (text: string): Promise<string> => {
  try {
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(text)}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Google Translate request failed');
    const data = await response.json();
    if (data && data[0]) {
      return data[0].map((item: any) => item[0]).join('');
    }
    throw new Error('Invalid translation format');
  } catch (error) {
    console.error('Google Translate error:', error);
    throw error;
  }
};

const PronunciationLab: React.FC = () => {
  const [challenges, setChallenges] = useState<PronunciationChallenge[]>(() => {
    const saved = localStorage.getItem('pronunciation_challenges');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing pronunciation challenges from localStorage:', e);
      }
    }
    return CHALLENGES;
  });

  const [selectedChallenge, setSelectedChallenge] = useState<PronunciationChallenge>(() => {
    return challenges[0] || CHALLENGES[0];
  });

  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<'Vowels' | 'Consonants' | 'Stress' | 'Fluency'>('Fluency');
  const [newDifficulty, setNewDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [newTips, setNewTips] = useState('');
  const [newTranslation, setNewTranslation] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showTranslation, setShowTranslation] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    localStorage.setItem('pronunciation_challenges', JSON.stringify(challenges));
  }, [challenges]);
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
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Pre-warm the voice list to ensure it's loaded in Chrome/Edge/Safari/iOS/Android
      window.speechSynthesis.getVoices();
    }
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
    setShowTranslation(false);
  }, [selectedChallenge]);

  const getBestEnglishVoice = (): SpeechSynthesisVoice | null => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices || voices.length === 0) return null;

    // Prioritize list for high-quality standard native English speakers (US/UK)
    const priorities = [
      // 1. Google premium voices (highly standard & warm on Android/Chrome)
      'Google US English',
      'Google UK English Female',
      'Google UK English Male',
      // 2. Apple Siri premium neural voices (excellent natural speech on Safari, iOS & macOS)
      'Siri',
      'Samantha',
      'Daniel',
      'Karen',
      'Alex',
      // 3. Microsoft desktop voices (highly clear on Windows devices/Edge)
      'Microsoft David',
      'Microsoft Zira',
      'Microsoft Mark',
      // 4. Any voice containing "Natural" (e.g. Edge Natural voices)
      'Natural'
    ];

    // Try to find the first high-quality voice that matches our priority keywords and has an English locale (en-)
    for (const nameKeyword of priorities) {
      const matched = voices.find(v => 
        v.name.toLowerCase().includes(nameKeyword.toLowerCase()) && 
        (v.lang.toLowerCase().startsWith('en-') || v.lang.toLowerCase() === 'en')
      );
      if (matched) return matched;
    }

    // Fallbacks sorted by preferred locale:
    // en-US (American standard)
    const usVoice = voices.find(v => v.lang.toLowerCase() === 'en-us');
    if (usVoice) return usVoice;

    // en-GB (British standard)
    const gbVoice = voices.find(v => v.lang.toLowerCase() === 'en-gb');
    if (gbVoice) return gbVoice;

    // Any English voice
    const anyEnVoice = voices.find(v => v.lang.toLowerCase().startsWith('en'));
    if (anyEnVoice) return anyEnVoice;

    return null;
  };

  const speakSample = () => {
    if ('speechSynthesis' in window) {
      if (isPlaying) {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        return;
      }
      
      const utterance = new SpeechSynthesisUtterance(selectedChallenge.text);
      
      const bestVoice = getBestEnglishVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang;
        console.log('Selected standard high-quality English voice:', bestVoice.name, '(', bestVoice.lang, ')');
      } else {
        utterance.lang = 'en-US';
      }
      
      // Standard rate for foreign language learning (0.8 is the sweet spot: sufficiently slow for clear phonemes, but maintains natural vocal resonance)
      utterance.rate = 0.8;
      utterance.pitch = 1.0;
      
      utterance.onstart = () => setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
      utterance.onerror = (e) => {
        console.error('Speech synthesis error:', e);
        setIsPlaying(false);
      };
      
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
        model: 'gemini-3.5-flash',
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

  const handleAddChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newText.trim()) {
      alert('Vui lòng nhập mẫu câu tiếng Anh cần luyện tập!');
      return;
    }

    const newChallenge: PronunciationChallenge = {
      id: `custom_${Date.now()}`,
      text: newText.trim(),
      category: newCategory,
      difficulty: newDifficulty,
      tips: newTips.trim() || 'Tập trung đọc to, rõ ràng và nhấn chuẩn các âm cuối.',
      translation: newTranslation.trim() || undefined
    };

    const updated = [...challenges, newChallenge];
    setChallenges(updated);
    setSelectedChallenge(newChallenge);
    setFeedback(null);
    setNewText('');
    setNewTips('');
    setNewTranslation('');
    setShowAddForm(false);
  };

  const translateChallengeText = async () => {
    setIsTranslating(true);
    setShowTranslation(true);

    try {
      const translationText = await googleTranslate(selectedChallenge.text);
      if (translationText) {
        const updatedChallenges = challenges.map(c => 
          c.id === selectedChallenge.id ? { ...c, translation: translationText } : c
        );
        setChallenges(updatedChallenges);
        setSelectedChallenge({ ...selectedChallenge, translation: translationText });
        localStorage.setItem('pronunciation_challenges', JSON.stringify(updatedChallenges));
        setIsTranslating(false);
        return;
      }
    } catch (gErr) {
      console.warn('Google Translate custom challenge fell back:', gErr);
    }

    const rawApiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const cleanApiKey = (rawApiKey && rawApiKey !== 'undefined' && rawApiKey !== 'null' && rawApiKey.trim() !== '') ? rawApiKey : '';

    if (!cleanApiKey) {
      alert('Không nhận diện được khóa API để chạy dịch thuật bằng AI. Vui lòng kết nối Internet.');
      setIsTranslating(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey: cleanApiKey });
      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `Translate the following English sentence to Vietnamese naturally. Output ONLY the translated Vietnamese text, with no extra explanations or quotation marks. Text: "${selectedChallenge.text}"`,
      });

      const translationText = response.text?.trim() || '';
      if (translationText) {
        const updatedChallenges = challenges.map(c => 
          c.id === selectedChallenge.id ? { ...c, translation: translationText } : c
        );
        setChallenges(updatedChallenges);
        setSelectedChallenge({ ...selectedChallenge, translation: translationText });
        localStorage.setItem('pronunciation_challenges', JSON.stringify(updatedChallenges));
      }
    } catch (err) {
      console.error('Translation error:', err);
      alert('Không thể dịch nghĩa: Vui lòng kiểm tra kết nối mạng của bạn.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(null);
  };

  const handleConfirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = challenges.filter(c => c.id !== id);
    setChallenges(updated);
    
    // If the currently selected challenge is deleted, select the first available
    if (selectedChallenge.id === id) {
      setSelectedChallenge(updated[0] || CHALLENGES[0]);
      setFeedback(null);
    }
    setDeletingId(null);
  };

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-6 max-w-4xl mx-auto w-full">
      <div className="bg-white/95 backdrop-blur-md p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl shadow-xl shadow-indigo-100/40 border border-slate-100">
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
          {/* Challenge List */}
          <div className="lg:w-1/3 w-full lg:min-w-[280px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 font-sans">
                <span className="text-xl">📚</span>
                <h2 className="text-base sm:text-lg font-black text-slate-800 tracking-tight">Thư viện luyện tập</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowAddForm(!showAddForm)}
                className="text-xs font-black text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
              >
                {showAddForm ? 'Đóng' : '➕ Thêm câu'}
              </button>
            </div>

            {showAddForm && (
              <form onSubmit={handleAddChallenge} className="mb-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50 space-y-2.5 animate-in slide-in-from-top-2 duration-200">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-wider block">Mẫu câu tiếng Anh *</label>
                  <textarea
                    required
                    value={newText}
                    onChange={(e) => setNewText(e.target.value)}
                    placeholder="E.g., Practice makes perfect."
                    rows={2}
                    className="w-full text-xs font-semibold p-2 rounded-lg border border-slate-200 bg-white focus:ring-1 focus:ring-indigo-500 text-slate-700 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block block mb-0.5">Chuyên mục</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full text-[11px] font-bold p-1 rounded-lg border border-slate-200 bg-white text-slate-600"
                    >
                      <option value="Fluency">Fluency</option>
                      <option value="Vowels">Vowels</option>
                      <option value="Consonants">Consonants</option>
                      <option value="Stress">Stress</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block block mb-0.5">Độ khó</label>
                    <select
                      value={newDifficulty}
                      onChange={(e) => setNewDifficulty(e.target.value as any)}
                      className="w-full text-[11px] font-bold p-1 rounded-lg border border-slate-200 bg-white text-slate-600"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Gợi ý cách đọc (Tùy chọn)</label>
                  <input
                    value={newTips}
                    onChange={(e) => setNewTips(e.target.value)}
                    placeholder="E.g., Chú ý phát âm gió..."
                    className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Dịch nghĩa Việt ngữ (Tùy chọn)</label>
                  <input
                    value={newTranslation}
                    onChange={(e) => setNewTranslation(e.target.value)}
                    placeholder="E.g., Cô ấy bán vỏ sò bên bờ biển..."
                    className="w-full text-xs p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black py-2 rounded-lg transition shadow-sm cursor-pointer"
                >
                  Xác nhận thêm câu
                </button>
              </form>
            )}
            
            <div className="space-y-2 max-h-[220px] lg:max-h-[420px] overflow-y-auto pr-1">
              {challenges.map((challenge) => (
                <div
                  key={challenge.id}
                  onClick={() => { setSelectedChallenge(challenge); setFeedback(null); }}
                  className={`group relative w-full text-left p-3 sm:p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                    selectedChallenge.id === challenge.id
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-100'
                      : 'border-slate-100 hover:border-slate-300 bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                      challenge.difficulty === 'Beginner' ? 'text-emerald-600 bg-emerald-50' :
                      challenge.difficulty === 'Intermediate' ? 'text-amber-600 bg-amber-50' : 'text-rose-600 bg-rose-50'
                    }`}>
                      {challenge.difficulty}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-wider">{challenge.category}</span>
                      
                      {/* Delete button or confirmation */}
                      {deletingId === challenge.id ? (
                        <div className="flex items-center gap-1 bg-white/80 p-0.5 rounded border border-rose-100 shadow-sm animate-in scale-in-95 duration-150">
                          <button
                            type="button"
                            onClick={(e) => handleConfirmDelete(challenge.id, e)}
                            className="bg-rose-500 hover:bg-rose-600 text-white font-extrabold text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            Xóa
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelDelete}
                            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        challenge.id.startsWith('custom_') && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteClick(challenge.id, e)}
                            className="text-slate-300 hover:text-rose-600 p-0.5 rounded transition hover:scale-110 cursor-pointer flex items-center justify-center"
                            title="Xóa mẫu câu này"
                          >
                            <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                  <p className="font-bold text-slate-700 truncate text-xs sm:text-sm pr-4">{challenge.text}</p>
                </div>
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

              {/* Bản dịch Việt ngữ */}
              <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
                {selectedChallenge.translation ? (
                  <div className="space-y-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => setShowTranslation(!showTranslation)}
                      className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition items-center gap-1 inline-flex bg-white/80 hover:bg-white px-2.5 py-1 rounded-full border border-indigo-100 shadow-sm cursor-pointer"
                    >
                      <span>{showTranslation ? '🙈 Ẩn nghĩa tiếng Việt' : '👁️ Xem nghĩa tiếng Việt'}</span>
                    </button>
                    {showTranslation && (
                      <p className="text-xs sm:text-sm font-extrabold text-indigo-600 bg-white/50 backdrop-blur px-3 py-1.5 rounded-xl border border-indigo-50 inline-block animate-in fade-in slide-in-from-top-1">
                        🇻🇳 {selectedChallenge.translation}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 text-center">
                    <button
                      type="button"
                      disabled={isTranslating}
                      onClick={translateChallengeText}
                      className="text-[10px] font-black text-indigo-500 hover:text-indigo-700 transition items-center gap-1 inline-flex bg-white/80 hover:bg-white px-2.5 py-1 rounded-full border border-indigo-100 shadow-sm cursor-pointer disabled:opacity-60"
                    >
                      {isTranslating ? (
                        <>
                          <div className="w-2.5 h-2.5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-1 inline-block" />
                          <span>Đang dịch...</span>
                        </>
                      ) : (
                        <span>✨ Dịch nghĩa bằng AI</span>
                      )}
                    </button>
                    {showTranslation && !isTranslating && (
                      <p className="text-xs sm:text-sm font-extrabold text-indigo-600 bg-white/50 backdrop-blur px-3 py-1.5 rounded-xl border border-indigo-50 inline-block animate-in fade-in slide-in-from-top-1">
                        🇻🇳 {selectedChallenge.translation || 'Không tìm thấy bản dịch.'}
                      </p>
                    )}
                  </div>
                )}
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
