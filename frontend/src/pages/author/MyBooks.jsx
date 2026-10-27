import { api } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import { Card, PageHeader } from '../../components/ui/Card';
import { Async, EmptyState } from '../../components/ui/StateViews';
import BooksTable from '../../components/books/BooksTable';

export default function MyBooks() {
  const books = useApi(() => api.books.list(), []);
  return (
    <>
      <PageHeader title="My books" subtitle="Sales and royalty figures for every title." />
      <Card>
        <Async state={books}>
          {(list) => list.length ? <BooksTable books={list} /> : <EmptyState title="No books yet" hint="Once your manuscript is received it will show up here." />}
        </Async>
      </Card>
    </>
  );
}
