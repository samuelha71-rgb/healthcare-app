import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { workoutLogsApi, type LogInput } from '@/api/workout-logs';
import { routinesApi } from '@/api/routines';
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
          <Button
            variant="secondary"
            onClick={() =>
              setSets([
                ...sets,
                { exerciseName: '', setNumber: sets.length + 1, weight: null, reps: null },
              ])
            }
          >
            + 세트 추가
          </Button>
        </div>
        {sets.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            루틴을 불러오거나 + 버튼으로 세트를 추가하세요.
          </p>
        ) : (
          <div className="space-y-2">
            {sets.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <Input
                  className="col-span-5"
                  placeholder="운동 이름"
                  value={s.exerciseName}
                  onChange={(e) => updateSet(i, { exerciseName: e.target.value })}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  placeholder="세트"
                  value={s.setNumber}
                  onChange={(e) => updateSet(i, { setNumber: Number(e.target.value) })}
                />
                <Input
                  className="col-span-2"
                  type="number"
                  step="0.5"
                  placeholder="무게"
                  value={s.weight ?? ''}
                  onChange={(e) =>
                    updateSet(i, { weight: e.target.value ? Number(e.target.value) : null })
                  }
                />
                <Input
                  className="col-span-2"
                  type="number"
                  placeholder="횟수"
                  value={s.reps ?? ''}
                  onChange={(e) =>
                    updateSet(i, { reps: e.target.value ? Number(e.target.value) : null })
                  }
                />
                <Button
                  variant="ghost"
                  className="col-span-1"
                  onClick={() => setSets(sets.filter((_, idx) => idx !== i))}
                >
                  ×
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
