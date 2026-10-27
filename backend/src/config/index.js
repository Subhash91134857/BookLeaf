const { gEnv, normalizePort } = require('../utils/env');

const config = {
    env: gEnv('NODE_ENV', 'development'),
    port: normalizePort(gEnv('PORT', 8080)),
    corsOrigin: gEnv('CORS_ORIGIN', '*'),
    autoSetup: gEnv('AUTO_SETUP', 'false') === 'true',
    jwt: { secret: gEnv('JWT_SECRET'), expiresIn: gEnv('JWT_EXPIRES_IN', '8h') },
    ai: {
        apiKey: gEnv('OPENROUTER_API_KEY', gEnv('ANTHROPIC_API_KEY')),
        model: gEnv('AI_MODEL', 'openrouter/free'),
        baseUrl: gEnv('AI_BASE_URL', 'https://openrouter.ai/api/v1'),
        timeoutMs: Number(gEnv('AI_TIMEOUT_MS', 15000)),
        retryBaseMs: Number(gEnv('AI_RETRY_BASE_MS', 500)),
        pregenerateDraft: gEnv('AI_PREGENERATE_DRAFT', 'true') === 'true',
    },
};

if (!config.jwt.secret || config.jwt.secret.length < 16) {
    throw new Error('JWT_SECRET is required (min 16 chars). Copy .env.example to .env and set it.');
}
module.exports = config;