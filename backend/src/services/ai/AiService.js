
const provider = require('./provider');
const fallbackClassify = require('./fallbackClassifier');
const { CLASSIFY_SYSTEM, classifyUser, DRAFT_SYSTEM, draftUser } = require('./prompts');
const { CATEGORIES, PRIORITIES } = require('../../utils/constants');
const logger = require('../../utils/logger');

const parseClassification = (text) => {
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
        throw new Error('AI response does not contain JSON');
    }

    const json = JSON.parse(match[0]);

    if (
        !CATEGORIES.includes(json.category) ||
        !PRIORITIES.includes(json.priority)
    ) {
        throw new Error('Classification out of range');
    }

    return {
        category: json.category,
        priority: json.priority,
    };
};

// Never throws: on any AI failure we fall back to rules so the ticket is still routed.
async function classifyTicket(input) {
    try {
        const text = await provider.complete({ system: CLASSIFY_SYSTEM, user: classifyUser(input), maxTokens: 6560, temperature: 0 });
        return { ...parseClassification(text), source: 'ai' };
    } catch (err) {
        logger.warn(`AI classification failed (${err.code || err.message}); using rule-based fallback`);
        return fallbackClassify(input);
    }
}

// Throws AiError when AI is unavailable; the caller turns that into a 503 for the admin UI.
async function draftReply(ctx) {
    const text = await provider.complete({ system: DRAFT_SYSTEM, user: draftUser({ ...ctx, today: ctx.today || new Date() }), maxTokens: 6700, temperature: 0.3 });
    return text.replace(/^```[a-z]*\n?|```$/g, '').trim();
}

module.exports = { classifyTicket, draftReply, isAvailable: provider.isAvailable };
