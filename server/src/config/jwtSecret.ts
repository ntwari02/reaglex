/** Central JWT secret — never use dev default in production. */
export function getJwtSecret(): string {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (process.env.NODE_ENV === 'production') {
    if (!secret || secret === 'dev_secret') {
      throw new Error(
        'JWT_SECRET must be set to a strong random value in production (not dev_secret).',
      );
    }
    return secret;
  }
  return secret || 'dev_secret';
}

export function assertJwtSecretForProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    getJwtSecret();
  }
}
