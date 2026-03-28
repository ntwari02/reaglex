import streamifier from 'streamifier';
import { cloudinary, isCloudinaryConfigured } from '../services/cloudinary';

export async function uploadBufferToCloudinary(args: {
  buffer: Buffer;
  folder: string;
  publicId?: string;
  resourceType?: 'image' | 'auto';
}): Promise<{ url: string; publicId: string }> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.');
  }

  const { buffer, folder, publicId, resourceType = 'image' } = args;

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: resourceType,
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

/** Upload any buffer to Cloudinary (images, video, audio, raw). Used for inbox, disputes, tickets. */
export async function uploadAnyBufferToCloudinary(buffer: Buffer, folder: string): Promise<string> {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET.');
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: 'auto' },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Cloudinary upload failed'));
        resolve(result.secure_url);
      },
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
}

