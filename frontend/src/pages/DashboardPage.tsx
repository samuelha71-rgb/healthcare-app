import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membersApi } from '@/api/members';
import { workoutLogsApi } from '@/api/workout-logs';
import { inbodyApi } from '@/api/inbody';
import { statsApi } from '@/api/stats';
import { Badge, Card, EmptyState, Modal } from '@/components/ui';
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

  const [openLog, setOpenLog] = useState<WorkoutLog | null>(null);
  const openMember = openLog && members.find((m) => m.id === openLog.memberId);

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
                onClick={() => setOpenLog(log)}
              />
            ))}
          </ul>
        )}
      </Card>

      {openLog && (
        <LogDetailModal
          log={openLog}
          member={openMember ?? undefined}
          onClose={() => setOpenLog(null)}
        />
      )}
    </div>
  );
}

// 한 운동 기록 전체 보기 — 운동별 세트 전부 + 메타 정보
function LogDetailModal({
  log,
  member,
  onClose,
}: {
  log: WorkoutLog;
  member?: Member;
  onClose: () => void;
}) {
  // 운동별로 세트 그루핑
  const byExercise = useMemo(() => {
    const m = new Map<string, typeof log.sets>();
    for (const s of log.sets) {
      const cur = m.get(s.exerciseName) ?? [];
      cur.push(s);
      m.set(s.exerciseName, cur);
    }
    return Array.from(m.entries()).map(([name, sets]) => ({
      name,
      sets: sets.slice().sort((a, b) => a.setNumber - b.setNumber),
      totalVolume: sets.reduce((sum, s) => sum + (s.reps ?? 0) * (s.weight ?? 0), 0),
    }));
  }, [log.sets]);

  const totalVolume = byExercise.reduce((s, e) => s + e.totalVolume, 0);
  const title = `${member?.name ?? `#${log.memberId}`} — ${fmtDate(log.date)}`;

  return (
    <Modal open onClose={onClose} title={title} size="2xl">
      <div className="space-y-4">
        {/* 메타 컨디션 */}
        <div className="flex flex-wrap gap-2 text-sm">
          {log.condition != null && (
            <Badge color="blue">컨디션 {log.condition}/5</Badge>
          )}
          {log.rpe != null && (
            <Badge color={log.rpe >= 9 ? 'red' : log.rpe >= 7 ? 'yellow' : 'gray'}>
              RPE {log.rpe}/10
            </Badge>
          )}
          {log.painArea && <Badge color="red">⚠ 통증: {log.painArea}</Badge>}
          <Badge color="gray">{log.sets.length}세트</Badge>
          {totalVolume > 0 && (
            <Badge color="gray">총 볼륨 {totalVolume.toLocaleString()}kg</Badge>
          )}
        </div>

        {/* 메모 */}
        {log.note && (
          <div className="bg-gray-50 border-l-4 border-gray-300 px-3 py-2 text-sm text-gray-700 italic whitespace-pre-line">
            {log.note}
          </div>
        )}

        {/* 운동별 세트 상세 */}
        {byExercise.length === 0 ? (
          <p className="text-sm text-gray-500">기록된 세트가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {byExercise.map((ex) => (
              <div
                key={ex.name}
                className="border rounded-lg p-3 bg-white"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{ex.name}</h3>
                  <span className="text-xs text-gray-500">
                    {ex.sets.length}세트
                    {ex.totalVolume > 0 && ` · 볼륨 ${ex.totalVolume.toLocaleString()}kg`}
                  </span>
                </div>
                <table className="w-full text-sm mt-2">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-1.5 w-12">세트</th>
                      <th className="py-1.5">횟수</th>
                      <th className="py-1.5">무게(kg)</th>
                      <th className="py-1.5">볼륨</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ex.sets.map((s) => (
                      <tr key={s.id} className="border-b last:border-0">
                        <td className="py-1.5 font-medium">{s.setNumber}</td>
                        <td className="py-1.5">{s.reps ?? '-'}</td>
                        <td className="py-1.5">{s.weight ?? '-'}</td>
                        <td className="py-1.5 text-gray-500">
                          {s.reps != null && s.weight != null
                            ? `${(s.reps * s.weight).toLocaleString()}kg`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        {/* 학생 페이지로 이동 */}
        <div className="pt-3 border-t">
          <a
            href={`/members/${log.memberId}`}
            className="text-sm text-indigo-600 hover:underline"
          >
            {member?.name ?? '학생'} 상세 페이지로 이동 →
          </a>
        </div>
      </div>
    </Modal>
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
  onClick,
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
  onClick: () => void;
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
    <li
      className="py-3 cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded transition"
      onClick={onClick}
    >
      {/* 윗줄: 학생 정보 + 날짜 */}
      <div className="flex items-start justify-between flex-wrap gap-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/members/${log.memberId}`}
            onClick={(e) => e.stopPropagation()}
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
