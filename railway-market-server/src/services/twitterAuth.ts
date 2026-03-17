/**
 * Twitter OAuth Token Exchange Service
 *
 * Handles the server-side token exchange for Twitter OAuth 2.0 PKCE flow.
 * The client_secret must never be exposed to the frontend.
 */

import { Router, type Request, type Response } from 'express';
import { Logger } from '../utils/logger';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

interface TokenRequest {
  code: string;
  code_verifier: string;
  redirect_uri: string;
}

interface TwitterTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface TwitterErrorResponse {
  error: string;
  error_description?: string;
}

/**
 * POST /api/auth/twitter/token
 * Exchange authorization code for access token
 */
router.post('/token', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({
      success: false,
      error: 'Twitter OAuth not configured on server',
    });
    return;
  }

  const { code, code_verifier, redirect_uri } = req.body as TokenRequest;

  if (!code || !code_verifier || !redirect_uri) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameters: code, code_verifier, redirect_uri',
    });
    return;
  }

  try {
    // Create Basic Auth header
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    // Exchange code for tokens
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier,
        redirect_uri,
      }).toString(),
    });

    const data = (await tokenResponse.json()) as TwitterTokenResponse | TwitterErrorResponse;

    if (!tokenResponse.ok) {
      const errorData = data as TwitterErrorResponse;
      Logger.error(`[TwitterAuth] Token exchange failed: ${JSON.stringify(errorData)}`);
      res.status(tokenResponse.status).json({
        success: false,
        error: errorData.error_description || errorData.error || 'Token exchange failed',
      });
      return;
    }

    const tokenData = data as TwitterTokenResponse;
    
    // Return tokens to client (refresh_token should be stored securely)
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      token_type: tokenData.token_type,
    });
  } catch (error) {
    Logger.error('[TwitterAuth] Server error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token exchange',
    });
  }
}));

/**
 * POST /api/auth/twitter/refresh
 * Refresh an expired access token
 */
router.post('/refresh', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({
      success: false,
      error: 'Twitter OAuth not configured on server',
    });
    return;
  }

  const { refresh_token } = req.body as { refresh_token: string };

  if (!refresh_token) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameter: refresh_token',
    });
    return;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
      }).toString(),
    });

    const data = (await tokenResponse.json()) as TwitterTokenResponse | TwitterErrorResponse;

    if (!tokenResponse.ok) {
      const errorData = data as TwitterErrorResponse;
      Logger.error(`[TwitterAuth] Token refresh failed: ${JSON.stringify(errorData)}`);
      res.status(tokenResponse.status).json({
        success: false,
        error: errorData.error_description || errorData.error || 'Token refresh failed',
      });
      return;
    }

    const tokenData = data as TwitterTokenResponse;
    res.json({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
    });
  } catch (error) {
    Logger.error('[TwitterAuth] Refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token refresh',
    });
  }
}));

/**
 * POST /api/auth/twitter/revoke
 * Revoke an access token (for logout/unlink)
 */
router.post('/revoke', asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(500).json({
      success: false,
      error: 'Twitter OAuth not configured on server',
    });
    return;
  }

  const { token } = req.body as { token: string };

  if (!token) {
    res.status(400).json({
      success: false,
      error: 'Missing required parameter: token',
    });
    return;
  }

  try {
    const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const revokeResponse = await fetch('https://api.twitter.com/2/oauth2/revoke', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${credentials}`,
      },
      body: new URLSearchParams({
        token,
        token_type_hint: 'access_token',
      }).toString(),
    });

    if (!revokeResponse.ok) {
      const errorData = (await revokeResponse.json()) as TwitterErrorResponse;
      Logger.error(`[TwitterAuth] Token revocation failed: ${JSON.stringify(errorData)}`);
      res.status(revokeResponse.status).json({
        success: false,
        error: errorData.error_description || errorData.error || 'Token revocation failed',
      });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    Logger.error('[TwitterAuth] Revoke error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during token revocation',
    });
  }
}));

export default router;
