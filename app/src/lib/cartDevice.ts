import AsyncStorage from '@react-native-async-storage/async-storage';

const DEVICE_KEY = 'spacilly_device_id';

function randomId() {
  return `dev_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export async function getCartDeviceId(): Promise<string> {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = randomId();
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export function getCartPlatform(): 'web' | 'mobile' | 'desktop' {
  return 'mobile';
}
