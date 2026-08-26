import fs from 'fs';
import path from 'path';
import { ENV } from '../../config/env';

export interface StorageResult {
  fileKey: string;
  url: string;
  sizeBytes: number;
}

export class StorageService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = ENV.UPLOADS_DIR;
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  public async saveFile(fileBuffer: Buffer, originalFilename: string, mimeType: string): Promise<StorageResult> {
    const ext = path.extname(originalFilename) || '.mp3';
    const filename = `recording_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
    const filePath = path.join(this.uploadsDir, filename);

    await fs.promises.writeFile(filePath, fileBuffer);

    return {
      fileKey: filename,
      url: `/uploads/${filename}`,
      sizeBytes: fileBuffer.length
    };
  }

  public getFilePath(fileKey: string): string {
    return path.join(this.uploadsDir, fileKey);
  }
}

export const storageService = new StorageService();
