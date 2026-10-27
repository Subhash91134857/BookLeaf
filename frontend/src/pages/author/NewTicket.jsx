import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/endpoints';
import { useApi } from '../../hooks/useApi';
import Button from '../../components/ui/Button';
import { Card, PageHeader } from '../../components/ui/Card';
import { InlineAlert } from '../../components/ui/StateViews';

const empty = { bookId: '', subject: '', description: '' };

export default function NewTicket() {
  const navigate = useNavigate();
  const books = useApi(() => api.books.list(), []);
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const validate = () => {
    const e = {};
    if (form.subject.trim().length < 3) e.subject = 'Add a short subject (at least 3 characters).';
    if (form.description.trim().length < 10) e.description = 'Describe the issue in at least 10 characters.';
    return e;
  };
  const submit = async (ev) => {
    ev.preventDefault();
    const e = validate(); setErrors(e); setFormError('');
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      await api.tickets.create({ bookId: form.bookId || null, subject: form.subject.trim(), description: form.description.trim() });
      navigate('/tickets');
    } catch (err) { setErrors(err.details); setFormError(err.message); setBusy(false); }
  };

  return (
    <>
      <PageHeader title="New support query" subtitle="Tell us what’s going on. Most queries get a reply within 48 hours." />
      <form onSubmit={submit} noValidate>
        <Card className="max-w-2xl space-y-4 p-4 sm:p-6">
          {formError && <InlineAlert tone="critical">{formError}</InlineAlert>}
          <label className="label">Which book is this about?
            <select className="input mt-1 text-ink" value={form.bookId} onChange={set('bookId')} disabled={books.loading}>
              <option value="">General / Account level</option>
              {(books.data || []).map((b) => <option key={b.bookId} value={b.bookId}>{b.title}</option>)}
            </select>
          </label>
          <label className="label">Subject
            <input className="input mt-1 text-ink" maxLength={120} value={form.subject} onChange={set('subject')} placeholder="e.g. Royalty not received for last quarter" />
            {errors.subject && <span className="mt-1 block text-xs text-critical-fg">{errors.subject}</span>}
          </label>
          <label className="label">Description
            <textarea className="textarea mt-1 min-h-[160px] text-ink" value={form.description} onChange={set('description')} placeholder="Include dates, amounts and anything that helps us look into it." />
            {errors.description && <span className="mt-1 block text-xs text-critical-fg">{errors.description}</span>}
          </label>
          <label className="label">Attachments (optional)
            <input type="file" multiple className="mt-1 block w-full text-sm text-ink file:mr-3 file:h-10 file:rounded-lg file:border file:border-line file:bg-surface file:px-4" onChange={(e) => setFiles([...e.target.files])} />
            <span className="mt-1 block text-xs font-normal">{files.length ? `${files.length} file(s) selected: ${files.map((f) => f.name).join(', ')}. File upload isn’t enabled yet — please email photos to the team after submitting.` : 'Photos of printing issues help us arrange reprints faster.'}</span>
          </label>
          <div className="flex justify-end"><Button type="submit" loading={busy}>Create ticket</Button></div>
        </Card>
      </form>
    </>
  );
}
