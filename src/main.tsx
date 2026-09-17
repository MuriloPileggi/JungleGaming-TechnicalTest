import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import './index.css';
import App from './App.tsx';

async function bootstrap(): Promise<void> {
  // MSW is this app's backend in every environment (no real API exists).
  // Lazy import keeps it in its own chunk; started pre-render so no query races it.
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });

  if (new URLSearchParams(window.location.search).get('test') === '1') {
    const { installApiFaultHooks } = await import('./mocks/faults');
    installApiFaultHooks();
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}

void bootstrap();
