import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membersApi } from '@/api/members';
import { workoutLogsApi } from '@/api/workout-logs';
import { Card, EmptyState } from '@/components/ui';
import { fmtDate } from '@/utils/format';

export function DashboardPage() {
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ['workout-logs', 'recent'],
    queryFn: () => workoutLogsApi.list(),
  });

  const last7days = recentLogs.filter((l) => {
    const d = new Date(l.date).getTime();
    return Date.now() - d < 7 * 24 * 60 * 60 * 1000;
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">대시보드</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm text-gray-500">참여 대상</p>
          <p className="text-3xl font-bold mt-1">{members.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">최근 7일 운동 기록</p>
          <p className="text-3xl font-bold mt-1">{last7days.length}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">전체 누적 기록</p>
          <p className="text-3xl font-bold mt-1">{recentLogs.length}</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold mb-3">최근 기록</h2>
        {recentLogs.length === 0 ? (
          <EmptyState title="아직 기록이 없습니다" description="오늘 기록 페이지에서 운동을 기록해보세요." />
        ) : (
          <ul className="divide-y">
            {recentLogs.slice(0, 8).map((log) => {
              const m = members.find((mm) => mm.id === log.memberId);
              return (
                <li key={log.id} className="py-2 flex items-center justify-between">
                  <div>
                    <Link
                      to={`/members/${log.memberId}`}
                      className="font-medium text-indigo-600 hover:underline"
                    >
                      {m?.name ?? `#${log.memberId}`}
                    </Link>
                    <span className="ml-3 text-sm text-gray-500">{fmtDate(log.date)}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {log.sets.length}세트 · 컨디션 {log.condition ?? '-'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
