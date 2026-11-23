import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import { ApiError } from '@/lib/api';
import App from './App';
import './index.css';

// Reference data (dropdowns, cities, settings) rarely changes; everything else re-syncs every 20 s while the tab is open,
// on focus and on reconnect, so one person's change shows up for the rest of the team without a reload.
const STATIC_KEYS = new Set(['picklist', 'picklist-admin', 'cities', 'designations', 'designations-review', 'settings', 'thresholds',
  'checklist-items', 'templates', 'size-buckets', 'saved-views', 'me']);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchInterval: (q) => (STATIC_KEYS.has(String(q.queryKey[0])) ? false : 20_000),
      refetchIntervalInBackground: false,
      retry: (count, err) => !(err instanceof ApiError && err.status < 500) && count < 2,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position={window.matchMedia('(max-width: 1023px)').matches ? 'top-center' : 'bottom-right'} toastOptions={{ className: 'text-[13px]' }} closeButton />
        </AuthProvider>
      </BrowserRouter>
      </I18nProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
