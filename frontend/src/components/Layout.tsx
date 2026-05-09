// 페이지 공통 레이아웃 — 역할별로 메뉴 다름
import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { useAuth } from '@/auth/AuthContext';

const ADMIN_NAV = [
  { to: '/', label: '대시보드', end: true },
  { to: '/members', label: '대상' },
  { to: '/routines', label: '루틴' },
  { to: '/log', label: '오늘 기록' },
  { to: '/reports', label: '리포트' },
];

const STUDENT_NAV = [
  { to: '/', label: '내 정보', end: true },
  { to: '/log', label: '오늘 기록' },
  { to: '/routines', label: '내 루틴' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const nav = user?.role === 'admin' ? ADMIN_NAV : STUDENT_NAV;

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 bg-white border-r border-gray-200 p-4 flex flex-col print:hidden">
        <div className="font-bold text-lg mb-1">🏋️ Healthcare</div>
        <div className="text-xs text-gray-500 mb-6">
          {user?.role === 'admin' ? '관리자' : user?.name}
        </div>
        <nav className="flex flex-col gap-1 flex-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                clsx(
                  'px-3 py-2 rounded-lg text-sm font-medium',
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-50',
                )
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 px-3 py-2 text-left"
        >
          로그아웃
        </button>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
