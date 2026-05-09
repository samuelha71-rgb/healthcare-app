// 역할에 따라 자동으로 적절한 시작 페이지로
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';
import { DashboardPage } from './DashboardPage';

export function HomeRedirect() {
  const { user } = useAuth();
  if (user?.role === 'student' && user.memberId) {
    return <Navigate to={`/members/${user.memberId}`} replace />;
  }
  return <DashboardPage />;
}
