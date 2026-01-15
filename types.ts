export interface ExifData {
  make?: string;
  model?: string;
  dateTimeOriginal?: string;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  latitude?: number;
  longitude?: number;
  software?: string;
  width?: number;
  height?: number;
}

export interface AIAnalysisResult {
  objects: string[];
  peopleCount: number;
  sceneType: string;
  imageCategory: 'Selfie' | 'Document' | 'Screenshot' | 'Photo' | 'Other';
  dominantColors: string[];
  faceEmotion: 'Happy' | 'Neutral' | 'Sad' | 'Angry' | 'Surprised' | 'None';
  isSafe: boolean;
  authenticity: {
    isLikelyEdited: boolean;
    reason: string;
    score: number; // 0-100
  };
  ocrText: string;
}

export interface ProcessedImage {
  id: string;
  file: File;
  previewUrl: string;
  exif: ExifData | null;
  aiAnalysis: AIAnalysisResult | null;
  isProcessing: boolean;
  error?: string;
}

export enum TabView {
  OVERVIEW = 'OVERVIEW',
  EXIF = 'EXIF',
  AI_ANALYSIS = 'AI_ANALYSIS',
  OCR = 'OCR',
  PRIVACY = 'PRIVACY'
}
