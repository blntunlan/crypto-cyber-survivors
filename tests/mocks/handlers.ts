import { http, HttpResponse } from 'msw';

export const handlers = [
  // Railway Anonymous Sign-In Mock
  http.post('*/api/v1/auth/anonymous', async ({ request }) => {
    const body = (await request.json()) as any;
    const displayName = body.display_name ?? 'Player';
    const profileId = displayName === 'existing_user' ? 'existing-uuid' : 'new-uuid';

    return HttpResponse.json(
      {
        accessToken: 'fake-railway-token',
        tokenType: 'Bearer',
        expiresIn: 2_592_000,
        account: {
          id: profileId,
          type: 'anonymous',
        },
        profile: {
          id: profileId,
          displayName,
        },
        wallet: {
          id: 'wallet-id',
          balance: 0,
          currency: 'gold',
        },
      },
      { status: 201 }
    );
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

  // Verification endpoint mock
  http.post('*/api/v1/sessions/verify', () => {
    return HttpResponse.json({ verified: true, reward: 100, verifiedPnL: 5.0 });
  }),

  http.post('*/api/v1/replays/verify', () => {
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
