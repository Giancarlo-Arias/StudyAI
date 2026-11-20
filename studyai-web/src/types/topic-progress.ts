export interface TopicProgress {
  document_id: string;
  filename: string;
  topic: string;
  questions_evaluated: number;
  correct_questions: number;
  incorrect_questions: number;
  accuracy_percent: number;
  status: "insufficient_data" | "reinforce" | "review" | "strong";
}

export interface TopicProgressResponse {
  topics: TopicProgress[];
}