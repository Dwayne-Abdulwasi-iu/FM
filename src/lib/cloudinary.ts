import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface UploadResult {
  public_id: string;
  secure_url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  file: Buffer,
  options: {
    folder?: string;
    transformation?: any;
  } = {}
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'fashion-marketplace',
        resource_type: 'auto',
        transformation: options.transformation,
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as UploadResult);
        }
      }
    ).end(file);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export function generateThumbnailUrl(publicId: string): string {
  return cloudinary.url(publicId, {
    width: 300,
    height: 300,
    crop: 'fit',
    quality: 'auto',
    format: 'auto',
  });
}

export default cloudinary;