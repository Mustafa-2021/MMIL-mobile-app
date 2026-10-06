import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

// Must match setGlobalOptions({ region }) in functions/index.js.
const REGION = 'asia-south1';

/** Calls a callable Cloud Function and returns its data; errors carry the server's message. */
export async function callFunction<T = void>(name: string, data: object = {}): Promise<T> {
  try {
    const result = await httpsCallable(getFunctions(getApp(), REGION), name)(data);
    return result.data as T;
  } catch (e: any) {
    throw new Error(e?.message || 'Something went wrong. Please try again.');
  }
}
