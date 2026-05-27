export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  file: File;
}

export interface ConversionConfig {
  targetFormat: string;
  quality?: number; // for images (0-100)
  width?: number; // resize width
  height?: number; // resize height
  csvDelimiter?: string;
  base64Mode?: 'encode' | 'decode';
}

export interface ConversionResult {
  id: string;
  fileName: string;
  originalSize: number;
  convertedSize: number;
  originalFormat: string;
  targetFormat: string;
  downloadUrl: string;
  timestamp: Date;
  status: 'pending' | 'converting' | 'success' | 'failed';
  error?: string;
}

export interface CaptchaQuestion {
  id: string;
  keyword: string; // e.g. "traffic light", "yaya geçidi", "yangın musluğu"
  instruction: string; // "Yaya geçidi içeren tüm resimleri seçin"
  images: {
    id: number;
    url: string;
    isCorrect: boolean;
  }[];
}
