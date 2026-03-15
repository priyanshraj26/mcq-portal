import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { apiClient } from '../api/client';

export function AuthInterceptor({ children }: { children: React.ReactNode }) {
  const { getToken } = useAuth();

  useEffect(() => {
    const id = apiClient.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
    return () => { apiClient.interceptors.request.eject(id); };
  }, [getToken]);

  return <>{children}</>;
}
