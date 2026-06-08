// 운동 기록 상세 모달 — 관리자/학생 공용
// 그날 작성한 모든 페이지를 한 화면에 (운동 + 수면 + 식단)
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge, Modal } from '@/components/ui';
import { fmtDate } from '@/utils/format';
import { sleepApi } from '@/api/sleep';
import { dietApi } from '@/api/diet';
import type { Member, WorkoutLog } from '@/types';

export function LogDetailModal({
  log,
  member,
  withMember = false,
  onClose,
}: {
  log: WorkoutLog;
  member?: Member;
  withMember?: boolean;
  onClose: () => void;
}) {
  // 그날의 수면/식단도 함께 (memberId+date 기준)
  const dayStr = log.date.slice(0, 10);
  const { data: sleep } = useQuery({
    queryKey: ['sleep', log.memberId, dayStr],
    queryFn: () => sleepApi.byDate(log.memberId, dayStr),
  });
  const { data: diet } = useQuery({
    queryKey: ['diet', log.memberId, dayStr],
    queryFn: () => dietApi.byDate(log.memberId, dayStr),
  });

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

  const title = withMember
    ? `${member?.name ?? `#${log.memberId}`} — ${fmtDate(log.date)}`
    : fmtDate(log.date);

  return (
    <Modal open onClose={onClose} title={title} size="2xl">
      <div className="space-y-4">
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
        </div>

        {log.note && (
          <div className="bg-gray-50 border-l-4 border-gray-300 px-3 py-2 text-sm text-gray-700 italic whitespace-pre-line">
            {log.note}
          </div>
        )}

        {/* 수면 */}
        {sleep && (
          <div className="border rounded-lg p-3 bg-blue-50">
            <h3 className="font-semibold mb-1 text-blue-900">😴 수면</h3>
            <p className="text-sm">
              <span className="font-medium">{sleep.hours}시간</span>
              {sleep.note && <span className="text-gray-600 italic ml-2">— {sleep.note}</span>}
            </p>
          </div>
        )}

        {/* 식단 */}
        {diet && diet.items && diet.items.length > 0 && (
          <div className="border rounded-lg p-3 bg-amber-50">
            <h3 className="font-semibold mb-2 text-amber-900">🍽 식단</h3>
            <ul className="flex flex-wrap gap-1.5">
              {diet.items.map((it) => (
                <li
                  key={it.id ?? `${it.foodName}-${it.orderIndex}`}
                  className="bg-white rounded-full px-2.5 py-1 text-xs border flex items-center gap-1"
                >
                  <span className="font-medium">{it.foodName}</span>
                  <Badge
                    color={it.amount === '많이' ? 'red' : it.amount === '적당히' ? 'green' : 'gray'}
                  >
                    {it.amount}
                  </Badge>
                </li>
              ))}
            </ul>
            {diet.note && (
              <p className="text-xs text-gray-600 italic mt-2">— {diet.note}</p>
            )}
          </div>
        )}

        {/* 운동 */}
        <h3 className="font-semibold pt-2">💪 운동</h3>
        {byExercise.length === 0 ? (
          <p className="text-sm text-gray-500">기록된 세트가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {byExercise.map((ex) => {
              const isCardio = ex.sets.some(
                (s) => (s.durationMin != null || s.customText) && s.weight == null && s.reps == null,
              );

              // 모든 세트가 동일한지 (입력한 그대로 한 줄 표시 위함)
              const firstReps = ex.sets[0]?.reps;
              const firstWeight = ex.sets[0]?.weight;
              const allSame =
                !isCardio &&
                ex.sets.every((s) => s.reps === firstReps && s.weight === firstWeight);

              return (
                <div
                  key={ex.name}
                  className="border rounded-lg px-3 py-2 bg-white flex items-center justify-between gap-3 flex-wrap"
                >
                  <span className="font-semibold">{ex.name}</span>
                  {isCardio ? (
                    <span className="text-sm text-gray-700">
                      {ex.sets.map((s, i) => (
                        <span key={s.id}>
                          {i > 0 && <span className="text-gray-400"> · </span>}
                          {s.durationMin != null && <>{s.durationMin}분</>}
                          {s.customText && (
                            <span className="text-gray-500"> {s.customText}</span>
                          )}
                        </span>
                      ))}
                    </span>
                  ) : allSame ? (
                    <span className="text-sm text-gray-700">
                      {ex.sets.length}세트
                      {firstReps != null && ` × ${firstReps}회`}
                      {firstWeight != null && ` × ${firstWeight}kg`}
                    </span>
                  ) : (
                    <span className="text-sm text-gray-700">
                      {ex.sets.map((s, i) => (
                        <span key={s.id}>
                          {i > 0 && <span className="text-gray-400"> · </span>}
                          {s.reps ?? '-'}회{s.weight != null && ` × ${s.weight}kg`}
                        </span>
                      ))}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {withMember && member && (
          <div className="pt-3 border-t">
            <a
              href={`/members/${log.memberId}`}
              className="text-sm text-indigo-600 hover:underline"
            >
              {member.name} 상세 페이지로 이동 →
            </a>
          </div>
        )}
      </div>
    </Modal>
  );
}
