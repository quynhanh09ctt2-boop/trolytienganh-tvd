
import { Topic } from './types';

export const TOPICS: Topic[] = [
  {
    id: 'free-talk',
    title: '💬 Free Talk',
    description: 'Trò chuyện cởi mở về bất kỳ đề tài nào bạn thích.',
    prompt: 'Start a friendly, casual conversation with me in English. Ask me how my day is going or invite me to talk about any topic.'
  },
  {
    id: 'daily-communication',
    title: '🏠 Daily Communication',
    description: 'Luyện tập các hội thoại thông thường trong đời sống thường nhật.',
    prompt: 'Let\'s practice daily conversational English. Act as a friend who lives next door. Start by greeting me and asking how my weekend went.'
  },
  {
    id: 'classroom-communication',
    title: '🏫 Classroom Communication',
    description: 'Cách thầy cô và học sinh tương tác, chỉ dẫn chuẩn sư phạm.',
    prompt: 'Let\'s roleplay classroom communication. You are a teacher trainer, and I am an English teacher. Start by greeting me and asking how I manage classroom transitions or ask me to give standard classroom commands.'
  },
  {
    id: 'primary-school-activities',
    title: '🎒 Primary School Activities',
    description: 'Các trò chơi, sinh hoạt và tương tác với các bé tiểu học.',
    prompt: 'Let\'s talk about elementary/primary school activities. Act as a co-teacher. Ask me what warm-up math or English games we should play with our 2nd grade students today.'
  },
  {
    id: 'parent-communication',
    title: '🤝 Parent Communication',
    description: 'Trực tiếp trao đổi tình hình học tập và hành vi của học sinh.',
    prompt: 'Let\'s practice communicating with parents. You are a parent concerned about your child\'s English progress and classroom behavior. I am their teacher. Start the parent-teacher meeting by stating your concern.'
  },
  {
    id: 'teaching-methods',
    title: '📖 Teaching Methods',
    description: 'Thảo luận về các phương pháp giảng dạy tiếng Anh hiệu quả.',
    prompt: 'Let\'s discuss modern educational teaching methods (like TPR, communicative language teaching, gamification). Ask me which method I prefer for young learners and why.'
  },
  {
    id: 'daily-routines',
    title: '⏰ Daily Routines',
    description: 'Chia sẻ về thói quen sinh hoạt và quản lý thời gian biểu.',
    prompt: 'Let\'s talk about our daily routines. Start by sharing what your typical morning looks like as an AI, and then ask me to describe mine.'
  },
  {
    id: 'hobbies-interests',
    title: '🎨 Hobbies and Interests',
    description: 'Trò chuyện về sở thích, âm nhạc, phim ảnh hay thể thao.',
    prompt: 'Let\'s talk about hobbies and interests. Ask me what I love doing in my free time and discuss how hobbies help people de-stress.'
  },
  {
    id: 'food-drinks',
    title: '🍲 Food and Drinks',
    description: 'Đề tài ẩm thực, gọi món ăn tại nhà hàng hoặc nấu nướng.',
    prompt: 'Let\'s talk about food and drinks. Act as a culinary enthusiast. Ask me about my favorite traditional dish, its ingredients, or discuss cooking habits.'
  },
  {
    id: 'health-exercise',
    title: '💪 Health and Exercise',
    description: 'Thảo luận về lối sống lành mạnh, chế độ ăn uống và tập luyện.',
    prompt: 'Let\'s converse about fitness, exercise, and maintaining a healthy lifestyle. Start by asking me what active habits I practice weekly.'
  },
  {
    id: 'travel-holidays',
    title: '✈️ Travel and Holidays',
    description: 'Kế hoạch đi du lịch, trải nghiệm những vùng đất mới lạ.',
    prompt: 'Let\'s talk about travel and holidays. Share a beautiful destination you know, then ask me about my dream vacation spot or latest trip.'
  }
];

export const getSystemInstruction = (rate: 'slow' | 'normal' | 'fast') => {
  const speedInstruction = 
    rate === 'slow' ? 'Speak VERY slowly and clearly, articulating every single syllable carefully. Keep your responses extremely short (1 or 2 simple, short sentences max) and use very clear, simple vocabulary. Never lecture or give long monologues so that the learner can easily catch up and reply.' :
    rate === 'fast' ? 'Speak at a brisk, natural native speed with common contractions. Keep your responses engaging and concise.' :
    'Speak at a moderate, clear pace suitable for an intermediate learner. Keep your responses concise (no more than 2-3 short, clear sentences) and do not lecture or talk too much, allowing plenty of room for the student to practice.';

  return `You are a professional, friendly, and patient English language tutor named 'Aria'. 
Your primary goal is to help the user improve their spoken English.

Core Guidelines:
1. ${speedInstruction}
2. Keep the conversation engaging by asking exactly ONE short, simple, or relevant open-ended question at the end of your response.
3. If the user makes a significant grammar mistake, gently correct them briefly and encourage them.
4. Suggest more natural-sounding synonyms for common words used by the user.
5. The conversation is in English only.

Pronunciation Feedback:
As you listen to the user's audio, pay close attention to their pronunciation, word stress, and intonation. 
If you notice specific words that were mispronounced or areas where their flow could be improved, provide short, actionable feedback at the end of your response.
CRITICAL: Use the exact format [PRONUNCIATION: <feedback text>] for these tips. 
Example: "That's great! [PRONUNCIATION: Try to pronounce the 'th' in 'thought' more clearly by placing your tongue between your teeth.]"`;
};
