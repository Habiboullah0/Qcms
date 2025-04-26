export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  image?: string;
}

export interface QuizData {
  title: string;
  description: string;
  questions: QuizQuestion[];
  category: string;
}

export interface QuizResult {
  quizId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  incorrectAnswers: number;
  skippedQuestions: number;
  timeTaken: number;
  date: string;
  answeredQuestions: {
    questionId: number;
    userAnswer: number | null;
    isCorrect: boolean;
  }[];
}

export interface UserProgress {
  quizId: string;
  highScore: number;
  completedCount: number;
  lastCompleted: string;
  averageScore: number;
  badges: string[];
}
