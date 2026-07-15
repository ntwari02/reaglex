import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'spacilly_device_id';

let cached: string | null = null;

/** Call once during app bootstrap before any auth call that sends deviceId. */
export async function hydrateDeviceId(): Promise<string> {
  if (cached) return cached;
  let id = await AsyncStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = `rn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
    await AsyncStorage.setItem(STORAGE_KEY, id);
  }
  cached = id;
  return id;
}

/** Same API as web `lib/deviceId.ts` — must run after `hydrateDeviceId`. */
export function getDeviceId(): string {
  if (!cached) {
    throw new Error('[deviceId] hydrateDeviceId() must complete before getDeviceId()');
  }
  return cached;
}
