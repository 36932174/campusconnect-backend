import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';

const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/markdown',
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  'video/mp4', 'video/webm',
];

const BLOCKED_EXTENSIONS = [
  '.exe', '.bat', '.cmd', '.com', '.msi', '.scr', '.pif',
  '.sh', '.bash', '.vbs', '.ps1', '.js', '.jar', '.apk',
  '.dll', '.sys', '.bin', '.wsf',
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);
  private readonly uploadDir: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    fs.mkdir(this.uploadDir, { recursive: true }).catch(() => {});
  }

  async validateFile(file: Express.Multer.File): Promise<void> {
    if (!file) throw new BadRequestException('No file provided');

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(`File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    if (BLOCKED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('This file type is not allowed');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(`MIME type ${file.mimetype} is not allowed`);
    }

    if (!this.validateFileSignature(file)) {
      throw new BadRequestException('File signature verification failed');
    }
  }

  private validateFileSignature(file: Express.Multer.File): boolean {
    const buffer = file.buffer;
    const signatures: Record<string, Uint8Array[]> = {
      'image/jpeg': [new Uint8Array([0xFF, 0xD8, 0xFF])],
      'image/png': [new Uint8Array([0x89, 0x50, 0x4E, 0x47])],
      'image/gif': [new Uint8Array([0x47, 0x49, 0x46, 0x38])],
      'image/webp': [new Uint8Array([0x52, 0x49, 0x46, 0x46])],
      'application/pdf': [new Uint8Array([0x25, 0x50, 0x44, 0x46])],
    };

    const allowedSignatures = signatures[file.mimetype];
    if (!allowedSignatures) return true;

    const header = buffer.slice(0, 8);
    return allowedSignatures.some((sig) =>
      sig.every((byte, i) => byte === header[i]),
    );
  }

  async uploadFile(file: Express.Multer.File, directory: string = 'general'): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
    await this.validateFile(file);

    const ext = path.extname(file.originalname);
    const sanitizedFilename = crypto.randomBytes(16).toString('hex') + ext;
    const dirPath = path.join(this.uploadDir, directory);

    await fs.mkdir(dirPath, { recursive: true });
    const filePath = path.join(dirPath, sanitizedFilename);
    await fs.writeFile(filePath, file.buffer);

    const url = `/uploads/${directory}/${sanitizedFilename}`;

    this.logger.log(`File uploaded: ${url} (${file.size} bytes)`);

    return {
      url,
      filename: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async deleteFile(url: string): Promise<void> {
    const filePath = path.join(process.cwd(), url);
    try {
      await fs.unlink(filePath);
      this.logger.log(`File deleted: ${url}`);
    } catch (error) {
      this.logger.warn(`File not found for deletion: ${url}`);
    }
  }
}
