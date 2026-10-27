import { OVERDUE_HOURS } from './constants';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
export const money = (n) => (n == null ? '—' : inr.format(n));
export const num = (n) => (n == null ? '—' : new Intl.NumberFormat('en-IN').format(n));
export const date = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
export const dateTime = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

const hoursSince = (d) => (Date.now() - new Date(d).getTime()) / 36e5;
export const age = (d) => { const h = hoursSince(d); return h < 1 ? '<1h' : h < 48 ? `${Math.floor(h)}h` : `${Math.floor(h / 24)}d`; };
export const isOverdue = (t) => ['open', 'in_progress'].includes(t.status) && hoursSince(t.createdAt) > OVERDUE_HOURS;
