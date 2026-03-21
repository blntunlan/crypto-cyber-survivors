const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// This is what Supabase provides - a base64-encoded secret
const supabaseSecret = 'klEUArZzDWZMJHPKGFxIujxwnUmkYjo1w41trmrCvu2f4KFAsscRD6mymZLt+HPM+WMZxyEZdrnLI+bvuidimQ==';

console.log('=== SCENARIO 1: Passing as raw string (current code) ===');
console.log('Secret:', supabaseSecret);
console.log('Type:', typeof supabaseSecret);

// Simulate what happens in verify.js lines 120-130
console.log('\nIn verify.js, lines 120-130:');
console.log('secretOrPublicKey != null:', supabaseSecret != null);
console.log('!(secretOrPublicKey instanceof KeyObject):', !(supabaseSecret instanceof crypto.KeyObject));

try {
  // Step 1: Try createPublicKey (line 122)
  console.log('\nStep 1: Attempting createPublicKey...');
  const pub = crypto.createPublicKey(supabaseSecret);
  console.log('  Result: Successfully created public key (unexpected!)');
} catch (e1) {
  console.log('  Result: Failed (expected) -', e1.message.slice(0, 60));
  
  try {
    // Step 2: Try createSecretKey (line 125)
    console.log('\nStep 2: Attempting createSecretKey...');
    // jsonwebtoken does: Buffer.from(string)
    const buf = Buffer.from(supabaseSecret);
    const key = crypto.createSecretKey(buf);
    console.log('  Result: Successfully created secret key');
    console.log('  Key type:', key.type);
    console.log('  Key size:', key.symmetricKeySize, 'bytes');
    console.log('  Buffer length:', buf.length);
  } catch (e2) {
    console.log('  Result: Failed -', e2.message);
  }
}

console.log('\n\n=== SCENARIO 2: What if we base64-decoded it first? ===');
const decodedSecret = Buffer.from(supabaseSecret, 'base64');
console.log('Decoded buffer length:', decodedSecret.length);

try {
  const key = crypto.createSecretKey(decodedSecret);
  console.log('createSecretKey success');
  console.log('  Key type:', key.type);
  console.log('  Key size:', key.symmetricKeySize, 'bytes');
} catch (e) {
  console.log('createSecretKey failed:', e.message);
}

console.log('\n\n=== SCENARIO 3: Testing actual JWT verification ===');

// Create a test token with the properly decoded secret
const testSecret = Buffer.from(supabaseSecret, 'base64');
const payload = { sub: 'user-123', iat: Math.floor(Date.now() / 1000) };

console.log('\nCreating token with base64-decoded secret...');
const token = jwt.sign(payload, testSecret, { algorithm: 'HS256' });
console.log('Token:', token.slice(0, 50) + '...');

console.log('\nVerifying with RAW STRING (current code):');
try {
  const decoded = jwt.verify(token, supabaseSecret, { algorithms: ['HS256'] });
  console.log('  SUCCESS - Decoded:', decoded);
} catch (e) {
  console.log('  FAILED -', e.message);
}

console.log('\nVerifying with BASE64-DECODED BUFFER:');
try {
  const decoded = jwt.verify(token, testSecret, { algorithms: ['HS256'] });
  console.log('  SUCCESS - Decoded:', decoded);
} catch (e) {
  console.log('  FAILED -', e.message);
}

console.log('\n\n=== SCENARIO 4: Token created with raw string ===');
console.log('\nCreating token with RAW STRING secret...');
const token2 = jwt.sign(payload, supabaseSecret, { algorithm: 'HS256' });
console.log('Token:', token2.slice(0, 50) + '...');

console.log('\nVerifying with RAW STRING:');
try {
  const decoded = jwt.verify(token2, supabaseSecret, { algorithms: ['HS256'] });
  console.log('  SUCCESS - Decoded:', decoded);
} catch (e) {
  console.log('  FAILED -', e.message);
}

console.log('\nVerifying with BASE64-DECODED BUFFER:');
try {
  const decoded = jwt.verify(token2, testSecret, { algorithms: ['HS256'] });
  console.log('  SUCCESS - Decoded:', decoded);
} catch (e) {
  console.log('  FAILED -', e.message);
}
