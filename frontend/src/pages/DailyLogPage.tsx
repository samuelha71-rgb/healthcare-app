import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { workoutLogsApi, type LogInput } from '@/api/workout-logs';
import { routinesApi } from '@/api/routines';
import { exercisesApi } from '@/api/exercises';
import { Button, Card, Input, Label, Select, Textarea } from '@/components/ui';
import { todayISO } from '@/utils/format';
import { useAuth } from '@/auth/AuthContext';
import { SleepDietSection } from '@/features/SleepDietSection';

export function DailyLogPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
    enabled: !isStudent, // 학생은 다른 사람 목록 조회 불가
  });
  const { data: routines = [] } = useQuery({
    queryKey: ['routines'],
    queryFn: routinesApi.list,
  });
  const { data: library = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exercisesApi.list(),
  });

  const [memberId, setMemberId] = useState<number | null>(
    isStudent ? user.memberId ?? null : null,
  );
  const [date, setDate] = useState(todayISO());
  const [condition, setCondition] = useState<number | ''>('');
  const [rpe, setRpe] = useState<number | ''>('');
  const [painArea, setPainArea] = useState('');
  const [note, setNote] = useState('');
  const [sets, setSets] = useState<NonNullable<LogInput['sets']>>([]);

  const create = useMutation({
    mutationFn: () => {
      if (!memberId) throw new Error('대상을 선택하세요');
      return workoutLogsApi.create({
        memberId,
        date,
        condition: condition === '' ? null : Number(condition),
        rpe: rpe === '' ? null : Number(rpe),
        painArea: painArea || null,
        note: note || null,
        sets,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-logs'] });
      // 폼 초기화
      setSets([]);
      setNote('');
      setPainArea('');
      setCondition('');
      setRpe('');
      alert('저장되었습니다');
    },
  });

  // 선택된 대상에게 배정된 루틴 → 해당 운동 자동 채워주기
  const fillFromRoutine = (routineId: number) => {
    const r = routines.find((rt) => rt.id === routineId);
    if (!r) return;
    const newSets: NonNullable<LogInput['sets']> = [];
    r.exercises.forEach((ex) => {
      const cnt = ex.targetSets ?? 3;
      for (let i = 1; i <= cnt; i++) {
        newSets.push({
          exerciseName: ex.exerciseName,
          setNumber: i,
          weight: ex.targetWeight ?? null,
          reps: ex.targetReps ?? null,
        });
      }
    });
    setSets(newSets);
  };

  const updateSet = (idx: number, patch: Partial<NonNullable<LogInput['sets']>[number]>) => {
    setSets((curr) => curr.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  // 운동별로 묶고 원본 index 추적 (업데이트/삭제에 사용)
  const grouped = useMemo(() => {
    const order: string[] = [];
    const map: Record<string, { idx: number; set: (typeof sets)[number] }[]> = {};
    sets.forEach((s, idx) => {
      const key = s.exerciseName || '(이름 없음)';
      if (!(key in map)) {
        map[key] = [];
        order.push(key);
      }
      map[key].push({ idx, set: s });
    });
    return order.map((name) => ({ name, items: map[name] }));
  }, [sets]);

  const addExercise = (name: string) => {
    if (!name.trim()) return;
    setSets((curr) => [
      ...curr,
      { exerciseName: name.trim(), setNumber: 1, weight: null, reps: null },
    ]);
  };

  const addSetTo = (exerciseName: string) => {
    setSets((curr) => {
      const existingForExercise = curr.filter((s) => s.exerciseName === exerciseName);
      const nextSetNumber = existingForExercise.length + 1;
      return [
        ...curr,
        { exerciseName, setNumber: nextSetNumber, weight: null, reps: null },
      ];
    });
  };

  const removeExercise = (exerciseName: string) => {
    setSets((curr) => curr.filter((s) => s.exerciseName !== exerciseName));
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* 수면 & 식단 — 운동 기록보다 먼저 */}
      <section className="space-y-3">
        <h1 className="text-2xl font-bold">오늘 수면 & 식단 기록</h1>
        <SleepDietSection
          memberId={memberId}
          date={date}
          onDateChange={setDate}
          isStudent={isStudent}
          students={members}
          studentName={user?.name}
        />
      </section>

      <section className="space-y-3">
        <h1 className="text-2xl font-bold">오늘 운동 기록</h1>
      </section>

      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>대상 *</Label>
            {isStudent ? (
              <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm">
                {user?.name} (본인)
              </div>
            ) : (
              <Select
                value={memberId ?? ''}
                onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">선택</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <div>
            <Label>날짜</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>

        {routines.length > 0 && (
          <div className="mt-3">
            <Label>루틴 불러오기 (선택)</Label>
            <Select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  fillFromRoutine(Number(e.target.value));
                  e.target.value = '';
                }
              }}
            >
              <option value="">루틴을 선택해 운동을 자동 채우기</option>
              {routines.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </Select>
          </div>
        )}
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">컨디션 / 강도</h2>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>컨디션 (1~5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={condition}
              onChange={(e) => setCondition(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <Label>RPE 강도 (1~10)</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={rpe}
              onChange={(e) => setRpe(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div>
            <Label>통증 부위</Label>
            <Input value={painArea} onChange={(e) => setPainArea(e.target.value)} />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">세트 기록</h2>
        </div>

        {/* 운동 추가 — 라이브러리 select 또는 직접 입력 */}
        <ExerciseAdder library={library} onAdd={addExercise} />

        {grouped.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            위 "루틴 불러오기"로 자동 채우거나, 위에서 운동을 하나씩 추가하세요.
          </p>
        ) : (
          <div className="space-y-4 mt-4 anim-fade-in">
            {grouped.map((g) => (
              <div
                key={g.name}
                className="border rounded-lg p-3 bg-gray-50/50"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-indigo-700">{g.name}</h3>
                  <button
                    type="button"
                    onClick={() => removeExercise(g.name)}
                    className="text-xs text-gray-400 hover:text-red-600"
                  >
                    운동 삭제
                  </button>
                </div>
                <div className="space-y-1.5">
                  {g.items.map(({ idx, set }, i) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="w-12 shrink-0 text-gray-600 font-medium">
                        세트 {i + 1}
                      </span>
                      <Input
                        type="number"
                        step="0.5"
                        placeholder="무게(kg)"
                        value={set.weight ?? ''}
                        onChange={(e) =>
                          updateSet(idx, {
                            weight: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      <span className="text-gray-400">×</span>
                      <Input
                        type="number"
                        placeholder="횟수"
                        value={set.reps ?? ''}
                        onChange={(e) =>
                          updateSet(idx, {
                            reps: e.target.value ? Number(e.target.value) : null,
                          })
                        }
                      />
                      <span className="text-gray-500 text-xs shrink-0">회</span>
                      <button
                        type="button"
                        onClick={() => setSets(sets.filter((_, k) => k !== idx))}
                        className="text-gray-400 hover:text-red-600 px-1"
                        title="이 세트 삭제"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  onClick={() => addSetTo(g.name)}
                  className="mt-2 !text-xs"
                >
                  + 세트 추가
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <Label>메모</Label>
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={() => create.mutate()}
          disabled={!memberId || create.isPending}
        >
          {create.isPending ? '저장 중...' : '기록 저장'}
        </Button>
      </div>
    </div>
  );
}

// 운동 추가 — 라이브러리 select + 직접 입력 둘 다 지원
function ExerciseAdder({
  library,
  onAdd,
}: {
  library: { id: number; name: string; bodyPart?: string | null }[];
  onAdd: (name: string) => void;
}) {
  const [custom, setCustom] = useState('');
  return (
    <div className="flex flex-wrap gap-2 items-end">
      {library.length > 0 && (
        <div className="flex-1 min-w-[200px]">
          <Label>라이브러리에서 선택</Label>
          <Select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                const lib = library.find((l) => l.id === Number(e.target.value));
                if (lib) onAdd(lib.name);
                e.target.value = '';
              }
            }}
          >
            <option value="">운동 선택해서 추가</option>
            {library.map((l) => (
              <option key={l.id} value={l.id}>
                {l.bodyPart ? `[${l.bodyPart}] ` : ''}
                {l.name}
              </option>
            ))}
          </Select>
        </div>
      )}
      <div className="flex-1 min-w-[200px]">
        <Label>또는 직접 입력</Label>
        <div className="flex gap-1">
          <Input
            placeholder="운동 이름"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onAdd(custom);
                setCustom('');
              }
            }}
          />
          <Button
            onClick={() => {
              onAdd(custom);
              setCustom('');
            }}
            disabled={!custom.trim()}
          >
            추가
          </Button>
        </div>
      </div>
    </div>
  );
}
