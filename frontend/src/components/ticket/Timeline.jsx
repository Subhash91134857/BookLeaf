import { dateTime } from '../../lib/format';


export default function Timeline({ ticket, viewer }) {
  const items = [
    { id: 'original', sender: 'author', senderName: ticket.author?.name || 'Author', body: ticket.description, createdAt: ticket.createdAt },
    ...(ticket.messages || []),
  ];
  return (
    <ol className="space-y-4">
      {items.map((m) => {
        const fromAdmin = m.sender === 'admin';
        const who = fromAdmin ? (viewer === 'author' ? 'BookLeaf team' : m.senderName || 'BookLeaf team') : (viewer === 'author' ? 'You' : m.senderName);
        return (
          <li key={m.id} className={`max-w-[90%] rounded-xl border p-4 ${fromAdmin ? 'ml-auto border-teal/20 bg-teal/5' : 'border-line bg-surface'}`}>
            <div className="mb-1 flex items-baseline justify-between gap-4 text-xs text-muted">
              <span className="font-medium text-ink">{who}{m.id === 'original' && ' · original query'}</span>
              <time>{dateTime(m.createdAt)}</time>
            </div>
            <p className="whitespace-pre-wrap text-sm">{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
