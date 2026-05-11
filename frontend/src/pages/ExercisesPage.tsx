// 운동 라이브러리 — 부위별로 모아둔 운동 모음
// 관리자: 추가/수정/삭제, 학생: 열람만
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { exercisesApi, type ExerciseInput } from '@/api/exercises';
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
} from '@/components/ui';
import { BODY_PARTS, type Exercise } from '@/types';
import { useAuth } from '@/auth/AuthContext';

export function ExercisesPage() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exercisesApi.list(),
  });

  const [filter, setFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);

  const remove = useMutation({
    mutationFn: exercisesApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });

  // 부위별로 그룹화 + 검색/필터
  const grouped = useMemo(() => {
    const filtered = exercises.filter((e) => {
      if (filter && e.bodyPart !== filter) return false;
      if (search && !e.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    const map: Record<string, Exercise[]> = {};
    for (const e of filtered) {
      const key = e.bodyPart || '미분류';
      (map[key] ??= []).push(e);
    }
    return map;
  }, [exercises, filter, search]);

  const groupKeys = Object.keys(grouped).sort();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">운동 라이브러리</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isAdmin
              ? '부위별로 운동을 등록해두면 루틴 만들 때 골라 쓸 수 있어요.'
              : '운동 부위와 방법, 주의사항을 확인하세요. 헬스장에서 참고용으로 활용하세요.'}
          </p>
        </div>
        {isAdmin && <Button onClick={() => setShowAdd(true)}>+ 운동 추가</Button>}
      </div>

      <Card>
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            className="!w-48"
            placeholder="운동 이름 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select
            className="!w-32"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">모든 부위</option>
            {BODY_PARTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {exercises.length === 0 ? (
        <Card>
          <EmptyState
            title="등록된 운동이 없습니다"
            description={
              isAdmin ? '+ 운동 추가 버튼으로 등록해보세요.' : '관리자가 등록하면 여기에 표시됩니다.'
            }
          />
        </Card>
      ) : groupKeys.length === 0 ? (
        <Card>
          <EmptyState title="검색 결과가 없습니다" />
        </Card>
      ) : (
        <div className="space-y-6">
          {groupKeys.map((key) => (
            <div key={key}>
              <h2 className="font-semibold text-indigo-700 mb-2">
                {key}{' '}
                <span className="text-sm font-normal text-gray-500">
                  ({grouped[key].length})
                </span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {grouped[key].map((ex) => (
                  <Card key={ex.id} className="!p-3 flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-semibold">{ex.name}</div>
                      {ex.bodyPart && <Badge color="blue">{ex.bodyPart}</Badge>}
                    </div>
                    {ex.instructions && (
                      <div className="text-xs">
                        <p className="font-medium text-gray-700">방법</p>
                        <p className="text-gray-600 whitespace-pre-line">
                          {ex.instructions}
                        </p>
                      </div>
                    )}
                    {ex.cautions && (
                      <div className="text-xs">
                        <p className="font-medium text-red-700">⚠ 주의사항</p>
                        <p className="text-red-600 whitespace-pre-line">{ex.cautions}</p>
                      </div>
                    )}
                    {isAdmin && (
                      <div className="flex gap-2 mt-auto pt-2 border-t">
                        <Button
                          variant="secondary"
                          onClick={() => setEditing(ex)}
                          className="flex-1 !py-1 !text-xs"
                        >
                          수정
                        </Button>
                        <Button
                          variant="danger"
                          onClick={() => {
                            if (confirm(`"${ex.name}"을(를) 삭제할까요?`)) remove.mutate(ex.id);
                          }}
                          className="flex-1 !py-1 !text-xs"
                        >
                          삭제
                        </Button>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <ExerciseFormModal
          open
          onClose={() => setShowAdd(false)}
          onDone={() => qc.invalidateQueries({ queryKey: ['exercises'] })}
        />
      )}
      {editing && (
        <ExerciseFormModal
          key={editing.id}
          open
          exercise={editing}
          onClose={() => setEditing(null)}
          onDone={() => qc.invalidateQueries({ queryKey: ['exercises'] })}
        />
      )}
    </div>
  );
}

function ExerciseFormModal({
  open,
  onClose,
  onDone,
  exercise,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  exercise?: Exercise;
}) {
  const [name, setName] = useState(exercise?.name ?? '');
  const [bodyPart, setBodyPart] = useState(exercise?.bodyPart ?? '');
  const [instructions, setInstructions] = useState(exercise?.instructions ?? '');
  const [cautions, setCautions] = useState(exercise?.cautions ?? '');

  const save = useMutation({
    mutationFn: () => {
      const data: ExerciseInput = {
        name,
        bodyPart: bodyPart || null,
        instructions: instructions || null,
        cautions: cautions || null,
      };
      return exercise
        ? exercisesApi.update(exercise.id, data)
        : exercisesApi.create(data);
    },
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Modal open={open} onClose={onClose} title={exercise ? '운동 수정' : '운동 추가'}>
      <div className="space-y-3">
        <div>
          <Label>운동 이름 *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>부위</Label>
          <Select value={bodyPart} onChange={(e) => setBodyPart(e.target.value)}>
            <option value="">선택 안 함</option>
            {BODY_PARTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>방법 (자세, 호흡 등)</Label>
          <Textarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
          />
        </div>
        <div>
          <Label>주의사항 (부상 예방, 자주 하는 실수 등)</Label>
          <Textarea
            rows={3}
            value={cautions}
            onChange={(e) => setCautions(e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => save.mutate()} disabled={!name || save.isPending}>
            {save.isPending ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
