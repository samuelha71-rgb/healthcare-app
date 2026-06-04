import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membersApi } from '@/api/members';
import { workoutLogsApi } from '@/api/workout-logs';
import { inbodyApi } from '@/api/inbody';
import { statsApi } from '@/api/stats';
import { Badge, Card, EmptyState } from '@/components/ui';
import { fmtDate } from '@/utils/format';
import { MemberComparison } from '@/features/MemberComparison';
import type { Member, WorkoutLog, InbodyRecord } from '@/types';

export function DashboardPage() {
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });
  const { data: recentLogs = [] } = useQuery({
    queryKey: ['workout-logs', 'recent'],
    queryFn: () => workoutLogsApi.list({ limit: 30 }),
  });
  const { data: stats = [] } = useQuery({
    queryKey: ['stats', 'comparison'],
    queryFn: statsApi.comparison,
  });
  const { data: inbodyAll = [] } = useQuery({
    queryKey: ['inbody', 'all'],
    queryFn: () => inbodyApi.list(),
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
          <p className="text-sm text-gray-500">최근 30일 누적 기록</p>
          <p className="text-3xl font-bold mt-1">{recentLogs.length}</p>
        </Card>
      </div>

      <MemberComparison />

      <Card>
        <h2 className="font-semibold mb-3">최근 기록</h2>
        {recentLogs.length === 0 ? (
          <EmptyState
            title="아직 기록이 없습니다"
            description="오늘 기록 페이지에서 운동을 기록해보세요."
          />
        ) : (
          <ul className="divide-y">
            {recentLogs.slice(0, 10).map((log) => (
              <RecentLogItem
                key={log.id}
                log={log}
                member={members.find((m) => m.id === log.memberId)}
                stat={stats.find((s) => s.memberId === log.memberId)}
                lastInbody={findLatestInbody(inbodyAll, log.memberId)}
              />
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function findLatestInbody(records: InbodyRecord[], memberId: number) {
  return records
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
}

function RecentLogItem({
  log,
  member,
  stat,
  lastInbody,
}: {
  log: WorkoutLog;
  member?: Member;
  stat?: {
    recent7: number;
    recent30: number;
    streak: number;
    total: number;
    avgRpe: number;
  };
  lastInbody?: InbodyRecord;
}) {
  // 같은 운동을 여러 세트 하면 그루핑해서 최고/총 정보
  const byExercise = useMemo(() => {
    const m = new Map<string, { sets: number; reps: number; volume: number; topWeight: number }>();
    for (const s of log.sets) {
      const cur = m.get(s.exerciseName) ?? { sets: 0, reps: 0, volume: 0, topWeight: 0 };
      cur.sets += 1;
      cur.reps += s.reps ?? 0;
      cur.volume += (s.reps ?? 0) * (s.weight ?? 0);
      if ((s.weight ?? 0) > cur.topWeight) cur.topWeight = s.weight ?? 0;
      m.set(s.exerciseName, cur);
    }
    return Array.from(m.entries()).map(([name, v]) => ({ name, ...v }));
  }, [log.sets]);

  const totalVolume = byExercise.reduce((s, e) => s + e.volume, 0);
  const daysAgo = Math.floor((Date.now() - +new Date(log.date)) / (1000 * 60 * 60 * 24));
  const dayLabel = daysAgo === 0 ? '오늘' : daysAgo === 1 ? '어제' : `${daysAgo}일 전`;

  return (
    <li className="py-3">
      {/* 윗줄: 학생 정보 + 날짜 */}
      <div className="flex items-start justify-between flex-wrap gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/members/${log.memberId}`}
            className="font-semibold text-indigo-600 hover:underline"
          >
            {member?.name ?? `#${log.memberId}`}
          </Link>
          {member?.age && member?.gender && (
            <span className="text-xs text-gray-500">
              {member.age}세 · {member.gender === 'male' ? '남' : member.gender === 'female' ? '여' : ''}
            </span>
          )}
          {stat && (
            <>
              <Badge color="blue">출석 {stat.recent7}일/7</Badge>
              {stat.streak > 0 && <Badge color="yellow">연속 {stat.streak}일 🔥</Badge>}
              <Badge color="gray">총 {stat.total}회</Badge>
            </>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {dayLabel} · {fmtDate(log.date)}
        </div>
      </div>

      {/* 운동 컨디션 */}
      <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
        {log.condition != null && (
          <span className={getConditionClass(log.condition)}>
            컨디션 {log.condition}/5
          </span>
        )}
        {log.rpe != null && (
          <span className={getRpeClass(log.rpe)}>RPE {log.rpe}/10</span>
        )}
        {log.painArea && (
          <span className="text-red-600">⚠ {log.painArea}</span>
        )}
        {log.sets.length > 0 && (
          <span className="text-gray-500">
            {log.sets.length}세트 · 볼륨 {totalVolume.toLocaleString()}kg
          </span>
        )}
      </div>

      {/* 한 운동 요약 */}
      {byExercise.length > 0 && (
        <div className="mt-1.5 text-xs text-gray-700">
          {byExercise.slice(0, 4).map((e, i) => (
            <span key={i}>
              {i > 0 && <span className="text-gray-300"> · </span>}
              <span className="font-medium">{e.name}</span>{' '}
              <span className="text-gray-500">
                {e.sets}×{Math.round(e.reps / e.sets)}
                {e.topWeight > 0 && ` @${e.topWeight}kg`}
              </span>
            </span>
          ))}
          {byExercise.length > 4 && (
            <span className="text-gray-400"> 외 {byExercise.length - 4}개</span>
          )}
        </div>
      )}

      {/* 메모 */}
      {log.note && (
        <p className="mt-1.5 text-xs text-gray-600 italic line-clamp-2">
          “{log.note}”
        </p>
      )}

      {/* 최근 인바디 (대상 컨텍스트) */}
      {lastInbody && (
        <div className="mt-1.5 text-xs text-gray-500">
          최근 인바디 ({fmtDate(lastInbody.date)}):{' '}
          {lastInbody.weight != null && <span>체중 {lastInbody.weight}kg</span>}
          {lastInbody.bodyFat != null && <span> · 체지방 {lastInbody.bodyFat}%</span>}
          {lastInbody.muscleMass != null && <span> · 골격근 {lastInbody.muscleMass}kg</span>}
        </div>
      )}
    </li>
  );
}

function getConditionClass(c: number): string {
  if (c >= 4) return 'text-green-700 font-medium';
  if (c === 3) return 'text-gray-700';
  return 'text-orange-700 font-medium';
}
function getRpeClass(r: number): string {
  if (r >= 9) return 'text-red-700 font-medium';
  if (r >= 7) return 'text-orange-700 font-medium';
  return 'text-gray-700';
}
