import { http, HttpResponse } from 'msw';

export const handlers = [
  // Supabase Auth Mock
  http.post('*/auth/v1/token', () => {
    return HttpResponse.json({
      access_token: 'fake-token',
      user: { id: 'test-user-id', email: 'test@example.com' },
    });
  }),

  // Players Table - Select (Check existing)
  http.get('*/rest/v1/players', ({ request }) => {
    const url = new URL(request.url);
    const displayName = url.searchParams.get('display_name');

    if (displayName?.includes('existing_user')) {
      return HttpResponse.json({ id: 'existing-uuid', display_name: 'existing_user' });
    }

    // Return 406 or empty for .single() when not found
    return new HttpResponse(null, { status: 406 });
  }),

  // Players Table - Insert (Register)
  http.post('*/rest/v1/players', async ({ request }) => {
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
