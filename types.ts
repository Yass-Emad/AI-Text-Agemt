
export enum ExtractionMethod {
  DIRECT = 'Direct Text Extraction',
  AI_OCR = 'AI-Powered OCR',
  HYBRID = 'Hybrid Logic (Direct + OCR)'
}

export enum FileStatus {
  IDLE = 'idle',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error'
}

export interface ExtractedFile {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  status: FileStatus;
  method: ExtractionMethod;
  error?: string;
  progress: number;
}
