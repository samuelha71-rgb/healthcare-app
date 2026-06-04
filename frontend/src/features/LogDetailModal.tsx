// 운동 기록 상세 모달 — 관리자/학생 공용
// withMember=true 면 학생 이름/날짜를 타이틀에 표시 (관리자 화면용)
import { useMemo } from 'react';
import { Badge, Modal } from '@/components/ui';
import { fmtDate } from '@/utils/format';
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
          <Badge color="gray">{log.sets.length}세트</Badge>
          {totalVolume > 0 && (
            <Badge color="gray">총 볼륨 {totalVolume.toLocaleString()}kg</Badge>
          )}
        </div>

        {log.note && (
          <div className="bg-gray-50 border-l-4 border-gray-300 px-3 py-2 text-sm text-gray-700 italic whitespace-pre-line">
            {log.note}
          </div>
        )}

        {byExercise.length === 0 ? (
          <p className="text-sm text-gray-500">기록된 세트가 없습니다.</p>
        ) : (
          <div className="space-y-3">
            {byExercise.map((ex) => (
              <div key={ex.name} className="border rounded-lg p-3 bg-white">
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
