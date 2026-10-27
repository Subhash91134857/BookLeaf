import { ToneBadge } from "../ui/Badge";
import { date, money, num } from "../../lib/format";

const live = (b) => b.status === "Published & Live";
export const BookStatus = ({ status }) => (
  <ToneBadge
    tone={status === "Published & Live" ? "success" : "info"}
    icon={status === "Published & Live" ? "✓" : "◐"}
  >
    {status}
  </ToneBadge>
);
export default function BooksTable({ books, compact = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-line bg-canvas">
          <tr>
            <th className="th">Title</th>
            {!compact && (
              <>
                <th className="th">ISBN</th>
                <th className="th">Genre</th>
                <th className="th">Published</th>
              </>
            )}
            <th className="th">Status</th>
            {!compact && <th className="th text-right">MRP</th>}
            <th className="th text-right">Copies sold</th>
            {!compact && (
              <>
                <th className="th text-right">Earned</th>
                <th className="th text-right">Paid</th>
              </>
            )}
            <th className="th text-right">Pending</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {books.map((b) => (
            <tr key={b.bookId}>
              <td className="td font-medium">
                {b.title}
                {!live(b) && (
                  <p className="text-xs font-normal text-muted">
                    Not on sale yet — we’ll email you at each stage.
                  </p>
                )}
              </td>
              {!compact && (
                <>
                  <td className="td whitespace-nowrap text-muted">
                    {b.isbn || "—"}
                  </td>
                  <td className="td text-muted">{b.genre}</td>
                  <td className="td whitespace-nowrap text-muted">
                    {date(b.publicationDate)}
                  </td>
                </>
              )}
              <td className="td">
                <BookStatus status={b.status} />
              </td>
              {!compact && <td className="td text-right">{money(b.mrp)}</td>}
              <td className="td text-right">{num(b.totalCopiesSold)}</td>
              {!compact && (
                <>
                  <td className="td text-right">
                    {money(b.totalRoyaltyEarned)}
                  </td>
                  <td className="td text-right">{money(b.royaltyPaid)}</td>
                </>
              )}
              <td
                className={`td text-right ${b.royaltyPending > 0 ? "font-medium" : "text-muted"}`}
              >
                {money(b.royaltyPending)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
