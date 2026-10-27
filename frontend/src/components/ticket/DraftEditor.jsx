import { useState } from 'react';
import { api } from '../../api/endpoints';
import Button from '../ui/Button';
import { Card, CardHeader } from '../ui/Card';
import { InlineAlert } from '../ui/StateViews';

export default function DraftEditor({ ticketId, value, onChange, onSent }) {
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null); // { tone, text }

  const generate = async () => {
    if (value.trim() && !window.confirm('Replace the current text with a new AI draft?')) return;
    setGenerating(true); setMsg(null);
    try { onChange((await api.tickets.draft(ticketId)).draft); }
    catch (e) {
      setMsg({ tone: 'medium', text: [0, 429, 502, 503].includes(e.status) ? 'The AI draft service is unavailable right now. You can write the reply yourself and send it as usual.' : e.message });
    } finally { setGenerating(false); }
  };
  const send = async () => {
    setSending(true); setMsg(null);
    try { await api.tickets.reply(ticketId, value.trim()); onChange(''); setMsg({ tone: 'success', text: 'Reply sent to the author.' }); onSent(); }
    catch (e) { setMsg({ tone: 'critical', text: e.details?.body || e.message }); }
    finally { setSending(false); }
  };

  return (
    <Card>
      <CardHeader title="Reply to author" action={<Button variant="secondary" onClick={generate} loading={generating}>{value ? 'Regenerate draft' : 'Generate draft'}</Button>} />
      <div className="space-y-3 p-4 sm:p-6">
        {msg && <InlineAlert tone={msg.tone}>{msg.text}</InlineAlert>}
        <textarea className="textarea min-h-[200px]" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Write a reply, or generate an AI draft and edit it before sending." aria-label="Reply to author" />
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted">AI drafts are suggestions. Check amounts and dates before sending.</p>
          <Button onClick={send} loading={sending} disabled={!value.trim()}>Send reply</Button>
        </div>
      </div>
    </Card>
  );
}
