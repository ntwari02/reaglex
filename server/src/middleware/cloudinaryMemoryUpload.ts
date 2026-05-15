import { Request, Response, NextFunction } from 'express';
import { uploadAnyBufferToCloudinary } from '../utils/uploadToCloudinary';

async function uploadMulterFile(file: Express.Multer.File, folder: string): Promise<void> {
  if (!file.buffer?.length) return;
  (file as Express.Multer.File & { path?: string }).path = await uploadAnyBufferToCloudinary(
    file.buffer,
    folder,
  );
}

/** Collect files from multer `.single()`, `.array()`, or `.fields()`. */
function collectMulterFiles(req: Request): Express.Multer.File[] {
  const out: Express.Multer.File[] = [];
  const one = (req as Request & { file?: Express.Multer.File }).file;
  if (one) out.push(one);

  const files = req.files;
  if (!files) return out;

  if (Array.isArray(files)) {
    out.push(...files);
    return out;
  }

  for (const list of Object.values(files as Record<string, Express.Multer.File[]>)) {
    if (Array.isArray(list)) out.push(...list);
  }
  return out;
}

/**
 * After multer.memoryStorage(), uploads each file buffer to Cloudinary and sets file.path to the secure URL.
 */
export function cloudinaryUploadBuffers(folder: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files = collectMulterFiles(req);
      for (const f of files) {
        await uploadMulterFile(f, folder);
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
