import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Input, Label, Select } from '@/components/ui';
import { authApi } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';

export function LoginPage() {
  const nav = useNavigate();
  const { loginAdmin, loginStudent } = useAuth();
  const [tab, setTab] = useState<'student' | 'admin'>('student');

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-indigo-50 to-white">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-3xl">🏋️</div>
          <h1 className="text-2xl font-bold mt-2">Healthcare</h1>
          <p className="text-sm text-gray-500">로그인하세요</p>
        </div>

        <Card>
          <div className="flex border-b mb-4">
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                tab === 'student'
                  ? 'border-b-2 border-indigo-600 text-indigo-700'
                  : 'text-gray-500'
              }`}
              onClick={() => setTab('student')}
            >
              참여자
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${
                tab === 'admin'
                  ? 'border-b-2 border-indigo-600 text-indigo-700'
                  : 'text-gray-500'
              }`}
              onClick={() => setTab('admin')}
            >
              관리자
            </button>
          </div>

          {tab === 'student' ? (
            <StudentLogin
              onSuccess={async (id, pin) => {
                await loginStudent(id, pin);
                nav('/');
              }}
            />
          ) : (
            <AdminLogin
              onSuccess={async (pw) => {
                await loginAdmin(pw);
                nav('/');
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

function StudentLogin({
  onSuccess,
}: {
  onSuccess: (id: number, pin: string) => Promise<void>;
}) {
  const { data: students = [] } = useQuery({
    queryKey: ['student-options'],
    queryFn: authApi.studentOptions,
  });
  const [memberId, setMemberId] = useState<number | ''>('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!memberId || !pin) return;
    setError('');
    setLoading(true);
    try {
      await onSuccess(Number(memberId), pin);
    } catch {
      setError('PIN이 틀렸거나 등록되지 않은 사용자입니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>이름</Label>
        <Select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">선택하세요</option>
          {students.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
        {students.length === 0 && (
          <p className="text-xs text-gray-500 mt-1">
            등록된 참여자가 없습니다. 관리자에게 문의하세요.
          </p>
        )}
      </div>
      <div>
        <Label>PIN (관리자에게 받은 비밀번호)</Label>
        <Input
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={submit} disabled={!memberId || !pin || loading} className="w-full">
        {loading ? '로그인 중...' : '입장'}
      </Button>
    </div>
  );
}

function AdminLogin({ onSuccess }: { onSuccess: (pw: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!password) return;
    setError('');
    setLoading(true);
    try {
      await onSuccess(password);
    } catch {
      setError('비밀번호가 틀렸습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>관리자 비밀번호</Label>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button onClick={submit} disabled={!password || loading} className="w-full">
        {loading ? '로그인 중...' : '관리자 로그인'}
      </Button>
    </div>
  );
}
