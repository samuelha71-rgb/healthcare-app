// 리포트 — 수면 그래프 + 식단 시각화 (관리자용)
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
} from 'recharts';
import { sleepApi } from '@/api/sleep';
import { dietApi } from '@/api/diet';
import { Card, EmptyState } from '@/components/ui';

export function SleepDietReport({ memberId }: { memberId: number }) {
  const { data: sleep = [] } = useQuery({
    queryKey: ['sleep', memberId],
    queryFn: () => sleepApi.list(memberId),
  });
  const { data: diet = [] } = useQuery({
    queryKey: ['diet', memberId],
    queryFn: () => dietApi.list(memberId),
  });

  const sleepData = useMemo(
    () =>
      sleep.map((s) => ({
        date: s.date.slice(5, 10),
        hours: s.hours,
      })),
    [sleep],
  );

  const avgSleep = useMemo(() => {
    if (sleep.length === 0) return 0;
    return sleep.reduce((sum, s) => sum + s.hours, 0) / sleep.length;
  }, [sleep]);

  // 양 분포 + 음식별 빈도
  const dietStats = useMemo(() => {
    const amountCounts = { 적게: 0, 적당히: 0, 많이: 0 };
    const foodCounts: Record<string, { 적게: number; 적당히: number; 많이: number; total: number }> = {};
    let totalItems = 0;

    for (const log of diet) {
      for (const it of log.items) {
        const amt = it.amount as keyof typeof amountCounts;
        if (amt in amountCounts) amountCounts[amt]++;
        totalItems++;
        const key = it.foodName;
        foodCounts[key] ??= { 적게: 0, 적당히: 0, 많이: 0, total: 0 };
        foodCounts[key][amt]++;
        foodCounts[key].total++;
      }
    }

    const topFoods = Object.entries(foodCounts)
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    return { amountCounts, topFoods, totalItems, totalDays: diet.length };
  }, [diet]);

  return (
    <>
      <Card>
        <h3 className="font-semibold mb-2">수면 시간 추이</h3>
        {sleep.length === 0 ? (
          <EmptyState title="수면 기록이 없습니다" description="오늘 기록에서 입력하면 그래프로 표시됩니다." />
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-2">
              평균 <span className="font-bold text-indigo-700">{avgSleep.toFixed(1)}시간</span> ·
              총 {sleep.length}일 기록 · 권장 7~9시간
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={sleepData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 12]} unit="h" />
                <Tooltip />
                <Legend />
                <ReferenceLine y={7} stroke="#10b981" strokeDasharray="3 3" label="권장 하한 7h" />
                <ReferenceLine y={9} stroke="#10b981" strokeDasharray="3 3" label="권장 상한 9h" />
                <Line
                  type="monotone"
                  dataKey="hours"
                  name="수면 시간"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          </>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold mb-3">식단 분석</h3>
        {diet.length === 0 ? (
          <EmptyState title="식단 기록이 없습니다" />
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-gray-500">
              총 <span className="font-bold">{dietStats.totalDays}일</span> 기록 ·{' '}
              <span className="font-bold">{dietStats.totalItems}회</span> 음식 입력
            </div>

            {/* 양 분포 */}
            <div>
              <h4 className="text-sm font-medium mb-2">섭취량 분포</h4>
              <div className="flex h-6 rounded-lg overflow-hidden border">
                {(['적게', '적당히', '많이'] as const).map((amt) => {
                  const count = dietStats.amountCounts[amt];
                  const pct = dietStats.totalItems
                    ? (count / dietStats.totalItems) * 100
                    : 0;
                  const color =
                    amt === '많이' ? '#ef4444' : amt === '적당히' ? '#10b981' : '#9ca3af';
                  return (
                    <div
                      key={amt}
                      style={{ width: `${pct}%`, backgroundColor: color }}
                      className="flex items-center justify-center text-white text-xs font-medium"
                      title={`${amt}: ${count}회 (${pct.toFixed(0)}%)`}
                    >
                      {pct > 8 ? `${amt} ${pct.toFixed(0)}%` : ''}
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-4 text-xs text-gray-600 mt-2">
                <span>
                  <span className="inline-block w-3 h-3 rounded-sm bg-gray-400 mr-1" /> 적게{' '}
                  {dietStats.amountCounts.적게}회
                </span>
                <span>
                  <span className="inline-block w-3 h-3 rounded-sm bg-emerald-500 mr-1" /> 적당히{' '}
                  {dietStats.amountCounts.적당히}회
                </span>
                <span>
                  <span className="inline-block w-3 h-3 rounded-sm bg-red-500 mr-1" /> 많이{' '}
                  {dietStats.amountCounts.많이}회
                </span>
              </div>
            </div>

            {/* 자주 먹은 음식 Top 10 */}
            <div>
              <h4 className="text-sm font-medium mb-2">자주 먹은 음식 Top {dietStats.topFoods.length}</h4>
              <ResponsiveContainer width="100%" height={Math.max(200, dietStats.topFoods.length * 32)}>
                <BarChart
                  data={dietStats.topFoods}
                  layout="vertical"
                  margin={{ left: 40, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={80} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="적게" stackId="a" fill="#9ca3af" />
                  <Bar dataKey="적당히" stackId="a" fill="#10b981" />
                  <Bar dataKey="많이" stackId="a" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-1">
                각 음식의 누적 횟수. 색상은 섭취량 분포.
              </p>
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
