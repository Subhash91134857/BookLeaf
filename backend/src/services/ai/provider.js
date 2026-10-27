
const config = require('../../config');
const logger = require('../../utils/logger');

class AiError extends Error {
    constructor(message, code, { retryable = false, status } = {}) {
        super(message);
        this.name = 'AiError';
        this.code = code;
        this.retryable = retryable;
        this.status = status;
    }
}

const BREAKER = {
    failures: 0,
    openUntil: 0,
    threshold: 3,
    coolDownMs: 60_000,
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isConfigured = () => Boolean(config.ai.apiKey);

const isAvailable = () =>
    isConfigured() && Date.now() >= BREAKER.openUntil;



async function callOnce({ system, user, maxTokens, temperature }) {
    const ctrl = new AbortController();
    const timer = setTimeout(
        () => ctrl.abort(),
        config.ai.timeoutMs
    );

    try {
        const baseUrl = config.ai.baseUrl.replace(/\/+$/, '');
        const url = `${baseUrl}/chat/completions`;

        const res = await fetch(url, {
            method: 'POST',
            signal: ctrl.signal,
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${config.ai.apiKey}`,
            },
            body: JSON.stringify({
                model: config.ai.model,
                max_tokens: maxTokens,
                temperature,
                messages: [
                    { role: 'system', content: system },
                    { role: 'user', content: user },
                ],
            }),
        });

        // Check HTTP errors before parsing a success response.
        if (!res.ok) {
            const errorBody = await res.text();
            const retryable =
                res.status === 429 || res.status >= 500;

            logger.error('AI provider request failed', {
                status: res.status,
                body: errorBody.slice(0, 1000),
                model: config.ai.model,
            });

            throw new AiError(
                `AI provider returned ${res.status}`,
                res.status === 429
                    ? 'AI_RATE_LIMITED'
                    : 'AI_PROVIDER_ERROR',
                { retryable, status: res.status }
            );
        }

        const json = await res.json();
        const choice = json.choices?.[0];
        const content = choice?.message?.content;

        const text = typeof content === 'string'
            ? content.trim()
            : Array.isArray(content)
                ? content
                    .filter((part) => part.type === 'text')
                    .map((part) => part.text || '')
                    .join('')
                    .trim()
                : '';

        if (!text) {
            logger.warn('AI provider returned no text content', {
                model: json.model || config.ai.model,
                finishReason: choice?.finish_reason,
                usage: json.usage
                    ? {
                        promptTokens: json.usage.prompt_tokens,
                        completionTokens: json.usage.completion_tokens,
                    }
                    : undefined,
                choiceCount: json.choices?.length || 0,
            });

            throw new AiError(
                'AI returned an empty response',
                'AI_EMPTY_RESPONSE',
                {
                    retryable: choice?.finish_reason === 'length',
                }
            );
        }

        logger.info('AI provider response processed', {
            status: res.status,
            model: json.model || config.ai.model,
            finishReason: choice?.finish_reason,
        });

        return text;
    } catch (err) {
        if (err instanceof AiError) {
            throw err;
        }

        const timedOut = err.name === 'AbortError';

        logger.warn('AI network request failed', {
            errorName: err.name,
            errorCode: err.cause?.code || err.code,
            message: err.message,
            timedOut,
        });

        throw new AiError(
            timedOut
                ? 'AI request timed out'
                : `AI network error: ${err.message}`,
            timedOut ? 'AI_TIMEOUT' : 'AI_NETWORK_ERROR',
            { retryable: true }
        );
    } finally {
        clearTimeout(timer);
    }
}



async function complete({
    system,
    user,
    maxTokens = 6700,
    temperature = 0,
}) {
    if (!isConfigured()) {
        throw new AiError(
            'AI is not configured',
            'AI_NOT_CONFIGURED'
        );
    }

    if (!isAvailable()) {
        throw new AiError(
            'AI temporarily disabled after repeated failures',
            'AI_CIRCUIT_OPEN'
        );
    }

    let lastErr;

    for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
            const text = await callOnce({
                system,
                user,
                maxTokens: maxTokens * (attempt === 0 ? 1 : 2), // double max tokens on retry
                temperature,
            });

            BREAKER.failures = 0;
            return text;
        } catch (err) {
            lastErr = err;
            if (!err.retryable) break;
            if (attempt < 1) {
                await sleep(config.ai.retryBaseMs * (attempt + 1));
            }
        }
    }
    BREAKER.failures += 1;
    if (BREAKER.failures >= BREAKER.threshold) {
        BREAKER.openUntil =
            Date.now() + BREAKER.coolDownMs;
        BREAKER.failures = 0;
        logger.warn('AI circuit breaker opened for 60s');
    }
    throw lastErr;
}
const resetBreaker = () => {
    BREAKER.failures = 0;
    BREAKER.openUntil = 0;
};
module.exports = {
    complete,
    isConfigured,
    isAvailable,
    resetBreaker,
    AiError,
};
