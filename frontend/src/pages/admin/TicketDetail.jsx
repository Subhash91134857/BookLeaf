import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import { Card, CardHeader } from '../../components/ui/Card';
import { Async } from '../../components/ui/StateViews';
import { PriorityBadge, StatusBadge } from '../../components/ui/Badge';
import Timeline from '../../components/ticket/Timeline';
import DraftEditor from '../../components/ticket/DraftEditor';
import InternalNotes from '../../components/ticket/InternalNotes';
import TicketControls from '../../components/ticket/TicketControls';
import { dateTime } from '../../lib/format';
import { POLL_MS } from '../../lib/constants';

export default function TicketDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const state = useApi(() => api.tickets.get(id), [id], POLL_MS.detail);

  const seeded = useRef(false);
  useEffect(() => { seeded.current = false; setDraft(''); }, [id]);
  useEffect(() => {
    if (state.data && !seeded.current) { seeded.current = true; setDraft(state.data.aiDraft || ''); }
  }, [state.data]);

  return (
    <>
      <Link to="/admin/tickets" className="mb-4 inline-block text-sm font-medium text-teal">← Back to queue</Link>
      <Async state={state}>
        {(t) => (
          <div className="space-y-6">
            <Card>
              <div className="border-b border-line p-4 sm:p-6">
                <div className="flex flex-wrap items-center gap-2"><PriorityBadge value={t.priority} /><StatusBadge value={t.status} /></div>
                <h1 className="mt-2 text-2xl font-semibold">{t.subject}</h1>
                <p className="mt-1 text-muted">{t.author?.name} ({t.author?.email}) · {t.book?.title || 'General / Account level'} · {dateTime(t.createdAt)}</p>
              </div>
              <div className="p-4 sm:p-6"><TicketControls ticket={t} me={user} onChanged={state.reload} /></div>
            </Card>
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <Card><CardHeader title="Conversation" /><div className="bg-canvas p-4 sm:p-6"><Timeline ticket={t} viewer="admin" /></div></Card>
                <DraftEditor ticketId={t.id} value={draft} onChange={setDraft} onSent={state.reload} />
              </div>
              <InternalNotes ticketId={t.id} notes={t.notes} onAdded={state.reload} />
            </div>
          </div>
        )}
      </Async>
    </>
  );
}
