declare module 'speakeasy' {
  export interface GenerateSecretOptions {
    name?: string;
    length?: number;
  }

  export interface GenerateSecretResult {
    base32: string;
    otpauth_url?: string;
  }

  export interface VerifyOptions {
    secret: string;
    encoding: string;
    token: string;
    window?: number;
  }

  export interface OtpauthURLOptions {
    secret: string;
    label: string;
    issuer: string;
    encoding: string;
  }

  export function generateSecret(options?: GenerateSecretOptions): GenerateSecretResult;
  export function otpauthURL(options: OtpauthURLOptions): string;
  export namespace totp {
    function verify(options: VerifyOptions): boolean;
  }
}

