// 오늘 기록 — 수면 / 식단 / 운동 한 페이지, 한 번에 저장
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { workoutLogsApi, type LogInput } from '@/api/workout-logs';
import { exercisesApi } from '@/api/exercises';
import { sleepApi } from '@/api/sleep';
import { dietApi } from '@/api/diet';
import { Button, Card, Input, Label, Select, Textarea } from '@/components/ui';
import { todayISO } from '@/utils/format';
import { useAuth } from '@/auth/AuthContext';

interface ExerciseEntry {
  exerciseName: string;
  setCount: number | '';
  reps: number | '';
  weight: number | '';
  durationMin: number | '';
  customText: string;
}

export function DailyLogPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
    enabled: !isStudent,
  });
  const { data: library = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exercisesApi.list(),
  });

  // 대상 + 날짜 (전체 화면 공통)
  const [memberId, setMemberId] = useState<number | null>(
    isStudent ? user.memberId ?? null : null,
  );
  const [date, setDate] = useState(todayISO());

  // 수면 — 시간만
  const [sleepHours, setSleepHours] = useState<string>('');

  // 식단 — 3가지 체크
  const [breakfast, setBreakfast] = useState(false);
  const [lunch, setLunch] = useState(false);
  const [dinner, setDinner] = useState(false);

  // 운동
  const [condition, setCondition] = useState<number | ''>('');
  const [rpe, setRpe] = useState<number | ''>('');
  const [painArea, setPainArea] = useState('');
  const [note, setNote] = useState('');
  const [entries, setEntries] = useState<ExerciseEntry[]>([]);

  // 대상/날짜가 바뀌면 그날 기존 기록 불러와 채워줌
  const { data: existingSleep } = useQuery({
    queryKey: ['sleep', memberId, date],
    queryFn: () => sleepApi.byDate(memberId!, date),
    enabled: !!memberId,
  });
  const { data: existingDiet } = useQuery({
    queryKey: ['diet', memberId, date],
    queryFn: () => dietApi.byDate(memberId!, date),
    enabled: !!memberId,
  });

  useEffect(() => {
    setSleepHours(existingSleep?.hours ? String(existingSleep.hours) : '');
  }, [memberId, date, existingSleep?.id]);

  useEffect(() => {
    setBreakfast(existingDiet?.breakfast ?? false);
    setLunch(existingDiet?.lunch ?? false);
    setDinner(existingDiet?.dinner ?? false);
  }, [memberId, date, existingDiet?.id]);

  const isCardioName = (name: string) =>
    library.find((l) => l.name === name)?.bodyPart === '유산소';

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

  // 통합 저장 — 수면 + 식단 + 운동을 한 번에
  const saveAll = useMutation({
    mutationFn: async () => {
      if (!memberId) throw new Error('대상을 선택하세요');
      const tasks: Promise<unknown>[] = [];

      // 수면 — 시간 입력 있을 때만
      if (sleepHours.trim() !== '') {
        tasks.push(
          sleepApi.save({
            memberId,
            date,
            hours: Number(sleepHours),
            note: null,
          }),
        );
      }

      // 식단 — 항상 저장 (체크 안 해도 false로 저장됨)
      tasks.push(
        dietApi.save({
          memberId,
          date,
          breakfast,
          lunch,
          dinner,
          note: null,
        }),
      );

      // 운동 — 세트 있을 때만 저장
      const sets = expandToSets();
      if (sets.length > 0 || condition !== '' || rpe !== '' || painArea || note) {
        tasks.push(
          workoutLogsApi.create({
            memberId,
            date,
            condition: condition === '' ? null : Number(condition),
            rpe: rpe === '' ? null : Number(rpe),
            painArea: painArea || null,
            note: note || null,
            sets,
          }),
        );
      }

      await Promise.all(tasks);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workout-logs'] });
      qc.invalidateQueries({ queryKey: ['sleep'] });
      qc.invalidateQueries({ queryKey: ['diet'] });
      qc.invalidateQueries({ queryKey: ['attendance'] });
      // 운동 부분만 비우기 — 수면/식단은 저장된 상태 유지
      setEntries([]);
      setCondition('');
      setRpe('');
      setPainArea('');
      setNote('');
      alert('저장되었습니다');
    },
    onError: (e) => {
      alert(e instanceof Error ? e.message : '저장에 실패했습니다');
    },
  });

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
  const removeEntry = (idx: number) =>
    setEntries((curr) => curr.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">오늘 기록</h1>

      {/* 1) 대상 + 날짜 (전체 공통) */}
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
                onChange={(e) =>
                  setMemberId(e.target.value ? Number(e.target.value) : null)
                }
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
      </Card>

      {/* 2) 수면 & 식단 — 가로 한 카드 */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <h2 className="font-semibold mb-2">😴 수면</h2>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.5"
                min="0"
                max="24"
                placeholder="예: 7.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(e.target.value)}
                className="!w-32"
              />
              <span className="text-sm text-gray-500">시간</span>
            </div>
          </div>
          <div>
            <h2 className="font-semibold mb-2">🍽 식단</h2>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['아침', breakfast, setBreakfast],
                  ['점심', lunch, setLunch],
                  ['저녁', dinner, setDinner],
                ] as const
              ).map(([label, value, setter]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setter(!value)}
                  className={
                    'px-4 py-2 rounded-lg text-sm font-medium border transition ' +
                    (value
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50')
                  }
                >
                  {value ? '✓ ' : ''}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 4) 운동 */}
      <Card>
        <h2 className="font-semibold mb-3">💪 운동</h2>

        {/* 컨디션/RPE/통증 — 운동 추가 위에 */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <Label>컨디션 (1~5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={condition}
              onChange={(e) =>
                setCondition(e.target.value ? Number(e.target.value) : '')
              }
            />
          </div>
          <div>
            <Label>힘든 정도 (1~10)</Label>
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

        {/* 운동 추가 — 라이브러리 선택 + 직접 입력 같은 크기로 */}
        <ExerciseAdder library={library} onAdd={addExercise} />

        {/* 입력된 운동 목록 */}
        {entries.length === 0 ? null : (
          <div className="space-y-2 mt-4 anim-fade-in">
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-gray-500 px-2">
              <div className="col-span-4">운동</div>
              <div className="col-span-2 text-center">세트</div>
              <div className="col-span-2 text-center">횟수</div>
              <div className="col-span-3 text-center">무게(kg)</div>
              <div className="col-span-1" />
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
                        placeholder="메모: 5km 등"
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

        <div className="mt-3">
          <Label>메모</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </Card>

      {/* 5) 한 번에 저장 */}
      <div className="flex justify-end sticky bottom-4">
        <Button
          onClick={() => saveAll.mutate()}
          disabled={!memberId || saveAll.isPending}
          className="!px-6 !py-3 !text-base shadow-lg"
        >
          {saveAll.isPending ? '저장 중...' : '저장'}
        </Button>
      </div>
    </div>
  );
}

// 운동 추가 — 라이브러리 select + 직접 입력 같은 너비
function ExerciseAdder({
  library,
  onAdd,
}: {
  library: { id: number; name: string; bodyPart?: string | null }[];
  onAdd: (name: string) => void;
}) {
  const [custom, setCustom] = useState('');
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
      {library.length > 0 && (
        <div>
          <Label>라이브러리에서 선택</Label>
          <Select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                const lib = library.find((l) => l.id === Number(e.target.value));
                if (lib) onAdd(lib.name);
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
      <div>
        <Label>직접 입력</Label>
        <Input
          placeholder="운동 이름 입력 후 엔터"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim()) {
              onAdd(custom);
              setCustom('');
            }
          }}
        />
      </div>
    </div>
  );
}
