import { http, HttpResponse } from 'msw';

const SUPABASE_URL = 'https://nymgxiyrpaqcdlxqmhhd.supabase.co';

// Mock user data
const mockUser = {
  id: 'test-user-uuid-1234',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'test@example.com',
  email_confirmed_at: '2026-01-01T00:00:00Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00Z',
  last_sign_in_at: '2026-04-01T00:00:00Z',
  app_metadata: { provider: 'anonymous', providers: ['anonymous'] },
  user_metadata: { nickname: 'TestPlayer' },
  identities: [],
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-04-01T00:00:00Z',
  is_anonymous: true,
};

const mockSession = {
  access_token: 'mock-access-token-jwt',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'mock-refresh-token',
  user: mockUser,
};

export const supabaseHandlers = [
  // Anonymous sign-in
  http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    return HttpResponse.json(mockSession);
  }),

  // Token refresh
  http.post(`${SUPABASE_URL}/auth/v1/token`, ({ request }) => {
    const url = new URL(request.url);
    const grantType = url.searchParams.get('grant_type');

    if (grantType === 'refresh_token') {
      return HttpResponse.json({
        ...mockSession,
        access_token: 'mock-refreshed-access-token',
      });
    }

    return HttpResponse.json(mockSession);
  }),

  // Get user
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(mockUser);
  }),

  // Sign out
  http.post(`${SUPABASE_URL}/auth/v1/logout`, () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // JWKS endpoint
  http.get(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`, () => {
    return HttpResponse.json({
      keys: [
        {
          kty: 'EC',
          crv: 'P-256',
          kid: 'test-key-id',
          x: 'test-x-coordinate',
          y: 'test-y-coordinate',
          use: 'sig',
          alg: 'ES256',
        },
      ],
    });
  }),

  // OAuth authorize (returns redirect URL)
  http.get(`${SUPABASE_URL}/auth/v1/authorize`, ({ request }) => {
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');
    const redirectTo = url.searchParams.get('redirect_to') ?? 'http://localhost:3000';
    return HttpResponse.json({
      url: `https://${provider}.com/oauth/authorize?redirect_uri=${encodeURIComponent(redirectTo)}`,
    });
  }),

  // Update user
  http.put(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json(mockUser);
  }),
];

// Error variants for testing error paths
export const supabaseErrorHandlers = {
  invalidCredentials: http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    return HttpResponse.json(
      {
        error: 'Invalid login credentials',
        error_description: 'Invalid login credentials',
      },
      { status: 400 }
    );
  }),

  emailNotConfirmed: http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    return HttpResponse.json(
      { error: 'Email not confirmed', error_description: 'Email not confirmed' },
      { status: 400 }
    );
  }),

  rateLimited: http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    return HttpResponse.json(
      {
        error: 'Email rate limit exceeded',
        error_description: 'Email rate limit exceeded',
      },
      { status: 429 }
    );
  }),

  networkError: http.post(`${SUPABASE_URL}/auth/v1/signup`, () => {
    return HttpResponse.error();
  }),
};

export { mockUser, mockSession };
