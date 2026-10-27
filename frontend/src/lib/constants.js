export const STATUS = {
  open:        { label: 'Open',        icon: '○', cls: 'bg-info-bg text-info-fg' },
  in_progress: { label: 'In progress', icon: '◐', cls: 'bg-medium-bg text-medium-fg' },
  resolved:    { label: 'Resolved',    icon: '✓', cls: 'bg-success-bg text-success-fg' },
  closed:      { label: 'Closed',      icon: '■', cls: 'bg-neutral-bg text-neutral-fg' },
};
export const PRIORITY = {
  critical: { label: 'Critical', icon: '!', cls: 'bg-critical-bg text-critical-fg' },
  high:     { label: 'High',     icon: '↑', cls: 'bg-high-bg text-high-fg' },
  medium:   { label: 'Medium',   icon: '–', cls: 'bg-medium-bg text-medium-fg' },
  low:      { label: 'Low',      icon: '↓', cls: 'bg-neutral-bg text-neutral-fg' },
};
export const TONE = {
  success: 'bg-success-bg text-success-fg',
  info: 'bg-info-bg text-info-fg',
  critical: 'bg-critical-bg text-critical-fg',
  medium: 'bg-medium-bg text-medium-fg',
  neutral: 'bg-neutral-bg text-neutral-fg',
};
export const CATEGORIES = [
  'Royalty & Payments', 'ISBN & Metadata Issues', 'Printing & Quality',
  'Distribution & Availability', 'Book Status & Production Updates', 'General Inquiry',
];
export const OVERDUE_HOURS = 48;
export const POLL_MS = { detail: 5000, list: 10000 };
