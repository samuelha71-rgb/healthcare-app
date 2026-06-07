import { useState } from 'react';
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

  // 한 줄에 운동 하나 — 세트/횟수/무게를 한꺼번에 입력
  interface ExerciseEntry {
    exerciseName: string;
    setCount: number | '';
    reps: number | '';
    weight: number | '';
    durationMin: number | ''; // 유산소
    customText: string; // 유산소 메모
  }
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);

  const isCardioName = (name: string) =>
    library.find((l) => l.name === name)?.bodyPart === '유산소';

  // 입력된 운동을 저장용 sets[]로 펼치기
  const expandToSets = (): NonNullable<LogInput['sets']> => {
    const out: NonNullable<LogInput['sets']> = [];
    for (const e of entries) {
      if (!e.exerciseName.trim()) continue;
      if (isCardioName(e.exerciseName)) {
        out.push({
          exerciseName: e.exerciseName.trim(),
          setNumber: 1,
          weight: null,
          reps: null,
          durationMin: e.durationMin === '' ? null : Number(e.durationMin),
          customText: e.customText || null,
        });
      } else {
        const count = e.setCount === '' ? 1 : Number(e.setCount);
        for (let i = 1; i <= count; i++) {
          out.push({
            exerciseName: e.exerciseName.trim(),
            setNumber: i,
            weight: e.weight === '' ? null : Number(e.weight),
            reps: e.reps === '' ? null : Number(e.reps),
          });
        }
      }
    }
    return out;
  };

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
        sets: expandToSets(),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-logs'] });
      // 폼 초기화
      setEntries([]);
      setNote('');
      setPainArea('');
      setCondition('');
      setRpe('');
      alert('저장되었습니다');
    },
  });

  // 루틴 자동 채우기 — 한 운동당 한 줄
  const fillFromRoutine = (routineId: number) => {
    const r = routines.find((rt) => rt.id === routineId);
    if (!r) return;
    const newEntries: ExerciseEntry[] = r.exercises.map((ex) => ({
      exerciseName: ex.exerciseName,
      setCount: ex.targetSets ?? '',
      reps: ex.targetReps ?? '',
      weight: ex.targetWeight ?? '',
      durationMin: '',
      customText: '',
    }));
    setEntries(newEntries);
  };

  const updateEntry = (idx: number, patch: Partial<ExerciseEntry>) => {
    setEntries((curr) => curr.map((e, i) => (i === idx ? { ...e, ...patch } : e)));
  };

  const addExercise = (name: string) => {
    if (!name.trim()) return;
    setEntries((curr) => [
      ...curr,
      {
        exerciseName: name.trim(),
        setCount: '',
        reps: '',
        weight: '',
        durationMin: '',
        customText: '',
      },
    ]);
  };

  const removeEntry = (idx: number) => {
    setEntries((curr) => curr.filter((_, i) => i !== idx));
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
          <h2 className="font-semibold">운동 기록</h2>
        </div>

        {/* 운동 추가 — 라이브러리 select 또는 직접 입력 */}
        <ExerciseAdder library={library} onAdd={addExercise} />

        {entries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            위 "루틴 불러오기"로 자동 채우거나, 위에서 운동을 하나씩 추가하세요.
          </p>
        ) : (
          <div className="space-y-2 mt-4 anim-fade-in">
            {/* 테이블 헤더 */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-500 px-2">
              <div className="col-span-4">운동</div>
              <div className="col-span-2 text-center">세트</div>
              <div className="col-span-2 text-center">횟수</div>
              <div className="col-span-3 text-center">무게(kg)</div>
              <div className="col-span-1"></div>
            </div>
            {entries.map((entry, idx) => {
              const cardio = isCardioName(entry.exerciseName);
              return (
                <div
                  key={idx}
                  className="grid grid-cols-12 gap-2 items-center border rounded-lg p-2 bg-gray-50/30"
                >
                  <Input
                    className="col-span-12 sm:col-span-4"
                    placeholder="운동 이름"
                    value={entry.exerciseName}
                    onChange={(e) =>
                      updateEntry(idx, { exerciseName: e.target.value })
                    }
                  />
                  {cardio ? (
                    <>
                      <Input
                        className="col-span-6 sm:col-span-3"
                        type="number"
                        step="0.5"
                        placeholder="시간(분)"
                        value={entry.durationMin}
                        onChange={(e) =>
                          updateEntry(idx, {
                            durationMin: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                      />
                      <Input
                        className="col-span-5 sm:col-span-4"
                        placeholder="메모: 5km, 페이스 6분 등"
                        value={entry.customText}
                        onChange={(e) =>
                          updateEntry(idx, { customText: e.target.value })
                        }
                      />
                    </>
                  ) : (
                    <>
                      <Input
                        className="col-span-4 sm:col-span-2"
                        type="number"
                        placeholder="세트"
                        value={entry.setCount}
                        onChange={(e) =>
                          updateEntry(idx, {
                            setCount: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                      />
                      <Input
                        className="col-span-4 sm:col-span-2"
                        type="number"
                        placeholder="횟수"
                        value={entry.reps}
                        onChange={(e) =>
                          updateEntry(idx, {
                            reps: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                      />
                      <Input
                        className="col-span-3 sm:col-span-3"
                        type="number"
                        step="0.5"
                        placeholder="무게"
                        value={entry.weight}
                        onChange={(e) =>
                          updateEntry(idx, {
                            weight: e.target.value ? Number(e.target.value) : '',
                          })
                        }
                      />
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeEntry(idx)}
                    className="col-span-1 text-gray-400 hover:text-red-600 text-center"
                    title="삭제"
                  >
                    ×
                  </button>
                </div>
              );
            })}
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
