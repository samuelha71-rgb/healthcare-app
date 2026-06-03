import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { routinesApi, type RoutineInput } from '@/api/routines';
import { membersApi } from '@/api/members';
import { exercisesApi } from '@/api/exercises';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
} from '@/components/ui';
import type { Routine } from '@/types';
import { WEEKDAY_LABELS } from '@/types';
import { useAuth } from '@/auth/AuthContext';
import { RoutineCard } from '@/features/RoutineCard';

export function RoutinesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: routines = [] } = useQuery({
    queryKey: ['routines'],
    queryFn: routinesApi.list,
  });
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
    enabled: isAdmin,
  });

  const [editing, setEditing] = useState<Routine | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const remove = useMutation({
    mutationFn: routinesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['routines'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{isAdmin ? '주간 루틴' : '내 루틴'}</h1>
        {isAdmin && <Button onClick={() => setShowAdd(true)}>+ 루틴 추가</Button>}
      </div>

      {routines.length === 0 ? (
        <Card>
          <EmptyState
            title={isAdmin ? '루틴이 없습니다' : '아직 배정된 루틴이 없습니다'}
            description={
              isAdmin ? '요일별 운동 프로그램을 만들어보세요.' : '관리자가 루틴을 배정해주면 여기에 표시됩니다.'
            }
            action={isAdmin ? <Button onClick={() => setShowAdd(true)}>루틴 추가</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {routines.map((r) => (
            <RoutineCard
              key={r.id}
              routine={r}
              footer={
                isAdmin ? (
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      onClick={() => setEditing(r)}
                      className="flex-1 !py-1 !text-xs"
                    >
                      수정
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm('루틴을 삭제할까요?')) remove.mutate(r.id);
                      }}
                      className="flex-1 !py-1 !text-xs"
                    >
                      삭제
                    </Button>
                  </div>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
      {showAdd && (
        <RoutineFormModal
          open
          members={members}
          onClose={() => setShowAdd(false)}
          onDone={() => qc.invalidateQueries({ queryKey: ['routines'] })}
        />
      )}
      {editing && (
        // key를 두어 다른 루틴을 편집할 때마다 폼이 새 prop으로 다시 초기화되게 함
        <RoutineFormModal
          key={editing.id}
          open
          routine={editing}
          members={members}
          onClose={() => setEditing(null)}
          onDone={() => qc.invalidateQueries({ queryKey: ['routines'] })}
        />
      )}
    </div>
  );
}

function RoutineFormModal({
  open,
  onClose,
  onDone,
  routine,
  members,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  routine?: Routine;
  members: { id: number; name: string }[];
}) {
  const { data: library = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exercisesApi.list(),
  });

  const [name, setName] = useState(routine?.name ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? []);
  const [description, setDescription] = useState(routine?.description ?? '');
  const [memberIds, setMemberIds] = useState<number[]>(
    routine?.assignments?.map((a) => a.memberId) ?? [],
  );
  const [exercises, setExercises] = useState<RoutineInput['exercises']>(
    routine?.exercises.map((e) => ({
      exerciseId: e.exerciseId ?? null,
      exerciseName: e.exerciseName,
      weekdays: e.weekdays ?? [],
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetWeight: e.targetWeight,
      orderIndex: e.orderIndex,
    })) ?? [],
  );

  const save = useMutation({
    mutationFn: async () => {
      const data: RoutineInput = {
        name,
        weekdays,
        description: description || null,
        exercises,
      };
      const saved = routine
        ? await routinesApi.update(routine.id, data)
        : await routinesApi.create(data);

      // 배정 동기화 — 추가된 학생은 assign, 제거된 학생은 unassign
      const before = new Set(routine?.assignments?.map((a) => a.memberId) ?? []);
      const after = new Set(memberIds);
      const toAdd = [...after].filter((id) => !before.has(id));
      const toRemove = [...before].filter((id) => !after.has(id));
      await Promise.all([
        ...toAdd.map((id) => routinesApi.assign(saved.id, id)),
        ...toRemove.map((id) => routinesApi.unassign(saved.id, id)),
      ]);
      return saved;
    },
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  const updateEx = (i: number, patch: Partial<NonNullable<typeof exercises>[number]>) => {
    setExercises((curr) => curr!.map((e, idx) => (idx === i ? { ...e, ...patch } : e)));
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={routine ? '루틴 수정' : '루틴 추가'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => save.mutate()} disabled={!name}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>이름 *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>요일 (복수 선택 가능)</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((w, i) => {
              const checked = weekdays.includes(i);
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() =>
                    setWeekdays((curr) =>
                      checked ? curr.filter((d) => d !== i) : [...curr, i],
                    )
                  }
                  className={
                    'px-3 py-1.5 rounded-lg text-sm font-medium border transition ' +
                    (checked
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
                  }
                >
                  {w}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            아무것도 선택 안 하면 "요일 무관"으로 저장됩니다.
          </p>
        </div>
        <div>
          <Label>설명 (선택)</Label>
          <Input value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div>
          <Label>이 루틴을 받을 학생 (복수 선택)</Label>
          {members.length === 0 ? (
            <p className="text-xs text-gray-500">
              등록된 학생이 없습니다. 먼저 대상 메뉴에서 학생을 추가하세요.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {members.map((m) => {
                const checked = memberIds.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() =>
                      setMemberIds((curr) =>
                        checked ? curr.filter((id) => id !== m.id) : [...curr, m.id],
                      )
                    }
                    className={
                      'px-3 py-1.5 rounded-lg text-sm font-medium border transition ' +
                      (checked
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
                    }
                  >
                    {m.name}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            선택한 학생의 페이지에 이 루틴이 자동으로 표시됩니다.
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label>운동 목록 (라이브러리에서 선택)</Label>
            <Button
              variant="ghost"
              onClick={() =>
                setExercises([
                  ...(exercises ?? []),
                  {
                    exerciseId: null,
                    exerciseName: '',
                    weekdays: [],
                    orderIndex: exercises?.length ?? 0,
                  },
                ])
              }
              disabled={library.length === 0}
            >
              + 추가
            </Button>
          </div>
          {library.length === 0 ? (
            <p className="text-sm text-gray-500">
              먼저 "운동 라이브러리" 메뉴에서 운동을 등록하세요. 방법/주의사항은 거기서
              관리되어 자동으로 표시됩니다.
            </p>
          ) : (
            <div className="space-y-2">
              {(exercises ?? []).map((ex, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2">
                  <div className="flex gap-2">
                    <Select
                      value={ex.exerciseId ?? ''}
                      onChange={(e) => {
                        const id = e.target.value ? Number(e.target.value) : null;
                        const lib = library.find((l) => l.id === id);
                        updateEx(i, {
                          exerciseId: id,
                          exerciseName: lib?.name ?? ex.exerciseName,
                        });
                      }}
                    >
                      <option value="">운동 선택</option>
                      {library.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.bodyPart ? `[${l.bodyPart}] ` : ''}
                          {l.name}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="ghost"
                      onClick={() =>
                        setExercises((exercises ?? []).filter((_, idx) => idx !== i))
                      }
                    >
                      ×
                    </Button>
                  </div>

                  {/* 이 운동을 할 요일 — 비우면 루틴의 모든 요일에 적용 */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      요일 (비우면 루틴 요일 전체)
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {WEEKDAY_LABELS.map((w, di) => {
                        const checked = (ex.weekdays ?? []).includes(di);
                        return (
                          <button
                            key={di}
                            type="button"
                            onClick={() => {
                              const curr = ex.weekdays ?? [];
                              updateEx(i, {
                                weekdays: checked
                                  ? curr.filter((d) => d !== di)
                                  : [...curr, di],
                              });
                            }}
                            className={
                              'px-2 py-1 rounded text-xs font-medium border transition ' +
                              (checked
                                ? 'bg-indigo-600 border-indigo-600 text-white'
                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
                            }
                          >
                            {w}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      placeholder="세트"
                      value={ex.targetSets ?? ''}
                      onChange={(e) =>
                        updateEx(i, {
                          targetSets: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                    <Input
                      type="number"
                      placeholder="횟수"
                      value={ex.targetReps ?? ''}
                      onChange={(e) =>
                        updateEx(i, {
                          targetReps: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                    <Input
                      type="number"
                      step="0.5"
                      placeholder="무게(kg)"
                      value={ex.targetWeight ?? ''}
                      onChange={(e) =>
                        updateEx(i, {
                          targetWeight: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

