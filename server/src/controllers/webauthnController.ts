import { Request, Response } from 'express';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type { PublicKeyCredentialCreationOptionsJSON, PublicKeyCredentialRequestOptionsJSON } from '@simplewebauthn/server';
import { User } from '../models/User';
import { WebauthnCredential } from '../models/WebauthnCredential';
import { generateAuthToken } from '../utils/generateToken';
import { AuthenticatedRequest } from '../middleware/auth';
import { getClientUrl } from '../config/publicEnv';

const rpName = process.env.WEBAUTHN_RP_NAME || 'Reaglex';
const rpID = process.env.WEBAUTHN_RP_ID || 'localhost';
const origin = (process.env.WEBAUTHN_ORIGIN || '').trim() || getClientUrl();

// In-memory challenge store (use Redis in production for multi-instance). TTL 5 min.
const registrationChallenges = new Map<string, { options: PublicKeyCredentialCreationOptionsJSON; userId: string }>();
const authenticationChallenges = new Map<string, boolean>();

function cleanupChallenges(): void {
  // Keep maps small; in production use Redis with TTL
  if (registrationChallenges.size > 1000) registrationChallenges.clear();
  if (authenticationChallenges.size > 1000) authenticationChallenges.clear();
}

/**
 * POST /api/auth/webauthn/register/options
 * Authenticated user adds a passkey. Returns registration options.
 */
export async function webauthnRegisterOptions(req: AuthenticatedRequest, res: Response) {
  try {
    cleanupChallenges();
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const existing = await WebauthnCredential.find({ userId }).lean();
    const excludeCredentials = existing.map((c) => ({
      id: c.credentialID,
      transports: c.transports,
    }));

    const options = await generateRegistrationOptions({
      rpName,
      rpID: rpID === 'localhost' ? 'localhost' : rpID,
      userName: user.email,
      userID: new Uint8Array(Buffer.from(userId, 'utf8')) as any,
      userDisplayName: user.fullName,
      attestationType: 'none',
      excludeCredentials: excludeCredentials.length > 0 ? excludeCredentials : undefined,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
        authenticatorAttachment: 'platform',
      },
      supportedAlgorithmIDs: [-7, -257], // ES256, RS256; avoid Ed25519 for compatibility
    });

    registrationChallenges.set(userId, { options, userId });
    setTimeout(() => registrationChallenges.delete(userId), 5 * 60 * 1000);

    return res.json(options);
  } catch (err: any) {
    console.error('WebAuthn register options error:', err);
    return res.status(500).json({ message: 'Failed to generate registration options' });
  }
}

/**
 * POST /api/auth/webauthn/register/verify
 * Verifies registration response and stores the credential.
 */
export async function webauthnRegisterVerify(req: AuthenticatedRequest, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const stored = registrationChallenges.get(userId);
    if (!stored) {
      return res.status(400).json({ message: 'Registration session expired. Please try again.' });
    }

    const verification = await verifyRegistrationResponse({
      response: req.body,
      expectedChallenge: stored.options.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });

    registrationChallenges.delete(userId);

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ message: 'Verification failed' });
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    await WebauthnCredential.create({
      userId,
      credentialID: credential.id,
      credentialPublicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports,
    });

    return res.json({ verified: true, message: 'Passkey added successfully' });
  } catch (err: any) {
    console.error('WebAuthn register verify error:', err);
    return res.status(400).json({ message: err.message || 'Verification failed' });
  }
}

/**
 * POST /api/auth/webauthn/login/options
 * Returns authentication options. No email required when using discoverable credentials.
 */
export async function webauthnLoginOptions(_req: Request, res: Response) {
  try {
    cleanupChallenges();

    const options = await generateAuthenticationOptions({
      rpID: rpID === 'localhost' ? 'localhost' : rpID,
      allowCredentials: [], // discoverable credentials (passkeys)
      userVerification: 'preferred',
    });

    authenticationChallenges.set(options.challenge, true);
    setTimeout(() => authenticationChallenges.delete(options.challenge), 5 * 60 * 1000);

    return res.json(options);
  } catch (err: any) {
    console.error('WebAuthn login options error:', err);
    return res.status(500).json({ message: 'Failed to generate authentication options' });
  }
}

/**
 * POST /api/auth/webauthn/login/verify
 * Verifies assertion and returns JWT (and user) to log the user in.
 */
export async function webauthnLoginVerify(req: Request, res: Response) {
  try {
    const response = req.body;
    const credentialId = response?.id ?? response?.rawId;
    if (!credentialId) {
      return res.status(400).json({ message: 'Invalid response' });
    }

    const cred = await WebauthnCredential.findOne({ credentialID: credentialId }).lean();
    if (!cred) {
      return res.status(401).json({ message: 'Credential not found' });
    }

    let expectedChallenge: string | undefined;
    const cData = response?.response?.clientDataJSON;
    if (typeof cData === 'string') {
      try {
        const base64 = cData.replace(/-/g, '+').replace(/_/g, '/');
        const pad = base64.length % 4 ? '='.repeat(4 - (base64.length % 4)) : '';
        const decoded = JSON.parse(Buffer.from(base64 + pad, 'base64').toString('utf8'));
        expectedChallenge = decoded.challenge;
      } catch {
        // ignore
      }
    }
    if (!expectedChallenge || !authenticationChallenges.has(expectedChallenge)) {
      return res.status(400).json({ message: 'Invalid or expired challenge' });
    }

    const publicKey = cred.credentialPublicKey instanceof Buffer
      ? new Uint8Array(cred.credentialPublicKey)
      : new Uint8Array((cred.credentialPublicKey as any)?.buffer ?? cred.credentialPublicKey);

    const verification = await verifyAuthenticationResponse({
      response: req.body,
      expectedChallenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credentialID,
        publicKey,
        counter: cred.counter,
        transports: cred.transports,
      },
    });

    authenticationChallenges.delete(expectedChallenge);

    if (!verification.verified) {
      return res.status(401).json({ message: 'Authentication failed' });
    }

    const { newCounter } = verification.authenticationInfo;
    await WebauthnCredential.updateOne(
      { credentialID: credentialId },
      { $set: { counter: newCounter } }
    );

    const user = await User.findById(cred.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    if (user.accountStatus === 'inactive' || user.accountStatus === 'banned') {
      return res.status(403).json({
        message: 'Your account has been deactivated. Please contact support.',
      });
    }
    if (!user.emailVerified) {
      return res.status(403).json({
        message: 'Please verify your email before signing in. Check your inbox for the verification link.',
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
      });
    }

    const token = generateAuthToken(user);

    res
      .cookie('token', token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      })
      .json({
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          sellerVerificationStatus: user.sellerVerificationStatus,
          isSellerVerified: user.isSellerVerified,
          avatarUrl: user.avatarUrl,
        },
        token,
      });
  } catch (err: any) {
    console.error('WebAuthn login verify error:', err);
    return res.status(400).json({ message: err.message || 'Authentication failed' });
  }
}
