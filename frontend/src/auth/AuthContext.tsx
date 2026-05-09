// 로그인 상태 관리
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/api/client';

export interface AuthUser {
  role: 'admin' | 'student';
  memberId?: number;
  name?: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  loginAdmin: (password: string) => Promise<void>;
  loginStudent: (memberId: number, pin: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

const TOKEN_KEY = 'hc_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // 페이지 새로고침 시 저장된 토큰으로 사용자 정보 복원
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get('/auth/me')
      .then((r) => setUser(r.data))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const loginAdmin = useCallback(async (password: string) => {
    const r = await api.post('/auth/admin', { password });
    localStorage.setItem(TOKEN_KEY, r.data.token);
    setUser({ role: 'admin' });
  }, []);

  const loginStudent = useCallback(async (memberId: number, pin: string) => {
    const r = await api.post('/auth/student', { memberId, pin });
    localStorage.setItem(TOKEN_KEY, r.data.token);
    setUser({ role: 'student', memberId: r.data.memberId, name: r.data.name });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    window.location.href = '/login';
  }, []);

  const value = useMemo(
    () => ({ user, loading, loginAdmin, loginStudent, logout }),
    [user, loading, loginAdmin, loginStudent, logout],
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const v = useContext(AuthCtx);
  if (!v) throw new Error('useAuth must be inside AuthProvider');
  return v;
}
