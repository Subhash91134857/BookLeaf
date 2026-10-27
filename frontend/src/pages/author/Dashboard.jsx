import { Link } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Card, CardHeader, PageHeader } from '../../components/ui/Card';
import { Async, EmptyState } from '../../components/ui/StateViews';
import { StatusBadge } from '../../components/ui/Badge';
import BooksTable from '../../components/books/BooksTable';
import { useAuth } from '../../context/AuthContext';
import { age, money } from '../../lib/format';
import { POLL_MS } from '../../lib/constants';

const Stat = ({ label, value }) => (
  <div className="rounded-xl border border-line bg-surface p-4">
    <p className="text-xs text-muted">{label}</p>
    <p className="mt-1 text-2xl font-semibold">{value}</p>
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const books = useApi(() => api.books.list(), []);
  const tickets = useApi(() => api.tickets.list({ pageSize: 5 }), [], POLL_MS.list);

  return (
    <>
      <PageHeader title={`Welcome, ${user.name.split(' ')[0]}`} subtitle="Your books, royalties and support queries at a glance." action={<Link to="/tickets/new" className="inline-flex h-10 items-center rounded-lg bg-teal px-4 text-sm font-medium text-white hover:bg-teal-dark">Create ticket</Link>} />
      <Async state={books}>
        {(list) => (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              <Stat label="Total books" value={list.length} />
              <Stat label="Published books" value={list.filter((b) => b.status === 'Published & Live').length} />
              <Stat label="Lifetime royalties" value={money(list.reduce((s, b) => s + (b.totalRoyaltyEarned || 0), 0))} />
              <Stat label="Pending royalties" value={money(list.reduce((s, b) => s + (b.royaltyPending || 0), 0))} />
            </div>
            <Card>
              <CardHeader title="Recent books" action={<Link to="/books" className="text-sm font-medium text-teal">View all</Link>} />
              {list.length ? <BooksTable books={list.slice(0, 5)} compact /> : <EmptyState title="No books yet" hint="Your books will appear here once they are in production." />}
            </Card>
          </div>
        )}
      </Async>
      <Card className="mt-6">
        <CardHeader title="Recent tickets" action={<Link to="/tickets" className="text-sm font-medium text-teal">View all</Link>} />
        <Async state={tickets}>
          {(d) => d.items.length === 0
            ? <EmptyState title="No tickets yet" hint="Questions about royalties, ISBNs, printing or book status? Raise a ticket and we’ll reply here." />
            : <ul className="divide-y divide-line">{d.items.map((t) => (
                <li key={t.id}><Link to="/tickets" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-canvas sm:px-6">
                  <span className="min-w-0"><span className="block truncate font-medium">{t.subject}</span><span className="text-xs text-muted">{age(t.createdAt)} ago</span></span>
                  <StatusBadge value={t.status} />
                </Link></li>))}</ul>}
        </Async>
      </Card>
    </>
  );
}
