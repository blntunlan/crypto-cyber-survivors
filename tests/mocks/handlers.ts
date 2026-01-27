import { http, HttpResponse } from 'msw';

export const handlers = [
  // Supabase Auth Mock
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'fake-token',
      user: { id: 'test-user-id', email: 'test@example.com' },
    });
  }),

  // Profiles Table - Select (Check existing)
  http.get('*/rest/v1/profiles', ({ request }) => {
    const url = new URL(request.url);
    const displayName = url.searchParams.get('display_name');

    if (displayName?.includes('existing_user')) {
      return HttpResponse.json({ id: 'existing-uuid', display_name: 'existing_user' });
    }

    // Return null for 406
    return new HttpResponse(null, { status: 406 });
  }),

  // Profiles Table - Insert (Register)
  http.post('*/rest/v1/profiles', async ({ request }) => {
    const body = (await request.json()) as any;
    return HttpResponse.json({
      id: 'new-uuid',
      display_name: body.display_name,
    });
  }),

  // RPC - Update Last Seen
  http.post('*/rest/v1/rpc/update_player_last_seen', () => {
    return HttpResponse.json({ success: true });
  }),

  // Market Data (Price) Mock
  http.get('*/api/v1/price', () => {
    return HttpResponse.json({ symbol: 'BTCUSDT', price: '50000.00' });
  }),

  // Verification Function Mock
  http.post('*/functions/v1/verify-game', () => {
    return HttpResponse.json({ verified: true, reward: 100, verifiedPnL: 5.0 });
  }),

  http.post('*/functions/v1/verify-replay', () => {
    return HttpResponse.json({ verified: true, reward: 100 });
  }),

  // Locales Mock
  http.get('*/locales/:lang/common.json', ({ params }) => {
    const { lang } = params;
    if (lang === 'tr') {
      return HttpResponse.json({ common: { loading_engine: 'MOTOR YÜKLENİYOR...' } });
    }
    return HttpResponse.json({ common: { loading_engine: 'LOADING ENGINE...' } });
  }),
];
