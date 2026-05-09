import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { goalsApi } from '@/api/goals';
import { Badge, Button, Card, EmptyState, Input, Label, Modal, Select } from '@/components/ui';
import type { Goal } from '@/types';
import { fmtDate } from '@/utils/format';

const TYPE_LABELS: Record<Goal['type'], string> = {
  weight: '체중',
  bodyFat: '체지방',
  muscleMass: '골격근',
  lift: '기록(무게)',
  custom: '기타',
};

export function GoalsSection({ memberId }: { memberId: number }) {
  const qc = useQueryClient();
  const { data: goals = [] } = useQuery({
    queryKey: ['goals', memberId],
    queryFn: () => goalsApi.list(memberId),
  });
  const [showAdd, setShowAdd] = useState(false);

  const toggle = useMutation({
    mutationFn: (g: Goal) => goalsApi.update(g.id, { achieved: !g.achieved }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', memberId] }),
  });
  const remove = useMutation({
    mutationFn: goalsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', memberId] }),
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">목표</h2>
        <Button onClick={() => setShowAdd(true)}>+ 목표 추가</Button>
      </div>

      {goals.length === 0 ? (
        <EmptyState title="아직 목표가 없습니다" />
      ) : (
        <ul className="divide-y">
          {goals.map((g) => {
            const progress =
              g.targetValue && g.currentValue
                ? Math.min(100, Math.round((g.currentValue / g.targetValue) * 100))
                : null;
            return (
              <li key={g.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge color={g.achieved ? 'green' : 'blue'}>
                        {TYPE_LABELS[g.type]}
                      </Badge>
                      <span className="font-medium">{g.description}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {g.currentValue ?? '-'} / {g.targetValue ?? '-'}
                      {g.deadline && ` · 마감 ${fmtDate(g.deadline)}`}
                    </div>
                    {progress !== null && (
                      <div className="w-48 h-1.5 bg-gray-200 rounded mt-2 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" onClick={() => toggle.mutate(g)}>
                      {g.achieved ? '되돌리기' : '달성'}
                    </Button>
                    <Button variant="ghost" onClick={() => remove.mutate(g.id)}>
                      삭제
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <GoalFormModal memberId={memberId} open={showAdd} onClose={() => setShowAdd(false)} />
    </Card>
  );
}

function GoalFormModal({
  memberId,
  open,
  onClose,
}: {
  memberId: number;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [type, setType] = useState<Goal['type']>('weight');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState('');
  const [current, setCurrent] = useState('');
  const [deadline, setDeadline] = useState('');

  const create = useMutation({
    mutationFn: () =>
      goalsApi.create({
        memberId,
        type,
        description,
        targetValue: target ? Number(target) : null,
        currentValue: current ? Number(current) : null,
        deadline: deadline || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', memberId] });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="목표 추가"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => create.mutate()} disabled={!description}>
            저장
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>유형</Label>
          <Select value={type} onChange={(e) => setType(e.target.value as Goal['type'])}>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>목표 설명</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="예: 체지방 18% 이하로 낮추기"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>현재값</Label>
            <Input
              type="number"
              step="0.1"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div>
            <Label>목표값</Label>
            <Input
              type="number"
              step="0.1"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>마감일 (선택)</Label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
