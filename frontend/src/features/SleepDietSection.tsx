// 오늘 수면 & 식단 기록 — DailyLogPage의 상단 섹션
import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { sleepApi } from '@/api/sleep';
import { dietApi } from '@/api/diet';
import { Badge, Button, Card, Input, Label, Select, Textarea } from '@/components/ui';
import { COMMON_FOODS, DIET_AMOUNTS, type DietAmount, type DietItem } from '@/types';

export function SleepDietSection({
  memberId,
  date,
  onDateChange,
  isStudent,
  students,
  studentName,
}: {
  memberId: number | null;
  date: string;
  onDateChange: (d: string) => void;
  isStudent: boolean;
  students: { id: number; name: string }[];
  studentName?: string;
}) {
  return (
    <Card>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <Label>대상</Label>
          {isStudent ? (
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm">
              {studentName} (본인)
            </div>
          ) : (
            <div className="px-3 py-2 bg-gray-50 rounded-lg text-sm">
              {memberId
                ? students.find((s) => s.id === memberId)?.name ?? '-'
                : '아래에서 대상을 먼저 선택하세요'}
            </div>
          )}
        </div>
        <div>
          <Label>날짜</Label>
          <Input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} />
        </div>
      </div>

      {memberId ? (
        <div className="space-y-6">
          <SleepBlock memberId={memberId} date={date} />
          <hr />
          <DietBlock memberId={memberId} date={date} />
        </div>
      ) : (
        <p className="text-sm text-gray-500">대상을 선택하면 수면·식단을 기록할 수 있어요.</p>
      )}
    </Card>
  );
}

function SleepBlock({ memberId, date }: { memberId: number; date: string }) {
  const qc = useQueryClient();
  const { data: existing } = useQuery({
    queryKey: ['sleep', memberId, date],
    queryFn: () => sleepApi.byDate(memberId, date),
  });

  const [hours, setHours] = useState<string>('');
  const [note, setNote] = useState('');

  useEffect(() => {
    setHours(existing?.hours ? String(existing.hours) : '');
    setNote(existing?.note ?? '');
  }, [existing?.id, existing?.hours, existing?.note]);

  const save = useMutation({
    mutationFn: () =>
      sleepApi.save({
        memberId,
        date,
        hours: Number(hours),
        note: note || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sleep'] });
      alert('수면 기록 저장됨');
    },
  });

  return (
    <div>
      <h3 className="font-semibold mb-2">😴 수면</h3>
      <div className="grid grid-cols-3 gap-2">
        <div className="col-span-1">
          <Label>몇 시간 잤어요?</Label>
          <Input
            type="number"
            step="0.5"
            min="0"
            max="24"
            placeholder="예: 7.5"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
        </div>
        <div className="col-span-2">
          <Label>메모 (선택)</Label>
          <Input
            placeholder="예: 늦게 잤어요, 깊게 못 잠 등"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      <div className="mt-3">
        <Button onClick={() => save.mutate()} disabled={!hours || save.isPending}>
          {save.isPending ? '저장 중...' : existing ? '수면 기록 수정' : '수면 기록 저장'}
        </Button>
      </div>
    </div>
  );
}

function DietBlock({ memberId, date }: { memberId: number; date: string }) {
  const qc = useQueryClient();
  const { data: existing } = useQuery({
    queryKey: ['diet', memberId, date],
    queryFn: () => dietApi.byDate(memberId, date),
  });

  const [items, setItems] = useState<DietItem[]>([]);
  const [note, setNote] = useState('');
  const [foodName, setFoodName] = useState('');
  const [amount, setAmount] = useState<DietAmount>('적당히');

  useEffect(() => {
    setItems(
      existing?.items?.map((it) => ({
        foodName: it.foodName,
        amount: it.amount,
        orderIndex: it.orderIndex,
      })) ?? [],
    );
    setNote(existing?.note ?? '');
  }, [existing?.id]);

  const addItem = (name: string, amt: DietAmount = amount) => {
    if (!name.trim()) return;
    setItems((curr) => [...curr, { foodName: name.trim(), amount: amt }]);
    setFoodName('');
  };

  const save = useMutation({
    mutationFn: () =>
      dietApi.save({
        memberId,
        date,
        note: note || null,
        items: items.map((it, i) => ({ ...it, orderIndex: i })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['diet'] });
      alert('식단 기록 저장됨');
    },
  });

  return (
    <div>
      <h3 className="font-semibold mb-2">🍽 식단</h3>

      {/* 빠른 추가 — 자주 먹는 음식 버튼 */}
      <div className="mb-3">
        <Label>빠른 추가 (자주 먹는 음식)</Label>
        <div className="flex flex-wrap gap-1">
          {COMMON_FOODS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => addItem(f)}
              className="px-2 py-1 text-xs rounded-full bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 transition"
            >
              + {f}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-1">
          버튼을 누르면 위 선택한 양({amount})으로 추가됩니다.
        </p>
      </div>

      {/* 직접 입력 */}
      <div className="grid grid-cols-5 gap-2 items-end">
        <div className="col-span-2">
          <Label>음식 이름</Label>
          <Input
            placeholder="예: 김치찌개, 닭가슴살"
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem(foodName)}
          />
        </div>
        <div className="col-span-2">
          <Label>양</Label>
          <Select value={amount} onChange={(e) => setAmount(e.target.value as DietAmount)}>
            {DIET_AMOUNTS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Button onClick={() => addItem(foodName)} disabled={!foodName}>
            추가
          </Button>
        </div>
      </div>

      {/* 추가된 항목 */}
      {items.length > 0 && (
        <ul className="mt-4 space-y-1">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{it.foodName}</span>
                <Badge color={it.amount === '많이' ? 'red' : it.amount === '적당히' ? 'green' : 'gray'}>
                  {it.amount}
                </Badge>
              </div>
              <button
                type="button"
                onClick={() => setItems(items.filter((_, idx) => idx !== i))}
                className="text-gray-400 hover:text-red-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3">
        <Label>메모 (선택)</Label>
        <Textarea
          rows={2}
          placeholder="예: 간식이 많았음, 밤늦게 야식 등"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      <div className="mt-3">
        <Button onClick={() => save.mutate()} disabled={items.length === 0 || save.isPending}>
          {save.isPending ? '저장 중...' : existing ? '식단 기록 수정' : '식단 기록 저장'}
        </Button>
      </div>
    </div>
  );
}
