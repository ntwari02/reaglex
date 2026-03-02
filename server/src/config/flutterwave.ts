import Flutterwave from 'flutterwave-node-v3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const publicKey = process.env.FLW_PUBLIC_KEY;
const secretKey = process.env.FLW_SECRET_KEY;

const createConfigError = () =>
  new Error(
    'Flutterwave is not configured. Set FLW_PUBLIC_KEY and FLW_SECRET_KEY in server/.env'
  );

const flw = publicKey && secretKey
  ? new Flutterwave(publicKey, secretKey)
  : (new Proxy(
      {},
      {
        get() {
          throw createConfigError();
        },
      }
    ) as any);

if ((!publicKey || !secretKey) && process.env.NODE_ENV !== 'test') {
  // eslint-disable-next-line no-console
  console.warn(
    '[Flutterwave] Missing FLW_PUBLIC_KEY/FLW_SECRET_KEY. Payment routes will error until env is set.'
  );
}

export default flw;

