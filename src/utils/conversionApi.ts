import { ConversionConfig, ConversionResult } from '../types';

/**
 * Reads a File as an ArrayBuffer, text, or Data URL.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/**
 * Decodes high-level images and processes conversion via HTML5 Canvas
 */
export async function convertImage(
  file: File,
  config: ConversionConfig
): Promise<{ blob: Blob; url: string }> {
  return new Promise((resolve, reject) => {
    const imageAndBlob = async () => {
      try {
        const dataUrl = await readFileAsDataURL(file);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context could not be acquired'));
            return;
          }

          // Handle resizing
          const width = config.width || img.naturalWidth || img.width;
          const height = config.height || img.naturalHeight || img.height;
          canvas.width = width;
          canvas.height = height;

          // Draw image
          ctx.drawImage(img, 0, 0, width, height);

          // Get target mime type
          let mimeType = 'image/png';
          switch (config.targetFormat.toLowerCase()) {
            case 'jpg':
            case 'jpeg':
              mimeType = 'image/jpeg';
              break;
            case 'webp':
              mimeType = 'image/webp';
              break;
            case 'gif':
              mimeType = 'image/gif';
              break;
            case 'bmp':
              mimeType = 'image/bmp';
              break;
            default:
              mimeType = 'image/png';
          }

          const quality = config.quality !== undefined ? config.quality / 100 : 0.92;

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                resolve({ blob, url });
              } else {
                reject(new Error('Canvas to Blob conversion failed'));
              }
            },
            mimeType,
            quality
          );
        };
        img.onerror = () => {
          reject(new Error('Failed to load image file'));
        };
        img.src = dataUrl;
      } catch (err) {
        reject(err);
      }
    };
    imageAndBlob();
  });
}

/**
 * Converts text-based documents
 */
export async function convertDocument(
  file: File,
  config: ConversionConfig
): Promise<{ blob: Blob; url: string }> {
  const content = await readFileAsText(file);
  const target = config.targetFormat.toLowerCase();
  const source = file.name.split('.').pop()?.toLowerCase() || '';

  let outputText = '';
  let targetMimeType = 'text/plain';

  if (source === 'json' && target === 'csv') {
    // JSON to CSV
    try {
      const data = JSON.parse(content);
      const delimiter = config.csvDelimiter || ',';
      const arr = Array.isArray(data) ? data : [data];
      if (arr.length > 0) {
        const keys = Object.keys(arr[0]);
        const header = keys.join(delimiter);
        const rows = arr.map((row) =>
          keys
            .map((key) => {
              const val = row[key];
              return typeof val === 'object' ? JSON.stringify(val) : String(val);
            })
            .join(delimiter)
        );
        outputText = [header, ...rows].join('\n');
      } else {
        outputText = '';
      }
      targetMimeType = 'text/csv';
    } catch {
      throw new Error('Geçersiz JSON dosyası! CSV\'ye dönüştürülemedi.');
    }
  } else if (source === 'csv' && target === 'json') {
    // CSV to JSON
    try {
      const delimiter = config.csvDelimiter || ',';
      const lines = content.split(/\r?\n/).filter((l) => l.trim() !== '');
      if (lines.length > 1) {
        const headers = lines[0].split(delimiter);
        const result = lines.slice(1).map((line) => {
          const cells = line.split(delimiter);
          const obj: Record<string, string> = {};
          headers.forEach((h, i) => {
            obj[h.trim()] = cells[i] ? cells[i].trim() : '';
          });
          return obj;
        });
        outputText = JSON.stringify(result, null, 2);
      } else {
        outputText = '[]';
      }
      targetMimeType = 'application/json';
    } catch {
      throw new Error('Geçersiz CSV dosyası! JSON\'a dönüştürülemedi.');
    }
  } else if (target === 'base64') {
    // File to Base64
    const dataUrl = await readFileAsDataURL(file);
    const base64Content = dataUrl.split(',')[1] || dataUrl;
    outputText = base64Content;
    targetMimeType = 'text/plain';
  } else if (source === 'json' && target === 'xml') {
    // JSON to XML
    try {
      const parsed = JSON.parse(content);
      const toXml = (obj: any, nodeName: string): string => {
        let xml = '';
        if (typeof obj !== 'object' || obj === null) {
          return `${obj}`;
        }
        for (const prop in obj) {
          if (Object.prototype.hasOwnProperty.call(obj, prop)) {
            if (Array.isArray(obj[prop])) {
              obj[prop].forEach((item: any) => {
                xml += `<${prop}>${toXml(item, prop)}</${prop}>`;
              });
            } else if (typeof obj[prop] === 'object') {
              xml += `<${prop}>${toXml(obj[prop], prop)}</${prop}>`;
            } else {
              xml += `<${prop}>${obj[prop]}</${prop}>`;
            }
          }
        }
        return xml;
      };
      outputText = `<?xml version="1.0" encoding="UTF-8"?>\n<root>${toXml(parsed, 'root')}</root>`;
      targetMimeType = 'application/xml';
    } catch {
      throw new Error('Geçersiz JSON dosyası! XML\'e dönüştürülemedi.');
    }
  } else if (source === 'md' && target === 'html') {
    // Markdown to HTML (Simple custom compilation)
    const lines = content.split('\n');
    const htmlLines = lines.map((line) => {
      let trimmed = line.trim();
      if (trimmed.startsWith('# ')) return `<h1>${trimmed.slice(2)}</h1>`;
      if (trimmed.startsWith('## ')) return `<h2>${trimmed.slice(3)}</h2>`;
      if (trimmed.startsWith('### ')) return `<h3>${trimmed.slice(4)}</h3>`;
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) return `<li>${trimmed.slice(2)}</li>`;
      if (trimmed.length === 0) return '';
      // Support bold and italics
      trimmed = trimmed
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
      return `<p>${trimmed}</p>`;
    });
    outputText = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>Converted MD</title>\n</head>\n<body>\n${htmlLines.join('\n')}\n</body>\n</html>`;
    targetMimeType = 'text/html';
  } else {
    // Default text format fallback or MD to TXT, etc.
    outputText = content;
    targetMimeType = 'text/plain';
  }

  const blob = new Blob([outputText], { type: `${targetMimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  return { blob, url };
}

/**
 * Main Conversion Coordinator
 */
export async function convertFile(
  fileItem: FileItem,
  config: ConversionConfig
): Promise<ConversionResult> {
  const { file, name, size } = fileItem;
  const originalFormat = name.split('.').pop()?.toLowerCase() || '';
  const targetFormat = config.targetFormat.toLowerCase();
  
  // Clean name without extension
  const baseName = name.substring(0, name.lastIndexOf('.')) || name;
  const newFileName = `${baseName}_converted.${targetFormat}`;

  // Check file group
  const isImage = file.type.startsWith('image/');
  
  try {
    let result: { blob: Blob; url: string };
    
    if (isImage) {
      result = await convertImage(file, config);
    } else {
      result = await convertDocument(file, config);
    }

    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      fileName: newFileName,
      originalSize: size,
      convertedSize: result.blob.size,
      originalFormat: originalFormat.toUpperCase(),
      targetFormat: targetFormat.toUpperCase(),
      downloadUrl: result.url,
      timestamp: new Date(),
      status: 'success'
    };
  } catch (error: any) {
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      fileName: newFileName,
      originalSize: size,
      convertedSize: 0,
      originalFormat: originalFormat.toUpperCase(),
      targetFormat: targetFormat.toUpperCase(),
      downloadUrl: '',
      timestamp: new Date(),
      status: 'failed',
      error: error.message || 'Dönüştürme işlemi sırasında bilinmeyen bir hata oluştu.'
    };
  }
}

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  extension: string;
  file: File;
}
