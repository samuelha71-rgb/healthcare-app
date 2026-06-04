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
          <CompactExerciseList exercises={r.exercises} />
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
    <Modal open onClose={onClose} title={r.name} size="2xl">
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
        ) : hasPerExerciseWeekdays(r) ? (
          <ExercisesByWeekday routine={r} />
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {images.map((src, i) => (
                        <a
                          key={i}
                          href={src}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img loading="lazy"
                            src={src}
                            alt=""
                            className="w-full h-auto rounded border hover:opacity-80 transition"
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

// 카드 미리보기용 — 같은 요일끼리 묶어서 보여줌 (등록 순서 무관)
function CompactExerciseList({
  exercises,
}: {
  exercises: Routine['exercises'];
}) {
  // 운동이 가진 모든 요일 수집 (중복 제외, 순서 유지)
  const hasWeekdays = exercises.some((e) => e.weekdays && e.weekdays.length > 0);
  if (!hasWeekdays) {
    return (
      <ul className="text-xs space-y-0.5 text-gray-700">
        {exercises.map((ex) => (
          <li key={ex.id}>
            {ex.exercise?.bodyPart && (
              <span className="text-gray-400">[{ex.exercise.bodyPart}] </span>
            )}
            <span>{ex.exerciseName}</span>
          </li>
        ))}
      </ul>
    );
  }

  // 요일별 묶기 — 요일 미지정 운동은 "공통"
  const byDay: Record<number, typeof exercises> = {};
  const common: typeof exercises = [];
  for (const ex of exercises) {
    if (!ex.weekdays || ex.weekdays.length === 0) {
      common.push(ex);
    } else {
      for (const w of ex.weekdays) {
        (byDay[w] ??= []).push(ex);
      }
    }
  }

  return (
    <div className="text-xs space-y-1 text-gray-700">
      {WEEKDAY_LABELS.map((label, i) => {
        const list = byDay[i];
        if (!list || list.length === 0) return null;
        return (
          <div key={i}>
            <div className="text-indigo-500 font-medium">{label}</div>
            <ul className="pl-2 space-y-0.5">
              {list.map((ex) => (
                <li key={ex.id}>
                  {ex.exercise?.bodyPart && (
                    <span className="text-gray-400">[{ex.exercise.bodyPart}] </span>
                  )}
                  <span>{ex.exerciseName}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      {common.length > 0 && (
        <div>
          <div className="text-gray-500 font-medium">공통</div>
          <ul className="pl-2 space-y-0.5">
            {common.map((ex) => (
              <li key={ex.id}>
                {ex.exercise?.bodyPart && (
                  <span className="text-gray-400">[{ex.exercise.bodyPart}] </span>
                )}
                <span>{ex.exerciseName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function hasPerExerciseWeekdays(r: Routine): boolean {
  return r.exercises.some((e) => e.weekdays && e.weekdays.length > 0);
}

// 운동에 요일이 다양하게 지정된 경우 — 요일별로 그룹화하여 표시
function ExercisesByWeekday({ routine: r }: { routine: Routine }) {
  // 요일별 묶기 (요일 미지정 운동은 "전체" 그룹으로)
  const byDay: Record<number, typeof r.exercises> = {};
  const allDays: typeof r.exercises = [];
  for (const ex of r.exercises) {
    if (!ex.weekdays || ex.weekdays.length === 0) {
      allDays.push(ex);
    } else {
      for (const w of ex.weekdays) {
        (byDay[w] ??= []).push(ex);
      }
    }
  }
  return (
    <div className="space-y-5">
      {WEEKDAY_LABELS.map((label, i) => {
        const list = byDay[i];
        if (!list || list.length === 0) return null;
        return (
          <div key={i}>
            <div className="font-semibold text-indigo-700 mb-2">{label}요일</div>
            <div className="space-y-3 pl-2 border-l-2 border-indigo-100">
              {list.map((ex) => (
                <ExerciseDetail key={ex.id} ex={ex} />
              ))}
            </div>
          </div>
        );
      })}
      {allDays.length > 0 && (
        <div>
          <div className="font-semibold text-gray-600 mb-2">매일 (요일 지정 없음)</div>
          <div className="space-y-3 pl-2 border-l-2 border-gray-200">
            {allDays.map((ex) => (
              <ExerciseDetail key={ex.id} ex={ex} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExerciseDetail({ ex }: { ex: Routine['exercises'][number] }) {
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
    <div className="border-l-4 border-indigo-300 pl-3 py-1 space-y-2">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {images.map((src, i) => (
            <a
              key={i}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img loading="lazy"
                src={src}
                alt=""
                className="w-full h-auto rounded border hover:opacity-80 transition"
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
}
