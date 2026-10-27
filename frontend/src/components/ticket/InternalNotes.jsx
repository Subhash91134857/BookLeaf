import { useState } from 'react';
import { api } from '../../api/endpoints';
import Button from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { InlineAlert } from '../ui/StateViews';
import { dateTime } from '../../lib/format';

export default function InternalNotes({ ticketId, notes = [], onAdded }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const add = async () => {
    setBusy(true); setError('');
    try { await api.tickets.addNote(ticketId, text.trim()); setText(''); onAdded(); }
    catch (e) { setError(e.message); } finally { setBusy(false); }
  };
  return (
    <Card className="border-medium-fg/20 bg-medium-bg/40">
      <CardHeader title="Internal notes" action={<span className="text-xs font-medium text-medium-fg">🔒 Not visible to author</span>} />
      <div className="space-y-3 p-4 sm:p-6">
        {notes.length === 0 && <p className="text-muted">No notes yet.</p>}
        {notes.map((n) => (
          <div key={n.id} className="rounded-lg border border-medium-fg/10 bg-surface/60 p-3">
            <p className="whitespace-pre-wrap">{n.body}</p>
            <p className="mt-1 text-xs text-muted">{n.adminName} · {dateTime(n.createdAt)}</p>
          </div>
        ))}
        {error && <InlineAlert tone="critical">{error}</InlineAlert>}
        <textarea className="textarea min-h-[80px]" value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a private note for the team…" aria-label="Internal note" />
        <Button variant="secondary" onClick={add} loading={busy} disabled={!text.trim()}>Add note</Button>
      </div>
    </Card>
  );
}
