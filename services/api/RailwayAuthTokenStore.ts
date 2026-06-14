const STORAGE_KEY = 'crypto-survivors-railway-auth';

export type RailwayStoredAuth = {
  accessToken: string;
  tokenType: 'Bearer';
  expiresAt: number;
  account: {
    id: string;
    type: 'anonymous' | 'registered' | 'service';
  };
  profile: {
    id: string;
    displayName: string;
  };
};

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function parseStoredAuth(raw: string | null): RailwayStoredAuth | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<RailwayStoredAuth>;
    if (
      typeof parsed.accessToken !== 'string' ||
      parsed.tokenType !== 'Bearer' ||
      typeof parsed.expiresAt !== 'number' ||
      typeof parsed.account?.id !== 'string' ||
      typeof parsed.profile?.id !== 'string' ||
      typeof parsed.profile.displayName !== 'string'
    ) {
      return null;
    }

    return parsed as RailwayStoredAuth;
  } catch {
    return null;
  }
}

export const RailwayAuthTokenStore = {
  save(auth: RailwayStoredAuth): void {
    const storage = getStorage();
    if (!storage) return;
    storage.setItem(STORAGE_KEY, JSON.stringify(auth));
  },

  get(): RailwayStoredAuth | null {
    const storage = getStorage();
    if (!storage) return null;

    const stored = parseStoredAuth(storage.getItem(STORAGE_KEY));
    if (!stored) return null;

    if (stored.expiresAt <= Date.now()) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }

    return stored;
  },

  getAccessToken(): string | null {
    return this.get()?.accessToken ?? null;
  },

  clear(): void {
    getStorage()?.removeItem(STORAGE_KEY);
  },
};
