import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Card, PageHeader } from '../../components/ui/Card';
import { Async, EmptyState } from '../../components/ui/StateViews';
import { StatusBadge } from '../../components/ui/Badge';
import Timeline from '../../components/ticket/Timeline';
import { dateTime } from '../../lib/format';
import { POLL_MS } from '../../lib/constants';

export default function MyTickets() {
  const state = useApi(() => api.tickets.list({ include: 'messages', pageSize: 50 }), [], POLL_MS.detail);
  const [openId, setOpenId] = useState(null);

  return (
    <>
      <PageHeader title="My tickets" subtitle="Updates appear here automatically." action={<Link to="/tickets/new" className="inline-flex h-10 items-center rounded-lg bg-teal px-4 text-sm font-medium text-white hover:bg-teal-dark">Create ticket</Link>} />
      <Async state={state}>
        {(d) => d.items.length === 0
          ? <Card><EmptyState title="You haven’t raised any tickets" hint="When you do, you’ll see the status and our replies here." /></Card>
          : <div className="space-y-3">{d.items.map((t) => {
              const open = openId === t.id;
              const replies = (t.messages || []).filter((m) => m.sender === 'admin').length;
              return (
                <Card key={t.id}>
                  <button className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left sm:px-6" aria-expanded={open} onClick={() => setOpenId(open ? null : t.id)}>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{t.subject}</span>
                      <span className="text-xs text-muted">{t.book?.title || 'General / Account level'} · {dateTime(t.createdAt)} · {replies ? `${replies} repl${replies > 1 ? 'ies' : 'y'}` : 'Awaiting reply'}</span>
                    </span>
                    <StatusBadge value={t.status} />
                  </button>
                  {open && <div className="border-t border-line bg-canvas p-4 sm:p-6"><Timeline ticket={t} viewer="author" /></div>}
                </Card>
              );
            })}</div>}
      </Async>
    </>
  );
}
