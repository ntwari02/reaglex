const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function resolveFolder(req) {
  const routePath = `${req.baseUrl || ''}${req.path || ''}`.toLowerCase();
  if (routePath.includes('profile')) return 'reaglex/avatars';
  if (routePath.includes('inventory') || routePath.includes('/products')) return 'reaglex/products';
  if (routePath.includes('settings') || routePath.includes('/store/')) return 'reaglex/shops';
  if (routePath.includes('blog')) return 'reaglex/blog';
  if (routePath.includes('collections')) return 'reaglex/collections';
  if (routePath.includes('banner')) return 'reaglex/banners';
  return 'reaglex/general';
}

// Storage engine — uploads directly to Cloudinary
// Images NEVER touch the local disk at all
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const folder = resolveFolder(req);

    return {
      folder,
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      transformation: [
        {
          width: 1200,
          height: 1200,
          crop: 'limit', // never upscale, only shrink if needed
          quality: 'auto', // Cloudinary chooses optimal quality
          fetch_format: 'auto', // serves WebP to browsers that support it
        },
      ],
      // Generate a unique public_id so files never overwrite each other
      public_id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
});

// File type validation — reject non-image files before upload
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, WebP, and GIF allowed.'), false);
  }
};

const limits10mb = { fileSize: 10 * 1024 * 1024 };
const limits5mb = { fileSize: 5 * 1024 * 1024 };

const m10 = multer({
  storage,
  fileFilter,
  limits: limits10mb,
});
const m5 = multer({
  storage,
  fileFilter,
  limits: limits5mb,
});

// Single image upload middleware
const uploadSingle = m10.single('image');

// Multiple images upload middleware (up to 10 images)
const uploadMultiple = m10.array('images', 10);

// Product inventory upload (field name "images", max 5)
const uploadProductImages = m10.array('images', 5);

const uploadAvatar = m10.single('avatar');
const uploadLogo = m10.single('logo');
const uploadBanner = m10.single('banner');

const uploadCollectionFields = m5.fields([
  { name: 'cover_image', maxCount: 1 },
  { name: 'thumbnail_image', maxCount: 1 },
]);

const uploadBlogThumbnail = m5.single('thumbnail');

// Helper to delete an image from Cloudinary by its public_id
// Call this whenever a product or user is deleted
const deleteImage = async (imageUrl) => {
  try {
    if (!imageUrl || !String(imageUrl).includes('cloudinary')) return;

    const url = String(imageUrl);
    let resourceType = 'image';
    if (url.includes('/video/upload')) resourceType = 'video';
    else if (url.includes('/raw/upload')) resourceType = 'raw';

    // Extract public_id from the Cloudinary URL
    const urlParts = url.split('/');
    const uploadIndex = urlParts.indexOf('upload');
    if (uploadIndex === -1) return;

    const publicIdWithExt = urlParts.slice(uploadIndex + 2).join('/');
    const publicId = publicIdWithExt.replace(/\.[^/.]+$/, '');

    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    console.log(`[Cloudinary] Deleted (${resourceType}): ${publicId}`);
  } catch (err) {
    console.error('[Cloudinary] Failed to delete image:', err.message);
    // Do not throw — a failed delete should not crash the request
  }
};

module.exports = {
  cloudinary,
  uploadSingle,
  uploadMultiple,
  uploadProductImages,
  uploadAvatar,
  uploadLogo,
  uploadBanner,
  uploadCollectionFields,
  uploadBlogThumbnail,
  deleteImage,
};
