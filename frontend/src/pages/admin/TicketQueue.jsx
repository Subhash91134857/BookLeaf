import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { Async, EmptyState } from '../../components/ui/StateViews';
import { PriorityBadge, StatusBadge, ToneBadge } from '../../components/ui/Badge';
import { CATEGORIES, POLL_MS, PRIORITY, STATUS } from '../../lib/constants';
import { age, dateTime, isOverdue } from '../../lib/format';

const PAGE_SIZE = 15;
const EMPTY = { status: '', category: '', priority: '', assignee: '', from: '', to: '' };

const Filter = ({ label, children }) => <label className="label">{label}{children}</label>;

export default function TicketQueue() {
  const navigate = useNavigate();
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const state = useApi(() => api.tickets.list({ ...f, page, pageSize: PAGE_SIZE, sort: 'urgency' }), [f, page], POLL_MS.list);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const dirty = Object.values(f).some(Boolean);

  return (
    <>
      <PageHeader title="Ticket queue" subtitle="Most urgent and oldest unresolved tickets first." />
      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <Filter label="Status"><select className="input mt-1 text-ink" value={f.status} onChange={set('status')}><option value="">All</option>{Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Filter>
          <Filter label="Priority"><select className="input mt-1 text-ink" value={f.priority} onChange={set('priority')}><option value="">All</option>{Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></Filter>
          <Filter label="Category"><select className="input mt-1 text-ink" value={f.category} onChange={set('category')}><option value="">All</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></Filter>
          <Filter label="Assignee"><select className="input mt-1 text-ink" value={f.assignee} onChange={set('assignee')}><option value="">Anyone</option><option value="me">Assigned to me</option><option value="unassigned">Unassigned</option></select></Filter>
          <Filter label="Created from"><input type="date" className="input mt-1 text-ink" value={f.from} onChange={set('from')} /></Filter>
          <Filter label="Created to"><input type="date" className="input mt-1 text-ink" value={f.to} onChange={set('to')} /></Filter>
        </div>
        {dirty && <div className="mt-3"><Button variant="ghost" className="h-8 px-2" onClick={() => { setF(EMPTY); setPage(1); }}>Clear filters</Button></div>}
      </Card>

      <Card>
        <Async state={state}>
          {({ items, total }) => items.length === 0
            ? <EmptyState title={dirty ? 'No tickets match these filters' : 'The queue is clear'} hint={dirty ? 'Try removing a filter.' : 'New author queries will appear here automatically.'} />
            : <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead className="border-b border-line bg-canvas"><tr>
                    {['Priority', 'Subject', 'Author', 'Category', 'Status', 'Created', 'Assignee'].map((h) => <th key={h} className="th">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-line">
                    {items.map((t) => {
                      const overdue = isOverdue(t);
                      return (
                        <tr key={t.id} onClick={() => navigate(`/admin/tickets/${t.id}`)}
                          className={`cursor-pointer hover:bg-canvas ${overdue ? 'bg-critical-bg/30' : ''} ${t.priority === 'critical' ? 'border-l-4 border-l-critical-fg' : 'border-l-4 border-l-transparent'}`}>
                          <td className="td"><PriorityBadge value={t.priority} /></td>
                          <td className="td max-w-xs"><Link to={`/admin/tickets/${t.id}`} className="block truncate font-medium hover:text-teal" onClick={(e) => e.stopPropagation()}>{t.subject}</Link></td>
                          <td className="td"><span className="block">{t.author?.name}</span><span className="text-xs text-muted">{t.book?.title || 'General'}</span></td>
                          <td className="td text-muted">{t.category}</td>
                          <td className="td"><StatusBadge value={t.status} /></td>
                          <td className="td whitespace-nowrap"><span className="block text-muted">{dateTime(t.createdAt)}</span><span className="text-xs">{age(t.createdAt)} old {overdue && <ToneBadge tone="critical" icon="⏱">Overdue</ToneBadge>}</span></td>
                          <td className="td text-muted">{t.assignee?.name || 'Unassigned'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-muted">
                <span>{total} ticket{total === 1 ? '' : 's'}</span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" className="h-8 px-3" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                  <span>Page {page} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}</span>
                  <Button variant="secondary" className="h-8 px-3" disabled={page * PAGE_SIZE >= total} onClick={() => setPage(page + 1)}>Next</Button>
                </div>
              </div>
            </>}
        </Async>
      </Card>
    </>
  );
}
