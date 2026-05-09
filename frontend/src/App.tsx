import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { RequireAuth } from './auth/RequireAuth';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/LoginPage';
import { HomeRedirect } from './pages/HomeRedirect';
import { MembersPage } from './pages/MembersPage';
import { MemberDetailPage } from './pages/MemberDetailPage';
import { RoutinesPage } from './pages/RoutinesPage';
import { DailyLogPage } from './pages/DailyLogPage';
import { ReportsPage } from './pages/ReportsPage';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<HomeRedirect />} />
          <Route
            path="/members"
            element={
              <RequireAuth adminOnly>
                <MembersPage />
              </RequireAuth>
            }
          />
          <Route path="/members/:id" element={<MemberDetailPage />} />
          <Route path="/routines" element={<RoutinesPage />} />
          <Route path="/log" element={<DailyLogPage />} />
          <Route
            path="/reports"
            element={
              <RequireAuth adminOnly>
                <ReportsPage />
              </RequireAuth>
            }
          />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
