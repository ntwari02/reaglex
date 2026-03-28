import { Request, Response, NextFunction } from 'express';
import { uploadAnyBufferToCloudinary } from '../utils/uploadToCloudinary';

/**
 * After multer.memoryStorage(), uploads each file buffer to Cloudinary and sets file.path to the secure URL.
 */
export function cloudinaryUploadBuffers(folder: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const files = req.files as Express.Multer.File[] | undefined;
      if (files && Array.isArray(files)) {
        for (const f of files) {
          if (f.buffer) {
            (f as Express.Multer.File & { path?: string }).path = await uploadAnyBufferToCloudinary(
              f.buffer,
              folder,
            );
          }
        }
      }
      const one = (req as Request & { file?: Express.Multer.File }).file;
      if (one?.buffer) {
        (one as Express.Multer.File & { path?: string }).path = await uploadAnyBufferToCloudinary(
          one.buffer,
          folder,
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
