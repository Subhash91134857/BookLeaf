import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV = {
  author: [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/books', label: 'My books' },
    { to: '/tickets/new', label: 'New query' },
    { to: '/tickets', label: 'My tickets', end: true },
  ],
  admin: [{ to: '/admin/tickets', label: 'Ticket queue' }],
};

export default function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const link = ({ isActive }) =>
    `block rounded-lg px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-white/10 text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`;

  return (
    <div className="min-h-screen">
      <header className="flex h-14 items-center justify-between bg-ink px-4 text-white lg:hidden">
        <span className="font-semibold">BookLeaf</span>
        <button className="rounded-lg px-3 py-2 text-sm" onClick={() => setOpen(!open)} aria-expanded={open}>Menu</button>
      </header>
      {open && <div className="fixed inset-0 z-20 bg-ink/40 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col bg-ink p-4 transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-8 px-3 pt-2 text-lg font-semibold text-white">BookLeaf <span className="block text-xs font-normal text-white/60">{user.role === 'admin' ? 'Support operations' : 'Author portal'}</span></div>
        <nav className="flex-1 space-y-1" onClick={() => setOpen(false)}>
          {NAV[user.role].map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}>{n.label}</NavLink>)}
        </nav>
        <div className="border-t border-white/10 px-3 pt-4 text-white">
          <p className="truncate font-medium">{user.name}</p>
          <p className="truncate text-xs text-white/60">{user.email}</p>
          <button onClick={logout} className="mt-3 text-sm text-white/70 underline hover:text-white">Sign out</button>
        </div>
      </aside>
      <main className="p-4 sm:p-6 lg:ml-60 lg:p-8"><Outlet /></main>
    </div>
  );
}
