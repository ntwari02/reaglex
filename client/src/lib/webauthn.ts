/**
 * WebAuthn (passkey / biometric) helpers using the native browser API.
 * Converts server JSON options to/from the format required by navigator.credentials.
 */

import { API_BASE_URL } from './config';
const API_BASE = API_BASE_URL;

function base64urlToBuffer(base64url: string): ArrayBuffer {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  const padded = pad ? base64 + '='.repeat(4 - pad) : base64;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function isWebAuthnSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential !== 'undefined';
}

export interface WebAuthnLoginResult {
  success: boolean;
  error?: string;
}

/**
 * Run the WebAuthn authentication flow: get options from server, prompt user for biometric, verify with server, return result.
 * On success, the server returns { user, token }; the caller should store the token and set user in auth store.
 */
export async function loginWithWebAuthn(): Promise<{
  success: boolean;
  error?: string;
  user?: any;
  token?: string;
}> {
  if (!isWebAuthnSupported()) {
    return { success: false, error: 'Biometric sign-in is not supported in this browser.' };
  }

  try {
    const optionsRes = await fetch(`${API_BASE}/auth/webauthn/login/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({}),
    });
    if (!optionsRes.ok) {
      const data = await optionsRes.json().catch(() => ({}));
      return { success: false, error: data.message || 'Failed to get sign-in options' };
    }
    const options = await optionsRes.json();

    const challenge = base64urlToBuffer(options.challenge);
    const allowCredentials = (options.allowCredentials || []).map((c: { id: string; transports?: string[] }) => ({
      id: base64urlToBuffer(c.id),
      type: 'public-key' as const,
      transports: c.transports,
    }));

    const credential = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        userVerification: options.userVerification || 'preferred',
        timeout: options.timeout || 60000,
      },
    });

    if (!credential || !(credential instanceof PublicKeyCredential)) {
      return { success: false, error: 'Sign-in was cancelled or failed.' };
    }

    const response = credential.response as AuthenticatorAssertionResponse;
    const payload = {
      id: credential.id,
      rawId: bufferToBase64url(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64url(response.clientDataJSON),
        authenticatorData: bufferToBase64url(response.authenticatorData),
        signature: bufferToBase64url(response.signature),
        userHandle: response.userHandle ? bufferToBase64url(response.userHandle) : null,
      },
    };

    const verifyRes = await fetch(`${API_BASE}/auth/webauthn/login/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });

    const data = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok) {
      return { success: false, error: data.message || 'Verification failed' };
    }

    return {
      success: true,
      user: data.user,
      token: data.token,
    };
  } catch (err: any) {
    const message = err.message || (err.name === 'NotAllowedError' ? 'Sign-in was cancelled.' : 'Biometric sign-in failed.');
    return { success: false, error: message };
  }
}
