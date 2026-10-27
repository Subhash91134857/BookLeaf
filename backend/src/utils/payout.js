// BookLeaf pays royalties quarterly, within 45 days of the quarter end. These are *facts*
// computed in code and handed to the model, so it never has to do date arithmetic.
const QUARTER_ENDS = [[2, 31], [5, 30], [8, 30], [11, 31]]; // [monthIndex, day]
const DAY = 864e5;
const fmt = (d) => d.toISOString().slice(0, 10);

function payoutWindow(now = new Date()) {
    const y = now.getUTCFullYear();
    const ends = [];
    for (const yr of [y - 1, y, y + 1]) for (const [m, d] of QUARTER_ENDS) ends.push(new Date(Date.UTC(yr, m, d)));
    const last = ends.filter((e) => e <= now).pop();
    const next = ends.find((e) => e > now);
    const due = (e) => new Date(e.getTime() + 45 * DAY);
    return {
        lastQuarterEnd: fmt(last), lastQuarterPayoutBy: fmt(due(last)), lastQuarterPayoutWindowPassed: now > due(last),
        nextQuarterEnd: fmt(next), nextQuarterPayoutBy: fmt(due(next)),
    };
}
const monthsSince = (dateStr, now = new Date()) => (dateStr ? Math.floor((now - new Date(dateStr)) / (30.44 * DAY)) : null);

module.exports = { payoutWindow, monthsSince };
