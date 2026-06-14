// Loads .env if present (Node 24 built-in), else falls back to process.env / defaults.
// No dependency, works whether or not .env exists.
try {
  process.loadEnvFile();
} catch {
  // no .env file — fine, use process.env and defaults
}

export const config = {
  port: Number(process.env.PORT || 3000),
  benefitKes: Number(process.env.HOSPICASH_BENEFIT_KES || 2000),
  at: {
    username: process.env.AT_USERNAME || 'sandbox',
    apiKey: process.env.AT_API_KEY || '',
    shortcode: process.env.AT_SHORTCODE || '',
  },
  daraja: {
    key: process.env.DARAJA_CONSUMER_KEY || '',
    secret: process.env.DARAJA_CONSUMER_SECRET || '',
    shortcode: process.env.DARAJA_SHORTCODE || '',
    initiator: process.env.DARAJA_INITIATOR_NAME || 'testapi',
    securityCredential: process.env.DARAJA_SECURITY_CREDENTIAL || '',
    callbackBase: (process.env.PUBLIC_CALLBACK_BASE || '').replace(/\/+$/, ''),
  },
};
