import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { routinesApi, type RoutineInput } from '@/api/routines';
import { membersApi } from '@/api/members';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Textarea,
} from '@/components/ui';
import type { Routine } from '@/types';
import { WEEKDAY_LABELS } from '@/types';
import { useAuth } from '@/auth/AuthContext';

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
        <div className="space-y-4">
          {routines.map((r) => (
            <Card key={r.id}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-lg">{r.name}</h2>
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
                  {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                </div>
                {isAdmin && (
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setEditing(r)}>
                      수정
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm('루틴을 삭제할까요?')) remove.mutate(r.id);
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                )}
              </div>

              {r.instructions && (
                <div className="mt-3 text-sm">
                  <p className="font-medium text-gray-700">방법</p>
                  <p className="text-gray-600 whitespace-pre-line">{r.instructions}</p>
                </div>
              )}
              {r.cautions && (
                <div className="mt-2 text-sm">
                  <p className="font-medium text-red-700">주의사항</p>
                  <p className="text-red-600 whitespace-pre-line">{r.cautions}</p>
                </div>
              )}

              {r.exercises.length > 0 && (
                <div className="mt-3">
                  <p className="text-sm font-medium text-gray-700 mb-2">운동 목록</p>
                  <ul className="space-y-1.5">
                    {r.exercises.map((ex) => (
                      <li key={ex.id} className="text-sm border-l-2 border-indigo-200 pl-3">
                        <div className="font-medium">
                          {ex.exerciseName}
                          {ex.targetSets && (
                            <span className="text-gray-500 font-normal ml-2">
                              {ex.targetSets}세트 × {ex.targetReps ?? '-'}회
                              {ex.targetWeight ? ` @ ${ex.targetWeight}kg` : ''}
                            </span>
                          )}
                        </div>
                        {ex.instructions && (
                          <p className="text-gray-600 text-xs mt-0.5">{ex.instructions}</p>
                        )}
                        {ex.cautions && (
                          <p className="text-red-600 text-xs mt-0.5">⚠ {ex.cautions}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {r.assignments && r.assignments.length > 0 && (
                <div className="mt-4 flex items-center gap-2 flex-wrap text-sm">
                  <span className="text-gray-500">배정:</span>
                  {r.assignments.map((a) => (
                    <Badge key={a.memberId} color="green">
                      {a.member.name}
                    </Badge>
                  ))}
                </div>
              )}
              {isAdmin && r.assignments && r.assignments.length === 0 && (
                <p className="mt-4 text-xs text-gray-400">
                  배정된 학생 없음 — 수정 버튼에서 학생을 선택하세요
                </p>
              )}
            </Card>
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
  const [name, setName] = useState(routine?.name ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? []);
  const [description, setDescription] = useState(routine?.description ?? '');
  const [instructions, setInstructions] = useState(routine?.instructions ?? '');
  const [cautions, setCautions] = useState(routine?.cautions ?? '');
  const [memberIds, setMemberIds] = useState<number[]>(
    routine?.assignments?.map((a) => a.memberId) ?? [],
  );
  const [exercises, setExercises] = useState<RoutineInput['exercises']>(
    routine?.exercises.map((e) => ({
      exerciseName: e.exerciseName,
      targetSets: e.targetSets,
      targetReps: e.targetReps,
      targetWeight: e.targetWeight,
      instructions: e.instructions,
      cautions: e.cautions,
      orderIndex: e.orderIndex,
    })) ?? [],
  );

  const save = useMutation({
    mutationFn: async () => {
      const data: RoutineInput = {
        name,
        weekdays,
        description: description || null,
        instructions: instructions || null,
        cautions: cautions || null,
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
          <Label>설명</Label>
          <Input value={description ?? ''} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <Label>방법</Label>
          <Textarea
            rows={2}
            value={instructions ?? ''}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <div>
          <Label>주의사항</Label>
          <Textarea
            rows={2}
            value={cautions ?? ''}
            onChange={(e) => setCautions(e.target.value)}
          />
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
            <Label>운동 목록</Label>
            <Button
              variant="ghost"
              onClick={() =>
                setExercises([
                  ...(exercises ?? []),
                  { exerciseName: '', orderIndex: (exercises?.length ?? 0) },
                ])
              }
            >
              + 추가
            </Button>
          </div>
          <div className="space-y-2">
            {(exercises ?? []).map((ex, i) => (
              <div key={i} className="border rounded-lg p-3 space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="운동 이름"
                    value={ex.exerciseName}
                    onChange={(e) => updateEx(i, { exerciseName: e.target.value })}
                  />
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setExercises((exercises ?? []).filter((_, idx) => idx !== i))
                    }
                  >
                    ×
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    type="number"
                    placeholder="세트"
                    value={ex.targetSets ?? ''}
                    onChange={(e) =>
                      updateEx(i, { targetSets: e.target.value ? Number(e.target.value) : null })
                    }
                  />
                  <Input
                    type="number"
                    placeholder="횟수"
                    value={ex.targetReps ?? ''}
                    onChange={(e) =>
                      updateEx(i, { targetReps: e.target.value ? Number(e.target.value) : null })
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
                <Input
                  placeholder="방법 (자세, 호흡 등)"
                  value={ex.instructions ?? ''}
                  onChange={(e) => updateEx(i, { instructions: e.target.value })}
                />
                <Input
                  placeholder="주의사항"
                  value={ex.cautions ?? ''}
                  onChange={(e) => updateEx(i, { cautions: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}
