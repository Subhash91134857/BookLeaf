// Rule-based classifier used when the LLM is down/unconfigured, so tickets are still routed sensibly.
// Marked source 'default' (not 'ai') so the UI shows it was not model-classified.
const has = (t, ...words) => words.some((w) => t.includes(w));

module.exports = ({ subject, description }) => {
    const t = `${subject} ${description}`.toLowerCase();
    let category = 'General Inquiry';
    if (has(t, 'royalt', 'payout', 'payment', 'paid', 'bank')) category = 'Royalty & Payments';
    else if (has(t, 'isbn', 'metadata')) category = 'ISBN & Metadata Issues';
    else if (has(t, 'print', 'blurry', 'binding', 'misprint', 'reprint', 'quality', 'damaged')) category = 'Printing & Quality';
    else if (has(t, 'amazon', 'flipkart', 'unavailable', 'listing', 'stock', 'not showing')) category = 'Distribution & Availability';
    else if (has(t, 'typesetting', 'cover design', 'proof', 'production', 'when will', 'status')) category = 'Book Status & Production Updates';

    let priority = 'medium';
    if (has(t, "haven't received", 'not received', 'no royalty', 'never received', 'different isbn', 'duplicate isbn', 'wrong isbn', 'legal')) priority = 'critical';
    else if (['ISBN & Metadata Issues', 'Printing & Quality', 'Distribution & Availability'].includes(category)) priority = 'high';
    else if (category === 'General Inquiry') priority = 'low';
    return { category, priority, source: 'default' };
};
