import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Converts raw thrown errors (including JSON-wrapped FirestoreErrorInfo and Firebase Auth/Firestore codes)
 * into clean, user-friendly UI toast messages without leaking raw JSON payloads.
 */
export function getFriendlyErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!err) return fallback;

  let rawMsg = '';
  let code = '';

  if (typeof err === 'string') {
    rawMsg = err;
  } else if (err instanceof Error) {
    rawMsg = err.message;
    code = (err as { code?: string }).code || '';
  } else if (typeof err === 'object' && err !== null) {
    const obj = err as Record<string, unknown>;
    rawMsg = typeof obj.message === 'string' ? obj.message : '';
    code = typeof obj.code === 'string' ? obj.code : '';
  }

  // Unwrap JSON-serialized FirestoreErrorInfo thrown by handleFirestoreError
  if (rawMsg.trim().startsWith('{') && rawMsg.includes('"operationType"')) {
    try {
      const parsed = JSON.parse(rawMsg) as Partial<FirestoreErrorInfo>;
      if (parsed.error) {
        rawMsg = parsed.error;
      }
    } catch {
      // Keep original string if JSON parse fails
    }
  }

  const lower = `${code} ${rawMsg}`.toLowerCase();

  if (lower.includes('permission-denied') || lower.includes('missing or insufficient permissions')) {
    return 'Permission denied: Your account does not have permission for this action.';
  }
  if (lower.includes('unauthenticated')) {
    return 'Session expired. Please sign in again.';
  }
  if (lower.includes('unavailable') || lower.includes('the client is offline') || lower.includes('network-request-failed')) {
    return 'Network connection interrupted. Please check your internet and try again.';
  }
  if (lower.includes('deadline-exceeded') || lower.includes('timeout')) {
    return 'The request timed out. Please try again.';
  }
  if (lower.includes('resource-exhausted') || lower.includes('quota')) {
    return 'Database quota temporarily reached. Please wait a moment and try again.';
  }
  if (lower.includes('not-found')) {
    return 'The requested record could not be found. It may have been removed.';
  }
  if (lower.includes('auth/popup-closed-by-user')) {
    return 'Sign-in popup was closed before completing.';
  }
  if (lower.includes('auth/too-many-requests')) {
    return 'Too many attempts. Please wait a few minutes before trying again.';
  }
  if (lower.includes('auth/weak-password')) {
    return 'Password is too weak. Please choose at least 6 characters.';
  }
  if (lower.includes('auth/invalid-email')) {
    return 'Please enter a valid email address.';
  }
  if (lower.includes('auth/email-already-in-use')) {
    return 'An account with this email already exists.';
  }
  if (lower.includes('auth/user-not-found')) {
    return 'No account found with this email or username.';
  }

  return rawMsg.trim() || fallback;
}

const DATA_URI_BASE64_REGEX = /^data:[^;]+;base64,/i;

/**
 * Recursively strips `undefined` properties (which Firestore rejects) and guards against
 * accidental oversized inline base64 data URIs (>1KB) to keep Firestore documents lightweight
 * on the Spark 1GB free tier without enforcing restrictive artificial document size caps.
 */
export function sanitizeFirestorePayload<T>(value: T): T {
  if (typeof value === 'string') {
    if (DATA_URI_BASE64_REGEX.test(value.trim()) && value.length > 1024) {
      return '' as unknown as T;
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeFirestorePayload(item))
      .filter((item) => item !== undefined) as unknown as T;
  }
  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (v !== undefined) {
        cleaned[k] = sanitizeFirestorePayload(v);
      }
    }
    return cleaned as T;
  }
  return value;
}

