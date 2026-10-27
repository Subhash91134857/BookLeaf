import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import { Spinner } from './components/ui/StateViews';
import Login from './pages/Login';
import Dashboard from './pages/author/Dashboard';
import MyBooks from './pages/author/MyBooks';
import NewTicket from './pages/author/NewTicket';
import MyTickets from './pages/author/MyTickets';
import TicketQueue from './pages/admin/TicketQueue';
import TicketDetail from './pages/admin/TicketDetail';

const home = (u) => (u.role === 'admin' ? '/admin/tickets' : '/dashboard');

function RequireAuth() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return user ? <AppShell /> : <Navigate to="/login" replace />;
}
// Client-side guard only (UX). The backend is the real RBAC enforcement.
function RoleGate({ role }) {
  const { user } = useAuth();
  return user.role === role ? <Outlet /> : <Navigate to={home(user)} replace />;
}
function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Spinner />;
  return <Navigate to={user ? home(user) : '/login'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route element={<RoleGate role="author" />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/books" element={<MyBooks />} />
          <Route path="/tickets" element={<MyTickets />} />
          <Route path="/tickets/new" element={<NewTicket />} />
        </Route>
        <Route element={<RoleGate role="admin" />}>
          <Route path="/admin/tickets" element={<TicketQueue />} />
          <Route path="/admin/tickets/:id" element={<TicketDetail />} />
        </Route>
      </Route>
      <Route path="*" element={<Home />} />
    </Routes>
  );
}
