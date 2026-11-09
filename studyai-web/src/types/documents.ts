export interface StudyDocument {
  id: string;
  filename: string;
  size_bytes: number;
  pages_with_text: number;
  text_length: number;
  created_at: string;
}

export interface DocumentsResponse {
  documents: StudyDocument[];
  count: number;
  limit: number;
  offset: number;
}

export interface UploadDocumentResponse {
  message: string;
  document_id: string;
  filename: string;
  size_bytes: number;
  pages_with_text: number;
  text_length: number;
  chunk_count: number;
  embedding_status: "ready" | "pending";
}