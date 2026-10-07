import { getApp } from '@react-native-firebase/app';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';

// Must match setGlobalOptions({ region }) in functions/index.js.
const REGION = 'asia-south1';

// Errors raised by the network or platform rather than by our functions, which always send a
// readable sentence. Their raw messages ("NOT_FOUND", "INTERNAL") are not for employees.
const PLATFORM_ERRORS: Record<string, string> = {
  'not-found': 'This service is not available right now. Please try again later.',
  unavailable: 'Could not reach the server. Check your internet connection and try again.',
  'deadline-exceeded': 'The server took too long to respond. Please try again.',
  internal: 'Something went wrong on the server. Please try again.',
};

/** Error from a callable: readable message, plus the server's code and optional details. */
export class FunctionError extends Error {
  constructor(message: string, readonly code: string, readonly details?: any) {
    super(message);
  }
}

/** Calls a callable Cloud Function and returns its data; errors are FunctionErrors. */
export async function callFunction<T = void>(name: string, data: object = {}): Promise<T> {
  try {
    const result = await httpsCallable(getFunctions(getApp(), REGION), name)(data);
    return result.data as T;
  } catch (e: any) {
    const code = String(e?.code ?? '').replace(/^functions\//, '');
    const message: string = e?.message ?? '';
    const isRawCode = !message || /^[A-Z_]+$/.test(message) || message.toLowerCase() === code;
    if (PLATFORM_ERRORS[code] && isRawCode) throw new FunctionError(PLATFORM_ERRORS[code], code);
    throw new FunctionError(message || 'Something went wrong. Please try again.', code, e?.details);
  }
}
