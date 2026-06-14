import jwt from 'jsonwebtoken';

export const RAILWAY_JWT_ISSUER = 'crypto-survivors-api';
export const RAILWAY_JWT_AUDIENCE = 'crypto-survivors-client';

export type RailwayAccountType = 'anonymous' | 'registered' | 'service';

export type RailwayAccessTokenPayload = jwt.JwtPayload & {
  sub: string;
  account_id: string;
  account_type: RailwayAccountType;
  role: 'player' | 'service';
  token_use: 'access';
};

export function getRailwayJwtSecret(): string | undefined {
  return process.env.API_JWT_SECRET ?? process.env.RAILWAY_JWT_SECRET ?? process.env.JWT_SECRET;
}

export function isRailwayJwtConfigured(): boolean {
  return Boolean(getRailwayJwtSecret());
}

export function getRailwayJwtExpiresInSeconds(): number {
  const configured = Number(process.env.API_JWT_EXPIRES_SECONDS);
  if (Number.isInteger(configured) && configured > 0) {
    return configured;
  }
  return 60 * 60 * 24 * 30;
}

export function signRailwayAccessToken(params: {
  accountId: string;
  accountType: RailwayAccountType;
}): { accessToken: string; expiresIn: number } {
  const secret = getRailwayJwtSecret();
  if (!secret) {
    throw new Error('API_JWT_SECRET, RAILWAY_JWT_SECRET, or JWT_SECRET is required');
  }

  const expiresIn = getRailwayJwtExpiresInSeconds();
  const accessToken = jwt.sign(
    {
      sub: params.accountId,
      account_id: params.accountId,
      account_type: params.accountType,
      role: params.accountType === 'service' ? 'service' : 'player',
      token_use: 'access',
    },
    secret,
    {
      algorithm: 'HS256',
      issuer: RAILWAY_JWT_ISSUER,
      audience: RAILWAY_JWT_AUDIENCE,
      expiresIn,
    }
  );

  return { accessToken, expiresIn };
}

export function verifyRailwayAccessToken(token: string): RailwayAccessTokenPayload {
  const secret = getRailwayJwtSecret();
  if (!secret) {
    throw new Error('Railway JWT secret is not configured');
  }

  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: RAILWAY_JWT_ISSUER,
    audience: RAILWAY_JWT_AUDIENCE,
  });

  if (typeof decoded === 'string') {
    throw new jwt.JsonWebTokenError('Invalid token payload');
  }

  if (
    typeof decoded.sub !== 'string' ||
    typeof decoded.account_id !== 'string' ||
    decoded.token_use !== 'access'
  ) {
    throw new jwt.JsonWebTokenError('Invalid Railway token claims');
  }

  return decoded as RailwayAccessTokenPayload;
}
