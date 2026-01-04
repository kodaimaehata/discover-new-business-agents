import { useEffect } from 'react';
import { useStore } from '../store';

export function useInitialize() {
  const initialized = useStore((state) => state._initialized);
  const loading = useStore((state) => state._loading);
  const error = useStore((state) => state._error);
  const serverAvailable = useStore((state) => state._serverAvailable);
  const initializeFromServer = useStore((state) => state.initializeFromServer);

  useEffect(() => {
    if (!initialized && !loading) {
      initializeFromServer();
    }
  }, [initialized, loading, initializeFromServer]);

  return { initialized, loading, error, serverAvailable };
}
