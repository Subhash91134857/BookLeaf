import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../api/endpoints';
import { setUnauthorizedHandler, tokenStore } from '../api/client';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  const logout = useCallback(() => { tokenStore.clear(); setUser(null); }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout); // any 401 => back to login
    if (!tokenStore.get()) return;
    api.auth.me().then(setUser).catch(logout).finally(() => setLoading(false));
  }, [logout]);

  const login = useCallback(async (email, password) => {
    const { token, user } = await api.auth.login(email, password);
    tokenStore.set(token);
    setUser(user);
    return user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
