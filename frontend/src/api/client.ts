// axios 인스턴스 — 모든 API 호출은 이걸 통해서
// 매 요청마다 localStorage의 토큰을 헤더에 자동 부착.
import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hc_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers['x-auth-token'] = token;
  }
  return config;
});

// 401 응답 시 로그인 페이지로 (auth/me, auth/login 자체는 제외)
api.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    if (
      err.response?.status === 401 &&
      !url.includes('/auth/admin') &&
      !url.includes('/auth/student') &&
      !url.includes('/auth/me')
    ) {
      localStorage.removeItem('hc_token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  },
);
