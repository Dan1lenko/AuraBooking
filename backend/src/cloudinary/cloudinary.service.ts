import { Injectable, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);
  private isConfigured = false;

  constructor() {
    if (
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      this.isConfigured = true;
    } else {
      this.logger.warn(
        'Cloudinary credentials not set. Uploads will fallback to local storage under backend/uploads/.',
      );
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (this.isConfigured) {
      return new Promise((resolve, reject) => {
        cloudinary.uploader
          .upload_stream({ folder: 'booking-platform' }, (error, result) => {
            if (error) return reject(error);
            resolve(result!.secure_url);
          })
          .end(file.buffer);
      });
    } else {
      // Fallback: Save local file
      const uploadsFolder = path.join(__dirname, '..', '..', 'uploads');
      const fileName = `${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;
      const filePath = path.join(uploadsFolder, fileName);

      fs.writeFileSync(filePath, file.buffer);
      this.logger.log(`File saved locally: ${filePath}`);

      // Return server static url link
      return `http://localhost:3000/uploads/${fileName}`;
    }
  }
}
