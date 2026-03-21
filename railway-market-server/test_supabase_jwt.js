const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Supabase's format: base64-encoded secret
const supabaseSecret = 'klEUArZzDWZMJHPKGFxIujxwnUmkYjo1w41trmrCvu2f4KFAsscRD6mymZLt+HPM+WMZxyEZdrnLI+bvuidimQ==';

console.log('=== UNDERSTANDING SUPABASE JWT SECRET FORMAT ===\n');

console.log('Secret string: klEUArZzDWZMJHPKGFxIujxwnUmkYjo1w41trmrCvu2f4KFAsscRD6mymZLt+HPM+WMZxyEZdrnLI+bvuidimQ==');
console.log('Length:', supabaseSecret.length);
console.log('Is base64?:', /^[A-Za-z0-9+/]*={0,2}$/.test(supabaseSecret));
console.log('Ends with ==:', supabaseSecret.endsWith('=='));
console.log('Contains + and /:', supabaseSecret.includes('+') || supabaseSecret.includes('/'));

// Decode it
const decodedBuf = Buffer.from(supabaseSecret, 'base64');
console.log('\nWhen base64-decoded:');
console.log('  Result is', decodedBuf.length, 'bytes (256 bits / 32 bytes if proper HMAC key)');
console.log('  Hex:', decodedBuf.toString('hex').slice(0, 32) + '...');

// Test HMAC creation
console.log('\n=== KEY CREATION PATHS ===\n');

console.log('Path 1: jwt.verify(token, rawString) - Current code');
console.log('  1. jsonwebtoken/verify.js:120-130 tries createPublicKey() -> fails');
console.log('  2. Then tries createSecretKey(Buffer.from(string))');
console.log('  3. This creates a KeyObject of', Buffer.from(supabaseSecret).length, 'bytes');
console.log('  4. Result: MISMATCHED KEY SIZE (88 bytes instead of 64)');

console.log('\nPath 2: jwt.verify(token, Buffer.from(secret, "base64")) - Correct');
console.log('  1. jsonwebtoken/verify.js:120-130 tries createPublicKey() -> fails');
console.log('  2. Then tries createSecretKey(Buffer of', decodedBuf.length, 'bytes)');
console.log('  3. Result: CORRECT KEY SIZE (64 bytes / 256 bits)');

console.log('\n=== HMAC VERIFICATION IN JWA ===\n');

console.log('jwa/index.js:127-135 - createHmacSigner');
console.log('  Code: crypto.createHmac("sha256", secret)');
console.log('  secret parameter receives the KeyObject.buffer or string');
console.log('\njwa/index.js:152-157 - createHmacVerifier');
console.log('  Calls createHmacSigner to compute expected signature');
console.log('  Then compares using timingSafeEqual');

console.log('\n=== THE CRITICAL DIFFERENCE ===\n');

const payload = { sub: 'test', iat: Math.floor(Date.now() / 1000) };

// Token signed with base64-decoded secret (correct)
const correctToken = jwt.sign(payload, decodedBuf, { algorithm: 'HS256' });
console.log('Token (signed with base64-decoded secret):');
console.log('  ', correctToken.slice(0, 80) + '...');

// Try both verification approaches
console.log('\nVerification Test 1 - Raw string (WILL FAIL):');
try {
  jwt.verify(correctToken, supabaseSecret, { algorithms: ['HS256'] });
  console.log('  ✓ PASSED');
} catch (e) {
  console.log('  ✗ FAILED:', e.message);
  console.log('    Reason: HMAC was computed with 64-byte key');
  console.log('    But verify tried to compute HMAC with 88-byte key');
}

console.log('\nVerification Test 2 - Base64-decoded buffer (WILL PASS):');
try {
  jwt.verify(correctToken, decodedBuf, { algorithms: ['HS256'] });
  console.log('  ✓ PASSED - Correct signature match');
} catch (e) {
  console.log('  ✗ FAILED:', e.message);
}

console.log('\n=== SUPABASE BEHAVIOR ===\n');

console.log('Supabase:');
console.log('  1. Stores secret as base64-encoded string in UI/dashboard');
console.log('  2. Uses base64-decoded secret for signing tokens');
console.log('  3. Tokens signed with base64-decoded secret must be verified the same way');

console.log('\nRailway auth.ts:');
console.log('  1. Gets environment variable SUPABASE_JWT_SECRET (raw string)');
console.log('  2. Passes it directly to jwt.verify()');
console.log('  3. jsonwebtoken converts to KeyObject using Buffer.from(string)');
console.log('  4. Result: KEY MISMATCH - verification will always fail');

console.log('\n=== SOLUTION ===\n');
console.log('Option A - Change verify call:');
console.log('  jwt.verify(token, Buffer.from(JWT_SECRET, "base64"), ...)');
console.log('\nOption B - Change env var storage:');
console.log('  Store the actual binary secret, not base64-encoded version');
console.log('\nRecommendation: Option A (minimal change, handles Supabase format)');
