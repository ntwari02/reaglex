import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import FormData from 'form-data';
import axios from 'axios';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', 'env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const key = process.env.MICROBLINK_LICENSE_KEY?.trim();
const secret = process.env.MICROBLINK_SECRET?.trim();
const rawRegion = (process.env.MICROBLINK_REGION ?? 'eu').trim().toLowerCase();
let host = 'eu';
if (rawRegion.includes('us')) host = 'us-east';
else if (rawRegion.includes('ca')) host = 'ca';

const url = `https://${host}.verify.microblink.com/api/v2/docver`;
const auth = `Basic ${Buffer.from(`${key}:${secret}`).toString('base64')}`;

console.log('host:', host);
console.log('key length:', key?.length ?? 0);
console.log('secret length:', secret?.length ?? 0);
console.log('secret contains space:', /\s/.test(secret ?? ''));
console.log('secret ends with ==:', secret?.endsWith('=='));

const jpeg = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=',
  'base64',
);

const form = new FormData();
form.append('imageFront', jpeg, { filename: 'test.jpg', contentType: 'image/jpeg' });

try {
  const { status, data } = await axios.post(url, form, {
    headers: { ...form.getHeaders(), Authorization: auth },
    maxBodyLength: Infinity,
    validateStatus: () => true,
    timeout: 30000,
  });
  console.log('HTTP status:', status);
  console.log('Response:', JSON.stringify(data, null, 2).slice(0, 800));
} catch (err) {
  console.error('Request failed:', err.message);
  if (err.response) {
    console.error('Status:', err.response.status);
    console.error('Body:', JSON.stringify(err.response.data).slice(0, 500));
  }
  process.exit(1);
}
