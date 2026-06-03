// 루틴 카드 + 클릭 시 상세 모달 — 관리자와 학생 화면에서 공유
import { useState, type ReactNode } from 'react';
import { Badge, Card, Modal } from '@/components/ui';
import type { Routine } from '@/types';
import { WEEKDAY_LABELS } from '@/types';

export function RoutineCard({
  routine: r,
  showAssignments = true,
  footer,
}: {
  routine: Routine;
  showAssignments?: boolean;
  footer?: ReactNode; // 관리자 액션 버튼 등
}) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <Card
        className="!p-3 flex flex-col gap-2 cursor-pointer hover:shadow-md transition"
        onClick={() => setShowDetail(true)}
      >
        <div>
          <div className="font-semibold">{r.name}</div>
          <div className="flex items-center gap-1 flex-wrap mt-1">
            {r.weekdays.length === 0 ? (
              <Badge color="gray">요일 무관</Badge>
            ) : (
              r.weekdays
                .slice()
                .sort((a, b) => a - b)
                .map((w) => (
                  <Badge key={w} color="blue">
                    {WEEKDAY_LABELS[w]}
                  </Badge>
                ))
            )}
          </div>
        </div>

        {showAssignments && r.assignments && r.assignments.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {r.assignments.map((a) => (
              <Badge key={a.memberId} color="green">
                {a.member.name}
              </Badge>
            ))}
          </div>
        )}

        {r.exercises.length > 0 && (
          <ul className="text-xs space-y-0.5 text-gray-700">
            {r.exercises.map((ex) => (
              <li key={ex.id}>
                {ex.exercise?.bodyPart && (
                  <span className="text-gray-400">[{ex.exercise.bodyPart}] </span>
                )}
                <span>{ex.exerciseName}</span>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-indigo-500 mt-auto pt-1">
          클릭하면 자세히 보기 →
        </p>

        {footer && (
          <div className="pt-2 border-t" onClick={(e) => e.stopPropagation()}>
            {footer}
          </div>
        )}
      </Card>

      {showDetail && (
        <RoutineDetailModal routine={r} onClose={() => setShowDetail(false)} />
      )}
    </>
  );
}

// 루틴 상세 — 모든 운동의 방법/주의사항/이미지
export function RoutineDetailModal({
  routine: r,
  onClose,
}: {
  routine: Routine;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={r.name}>
      <div className="space-y-4">
        <div className="flex items-center gap-1 flex-wrap">
          {r.weekdays.length === 0 ? (
            <Badge color="gray">요일 무관</Badge>
          ) : (
            r.weekdays
              .slice()
              .sort((a, b) => a - b)
              .map((w) => (
                <Badge key={w} color="blue">
                  {WEEKDAY_LABELS[w]}요일
                </Badge>
              ))
          )}
        </div>

        {r.assignments && r.assignments.length > 0 && (
          <div className="text-sm flex items-center gap-2 flex-wrap">
            <span className="text-gray-500">배정:</span>
            {r.assignments.map((a) => (
              <Badge key={a.memberId} color="green">
                {a.member.name}
              </Badge>
            ))}
          </div>
        )}

        {r.description && (
          <p className="text-sm text-gray-700 whitespace-pre-line">{r.description}</p>
        )}

        {r.exercises.length === 0 ? (
          <p className="text-sm text-gray-500">등록된 운동이 없습니다.</p>
        ) : (
          <div className="space-y-4">
            {r.exercises.map((ex) => {
              const inst = ex.exercise?.instructions ?? ex.instructions;
              const caut = ex.exercise?.cautions ?? ex.cautions;
              const reps = ex.exercise?.reps;
              const images =
                ex.exercise?.images && ex.exercise.images.length > 0
                  ? ex.exercise.images.map((i) => i.data)
                  : ex.exercise?.imageData
                    ? [ex.exercise.imageData]
                    : [];
              return (
                <div
                  key={ex.id}
                  className="border-l-4 border-indigo-300 pl-3 py-1 space-y-2"
                >
                  <div className="font-semibold">
                    {ex.exerciseName}
                    {ex.exercise?.bodyPart && (
                      <span className="text-gray-400 font-normal ml-2 text-sm">
                        [{ex.exercise.bodyPart}]
                      </span>
                    )}
                  </div>

                  {(ex.targetSets || ex.targetReps || ex.targetWeight) && (
                    <p className="text-sm text-gray-700">
                      목표:{' '}
                      {ex.targetSets && <span>{ex.targetSets}세트</span>}
                      {ex.targetReps && <span> × {ex.targetReps}회</span>}
                      {ex.targetWeight && <span> @ {ex.targetWeight}kg</span>}
                    </p>
                  )}

                  {reps && (
                    <p className="text-sm">
                      <span className="font-medium text-gray-700">권장 횟수: </span>
                      <span className="text-indigo-700">{reps}</span>
                    </p>
                  )}

                  {images.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-1">
                      {images.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-square"
                        >
                          <img
                            src={src}
                            alt=""
                            className="w-full h-full object-cover rounded border hover:opacity-80 transition"
                          />
                        </a>
                      ))}
                    </div>
                  )}

                  {inst && (
                    <div className="text-sm">
                      <p className="font-medium text-gray-700">방법</p>
                      <p className="text-gray-600 whitespace-pre-line">{inst}</p>
                    </div>
                  )}
                  {caut && (
                    <div className="text-sm">
                      <p className="font-medium text-red-700">⚠ 주의사항</p>
                      <p className="text-red-600 whitespace-pre-line">{caut}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
