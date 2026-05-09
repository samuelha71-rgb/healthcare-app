// 대상 간 운동 성실도 비교 — 관리자 전용
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { workoutLogsApi } from '@/api/workout-logs';
import { Card, EmptyState, Select } from '@/components/ui';
import { currentStreak, recentDays } from '@/utils/stats';

type SortKey = 'recent7' | 'recent30' | 'streak' | 'total' | 'avgRpe';

const SORT_LABELS: Record<SortKey, string> = {
  recent7: '최근 7일 운동 일수',
  recent30: '최근 30일 운동 일수',
  streak: '연속 출석',
  total: '전체 운동 일수',
  avgRpe: '평균 강도(RPE)',
};

export function MemberComparison() {
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ['workout-logs'],
    queryFn: () => workoutLogsApi.list(),
  });

  const [sortKey, setSortKey] = useState<SortKey>('recent30');

  const rows = useMemo(() => {
    return members.map((m) => {
      const myLogs = logs.filter((l) => l.memberId === m.id);
      const dates = myLogs.map((l) => l.date);
      const rpeVals = myLogs.map((l) => l.rpe).filter((v): v is number => !!v);
      const avgRpe = rpeVals.length
        ? rpeVals.reduce((s, v) => s + v, 0) / rpeVals.length
        : 0;

      return {
        member: m,
        recent7: recentDays(dates, 7),
        recent30: recentDays(dates, 30),
        streak: currentStreak(dates),
        total: new Set(dates.map((d) => d.slice(0, 10))).size,
        avgRpe: Math.round(avgRpe * 10) / 10,
      };
    });
  }, [members, logs]);

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  }, [rows, sortKey]);

  const max = Math.max(1, ...sorted.map((r) => r[sortKey] as number));

  if (members.length === 0) {
    return (
      <Card>
        <EmptyState title="비교할 대상이 없습니다" description="대상을 먼저 추가해주세요." />
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">대상 성실도 비교</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">기준:</span>
          <Select
            className="!w-auto"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
          >
            {Object.entries(SORT_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="py-2 pr-2">순위</th>
              <th className="pr-2">이름</th>
              <th className="pr-2">최근 7일</th>
              <th className="pr-2">최근 30일</th>
              <th className="pr-2">연속</th>
              <th className="pr-2">전체</th>
              <th className="pr-2">평균 RPE</th>
              <th className="w-1/3">{SORT_LABELS[sortKey]} (시각화)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => {
              const value = r[sortKey] as number;
              const pct = (value / max) * 100;
              return (
                <tr key={r.member.id} className="border-b last:border-0">
                  <td className="py-2 pr-2 font-bold">
                    {i === 0 && '🥇'}
                    {i === 1 && '🥈'}
                    {i === 2 && '🥉'}
                    {i > 2 && i + 1}
                  </td>
                  <td className="pr-2">
                    <Link
                      to={`/members/${r.member.id}`}
                      className="text-indigo-600 hover:underline font-medium"
                    >
                      {r.member.name}
                    </Link>
                  </td>
                  <td className="pr-2">{r.recent7}일</td>
                  <td className="pr-2">{r.recent30}일</td>
                  <td className="pr-2">{r.streak}일🔥</td>
                  <td className="pr-2">{r.total}일</td>
                  <td className="pr-2">{r.avgRpe || '-'}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{value}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
