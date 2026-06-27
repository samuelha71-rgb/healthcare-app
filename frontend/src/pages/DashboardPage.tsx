import { useQuery } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { workoutLogsApi } from '@/api/workout-logs';
import { Card } from '@/components/ui';
import { MemberComparison } from '@/features/MemberComparison';

export function DashboardPage() {
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['workout-logs', 'recent'],
    queryFn: () => workoutLogsApi.list({ limit: 30 }),
  });

  // 실제 운동한 날(세트가 있는 기록)만 카운트
  const last7days = recentLogs.filter((l) => {
    if (l.sets.length === 0) return false;
    const d = new Date(l.date).getTime();
    return Date.now() - d < 7 * 24 * 60 * 60 * 1000;
  });
  const realWorkouts = recentLogs.filter((l) => l.sets.length > 0);

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
          <p className="text-sm text-gray-500">최근 30일 누적 기록</p>
          <p className="text-3xl font-bold mt-1">{realWorkouts.length}</p>
        </Card>
      </div>

      <MemberComparison />
    </div>
  );
}
