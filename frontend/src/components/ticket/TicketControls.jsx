import { useState } from 'react';
import { api } from '../../api/endpoints';
import Button from '../ui/Button';
import { InlineAlert } from '../ui/StateViews';
import { CATEGORIES, PRIORITY, STATUS } from '../../lib/constants';

const source = (s) => (s === 'ai' ? 'Set by AI' : s === 'admin' ? 'Changed by admin' : 'Default');

export default function TicketControls({ ticket, me, onChanged }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const patch = async (changes) => {
    setBusy(true); setError('');
    try { await api.tickets.update(ticket.id, changes); onChanged(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  const Select = ({ label, field, options, hint }) => (
    <label className="label">{label}
      <select className="input mt-1 text-ink" disabled={busy} value={ticket[field]} onChange={(e) => patch({ [field]: e.target.value })}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      {hint && <span className="mt-1 block text-xs font-normal">{hint}</span>}
    </label>
  );
  const mine = ticket.assignee?.id === me.id;

  return (
    <div className="space-y-3">
      {error && <InlineAlert tone="critical">{error}</InlineAlert>}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Select label="Status" field="status" options={Object.entries(STATUS).map(([k, v]) => [k, v.label])} />
        <Select label="Category" field="category" options={CATEGORIES.map((c) => [c, c])} hint={source(ticket.categorySource)} />
        <Select label="Priority" field="priority" options={Object.entries(PRIORITY).map(([k, v]) => [k, v.label])} hint={source(ticket.prioritySource)} />
        <div>
          <span className="label">Assignee</span>
          <div className="flex h-10 items-center justify-between gap-2">
            <span className="truncate">{ticket.assignee?.name || 'Unassigned'}</span>
            <Button variant="ghost" className="h-8 px-2" disabled={busy} onClick={() => patch({ assigneeId: mine ? null : me.id })}>{mine ? 'Unassign' : 'Assign to me'}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
