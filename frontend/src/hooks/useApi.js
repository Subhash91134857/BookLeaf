import { useCallback, useEffect, useRef, useState } from 'react';


export function useApi(fetcher, deps = [], intervalMs = 0) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const fnRef = useRef(fetcher);
  fnRef.current = fetcher;

  const load = useCallback(async (silent) => {
    try {
      const data = await fnRef.current();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => (silent ? s : { data: null, error, loading: false }));
    }
  }, []);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    load(false);
    if (!intervalMs) return undefined;
    const id = setInterval(() => { if (!document.hidden) load(true); }, intervalMs);
    return () => clearInterval(id);
  }, deps);

  return { ...state, reload: () => load(true) };
}
