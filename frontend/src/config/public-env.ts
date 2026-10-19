const DEFAULT_SESSION_COOKIE_NAME = 'sid';

export class PublicEnv {
  static get apiBaseUrl(): string {
    const value = process.env.NEXT_PUBLIC_API_BASE_URL;
    if (!value) {
      throw new Error('Missing required env var: NEXT_PUBLIC_API_BASE_URL');
    }
    return value;
  }

  static get sessionCookieName(): string {
    return process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ?? DEFAULT_SESSION_COOKIE_NAME;
  }
}
