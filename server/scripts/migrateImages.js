/**
 * One-time migration: re-upload local /uploads/* image URLs to Cloudinary.
 *
 * - Remote fetch (Cloudinary pulls URL) only works for PUBLIC https URLs — not localhost.
 * - For http://localhost:... or /uploads/... we read files from this machine:
 *   server/uploads/... (UPLOADS_LOCAL_ROOT override).
 * - If a file is missing locally and the remote URL 404s (e.g. old Render disk), it cannot be recovered.
 *
 * Run: npm run migrate:images
 */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', 'env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const baseUrl = (process.env.SERVER_URL || process.env.CLIENT_URL || '').replace(/\/$/, '');

/** Default: server/uploads (next to scripts/) */
const UPLOADS_ROOT = process.env.UPLOADS_LOCAL_ROOT
  ? path.resolve(process.env.UPLOADS_LOCAL_ROOT)
  : path.join(__dirname, '..', 'uploads');

/**
 * Map DB URL to a path under UPLOADS_ROOT, or null if not a local uploads path.
 * Examples:
 *   /uploads/products/foo.png -> server/uploads/products/foo.png
 *   http://localhost:5000/uploads/products/foo.png -> same
 */
function resolveLocalUploadsPath(img) {
  let pathname = '';
  if (img.startsWith('http://') || img.startsWith('https://')) {
    try {
      const u = new URL(img);
      const host = u.hostname;
      if (host !== 'localhost' && host !== '127.0.0.1') return null;
      pathname = u.pathname;
    } catch {
      return null;
    }
  } else if (img.startsWith('/')) {
    pathname = img;
  } else {
    return null;
  }

  if (!pathname.startsWith('/uploads/')) return null;
  const relative = pathname.replace(/^\/uploads\//, '');
  return path.join(UPLOADS_ROOT, relative);
}

async function uploadOneToCloudinary(img) {
  const localPath = resolveLocalUploadsPath(img);

  if (localPath && fs.existsSync(localPath)) {
    return cloudinary.uploader.upload(localPath, {
      folder: 'reaglex/products',
      resource_type: 'image',
    });
  }

  const fullUrl = img.startsWith('http')
    ? img
    : `${baseUrl}${img.startsWith('/') ? '' : '/'}${img}`;

  if (fullUrl.includes('localhost') || fullUrl.includes('127.0.0.1')) {
    throw new Error(
      `No local file at ${localPath || '(could not map path)'} — Cloudinary cannot fetch localhost. ` +
        `Copy images into ${UPLOADS_ROOT} matching /uploads/... or fix URLs.`,
    );
  }

  return cloudinary.uploader.upload(fullUrl, {
    folder: 'reaglex/products',
    resource_type: 'image',
  });
}

const migrate = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('[Migration] Missing MONGODB_URI or MONGO_URI');
    process.exit(1);
  }

  console.log(`[Migration] Local uploads folder: ${UPLOADS_ROOT} (exists: ${fs.existsSync(UPLOADS_ROOT)})`);

  await mongoose.connect(uri);
  console.log('[Migration] Connected to MongoDB');

  const col = mongoose.connection.db.collection('products');
  const products = await col.find({}).toArray();
  console.log(`[Migration] Scanning ${products.length} products`);

  let updated = 0;
  for (const product of products) {
    const name = product.name || product._id;
    try {
      const images = Array.isArray(product.images) ? product.images : [];
      if (images.length === 0) continue;

      const newImages = [];
      let changed = false;

      for (const img of images) {
        if (!img || typeof img !== 'string') continue;
        if (img.includes('cloudinary')) {
          newImages.push(img);
          continue;
        }

        const result = await uploadOneToCloudinary(img);
        newImages.push(result.secure_url);
        changed = true;
      }

      if (changed) {
        await col.updateOne({ _id: product._id }, { $set: { images: newImages } });
        updated++;
        console.log(`[Migration] Migrated images for: ${name}`);
      }
    } catch (err) {
      console.error(`[Migration] Failed for ${name}:`, err.message);
    }
  }

  console.log(`[Migration] Done. Updated ${updated} product(s).`);
  process.exit(0);
};

migrate().catch((e) => {
  console.error('[Migration] Fatal:', e);
  process.exit(1);
});
