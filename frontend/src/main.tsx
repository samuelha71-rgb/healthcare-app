import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import './index.css';
import App from './App.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5분 동안은 새로 받지 않고 캐시된 데이터 사용 — 탭 전환 시 깜빡임 없음
      staleTime: 5 * 60 * 1000,
      // 30분 동안 메모리에 보관
      gcTime: 30 * 60 * 1000,
      // 창 포커스/네트워크 복귀에 자동 refetch 안 함 (조용함 유지)
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      // 일시적 오류엔 한 번만 재시도 (콜드스타트 등)
      retry: 1,
      retryDelay: 1500,
    },
    mutations: {
      retry: 0,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
