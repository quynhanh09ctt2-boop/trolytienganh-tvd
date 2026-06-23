
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  translation?: string;
  timestamp: number;
}

export enum SessionStatus {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR'
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  prompt: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  definition: string;
  definitionTranslation?: string;
  example: string;
  exampleTranslation?: string;
  translation: string;
  learnedAt: number;
}

export interface PronunciationChallenge {
  id: string;
  text: string;
  category: 'Vowels' | 'Consonants' | 'Stress' | 'Fluency';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tips: string;
  translation?: string;
}

export type AppView = 'practice' | 'vocabulary' | 'pronunciation';
