import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { InlineAlert } from '../components/ui/StateViews';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setBusy(true);
    try { await login(form.email.trim(), form.password); navigate('/', { replace: true }); }
    catch (err) { setError(err.status === 401 ? 'Email or password is incorrect.' : err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-xl border border-line bg-surface p-6 sm:p-8">
        <div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
          <p className="mt-1 text-muted">BookLeaf author support</p>
        </div>
        {error && <InlineAlert tone="critical">{error}</InlineAlert>}
        <label className="label">Email<input className="input mt-1 text-ink" type="email" required autoComplete="email" value={form.email} onChange={set('email')} /></label>
        <label className="label">Password<input className="input mt-1 text-ink" type="password" required autoComplete="current-password" value={form.password} onChange={set('password')} /></label>
        <Button type="submit" loading={busy} className="w-full">Sign in</Button>
      </form>
    </div>
  );
}
