import { PRIORITY, STATUS, TONE } from '../../lib/constants';

export function Badge({ cls, icon, children }) {
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </span>
  );
}
export const StatusBadge = ({ value }) => {
  const m = STATUS[value] || STATUS.closed;
  return <Badge cls={m.cls} icon={m.icon}>{m.label}</Badge>;
};
export const PriorityBadge = ({ value }) => {
  const m = PRIORITY[value] || PRIORITY.low;
  return <Badge cls={m.cls} icon={m.icon}>{m.label}</Badge>;
};
export const ToneBadge = ({ tone = 'neutral', icon, children }) => <Badge cls={TONE[tone]} icon={icon}>{children}</Badge>;
