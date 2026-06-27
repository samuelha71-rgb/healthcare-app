// 기록 관리 — 관리자가 학생들의 최근 운동 기록을 모아 보고 클릭하면 상세 모달
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membersApi } from '@/api/members';
import { workoutLogsApi } from '@/api/workout-logs';
import { inbodyApi } from '@/api/inbody';
import { statsApi } from '@/api/stats';
import { Badge, Card, EmptyState, Input, Select } from '@/components/ui';
import { LogDetailModal } from '@/features/LogDetailModal';
import { fmtDate } from '@/utils/format';
import type { InbodyRecord, Member, WorkoutLog } from '@/types';

export function RecordsPage() {
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ['workout-logs', 'records'],
    queryFn: () => workoutLogsApi.list({ limit: 200 }),
  });
  const { data: stats = [] } = useQuery({
    queryKey: ['stats', 'comparison'],
    queryFn: statsApi.comparison,
  });
  const { data: inbodyAll = [] } = useQuery({
    queryKey: ['inbody', 'all'],
    queryFn: () => inbodyApi.list(),
  });

  const [openLog, setOpenLog] = useState<WorkoutLog | null>(null);
  const openMember = openLog && members.find((m) => m.id === openLog.memberId);

  // 필터
  const [memberFilter, setMemberFilter] = useState<string>('');
  const [query, setQuery] = useState('');
  const [onlyReal, setOnlyReal] = useState(true);

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (onlyReal && l.sets.length === 0) return false;
      if (memberFilter && String(l.memberId) !== memberFilter) return false;
      if (query) {
        const m = members.find((mm) => mm.id === l.memberId);
        const q = query.toLowerCase();
        const inName = m?.name.toLowerCase().includes(q);
        const inEx = l.sets.some((s) => s.exerciseName.toLowerCase().includes(q));
        const inNote = l.note?.toLowerCase().includes(q);
        if (!inName && !inEx && !inNote) return false;
      }
      return true;
    });
  }, [logs, members, memberFilter, query, onlyReal]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">기록 관리</h1>
        <p className="text-sm text-gray-500">
          {filtered.length}건 표시
          {filtered.length !== logs.length && ` (전체 ${logs.length}건 중)`}
        </p>
      </div>

      {/* 필터 */}
      <Card>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs text-gray-500">학생</label>
            <Select
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            >
              <option value="">전체</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-gray-500">검색</label>
            <Input
              placeholder="학생 이름 / 운동 / 메모"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-700 pb-2">
            <input
              type="checkbox"
              checked={onlyReal}
              onChange={(e) => setOnlyReal(e.target.checked)}
            />
            실제 운동만 (빈 기록 숨김)
          </label>
        </div>
      </Card>

      <Card>
        {filtered.length === 0 ? (
          <EmptyState
            title="해당하는 기록이 없습니다"
            description="필터를 조정해보세요."
          />
        ) : (
          <ul className="divide-y">
            {filtered.map((log) => (
              <RecordRow
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
          withMember
          onClose={() => setOpenLog(null)}
        />
      )}
    </div>
  );
}

function findLatestInbody(records: InbodyRecord[], memberId: number) {
  return records
    .filter((r) => r.memberId === memberId)
    .sort((a, b) => +new Date(b.date) - +new Date(a.date))[0];
}

function RecordRow({
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
  const byExercise = useMemo(() => {
    const m = new Map<
      string,
      { sets: number; reps: number; volume: number; topWeight: number }
    >();
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
              {member.age}세 · {member.gender === 'male' ? '남' : '여'}
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

      <div className="flex items-center gap-2 mt-1.5 text-xs flex-wrap">
        {log.condition != null && (
          <span className={conditionClass(log.condition)}>
            컨디션 {log.condition}/5
          </span>
        )}
        {log.rpe != null && <span className={rpeClass(log.rpe)}>힘든 정도 {log.rpe}/10</span>}
        {log.painArea && <span className="text-red-600">⚠ {log.painArea}</span>}
        {log.sets.length > 0 && (
          <span className="text-gray-500">
            {log.sets.length}세트 · 볼륨 {totalVolume.toLocaleString()}kg
          </span>
        )}
      </div>

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

      {log.note && (
        <p className="mt-1.5 text-xs text-gray-600 italic line-clamp-2">
          “{log.note}”
        </p>
      )}

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

function conditionClass(c: number): string {
  if (c >= 4) return 'text-green-700 font-medium';
  if (c === 3) return 'text-gray-700';
  return 'text-orange-700 font-medium';
}
function rpeClass(r: number): string {
  if (r >= 9) return 'text-red-700 font-medium';
  if (r >= 7) return 'text-orange-700 font-medium';
  return 'text-gray-700';
}
