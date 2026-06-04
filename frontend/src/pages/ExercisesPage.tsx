// 운동 라이브러리 — 부위별로 모아둔 운동 모음
// 관리자: 추가/수정/삭제, 학생: 열람만
import { useMemo, useRef, useState } from 'react';
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
import { compressImage } from '@/utils/image';

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
  const [viewing, setViewing] = useState<Exercise | null>(null);

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
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 snap-x">
                {grouped[key].map((ex) => (
                  <ExerciseTile
                    key={ex.id}
                    exercise={ex}
                    onClick={() => setViewing(ex)}
                  />
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
      {viewing && (
        <ExerciseDetailModal
          key={viewing.id}
          exercise={viewing}
          isAdmin={isAdmin}
          onClose={() => setViewing(null)}
          onEdit={() => {
            setEditing(viewing);
            setViewing(null);
          }}
          onDelete={() => {
            if (confirm(`"${viewing.name}"을(를) 삭제할까요?`)) {
              remove.mutate(viewing.id);
              setViewing(null);
            }
          }}
        />
      )}
    </div>
  );
}

// 컴팩트 타일 — 정사각형 이미지 + 이름만, 클릭 시 상세 모달
function ExerciseTile({
  exercise: ex,
  onClick,
}: {
  exercise: Exercise;
  onClick: () => void;
}) {
  const firstImage =
    ex.images && ex.images.length > 0
      ? ex.images[0].data
      : ex.imageData || null;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 w-24 sm:w-28 snap-start text-left bg-white rounded-lg border hover:shadow-md hover:border-indigo-300 transition overflow-hidden flex flex-col"
    >
      <div className="aspect-square bg-gray-50 flex items-center justify-center text-2xl text-gray-300">
        {firstImage ? (
          <img
            src={firstImage}
            alt={ex.name}
            className="w-full h-full object-cover"
          />
        ) : (
          '🏋️'
        )}
      </div>
      <div className="px-1.5 py-1">
        <div className="text-xs font-medium truncate">{ex.name}</div>
      </div>
    </button>
  );
}

// 상세 모달 — 모든 정보 + 관리자 액션
function ExerciseDetailModal({
  exercise: ex,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
}: {
  exercise: Exercise;
  isAdmin: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={ex.name}>
      <div className="space-y-4">
        {ex.bodyPart && <Badge color="blue">{ex.bodyPart}</Badge>}
        <ExerciseImageGallery exercise={ex} />
        {ex.reps && (
          <div className="text-sm">
            <p className="font-medium text-gray-700">횟수</p>
            <p className="text-indigo-700 font-medium">{ex.reps}</p>
          </div>
        )}
        {ex.instructions && (
          <div className="text-sm">
            <p className="font-medium text-gray-700">방법</p>
            <p className="text-gray-600 whitespace-pre-line">{ex.instructions}</p>
          </div>
        )}
        {ex.cautions && (
          <div className="text-sm">
            <p className="font-medium text-red-700">⚠ 주의사항</p>
            <p className="text-red-600 whitespace-pre-line">{ex.cautions}</p>
          </div>
        )}
        {isAdmin && (
          <div className="flex gap-2 pt-3 border-t">
            <Button variant="secondary" onClick={onEdit} className="flex-1">
              수정
            </Button>
            <Button variant="danger" onClick={onDelete} className="flex-1">
              삭제
            </Button>
          </div>
        )}
      </div>
    </Modal>
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
  const [reps, setReps] = useState(exercise?.reps ?? '');
  const [instructions, setInstructions] = useState(exercise?.instructions ?? '');
  const [cautions, setCautions] = useState(exercise?.cautions ?? '');

  // 신규 이미지 + 기존 단일 이미지(레거시) 합쳐서 시작
  const initialImages = exercise?.images?.length
    ? exercise.images.map((i) => ({ data: i.data, mime: i.mime }))
    : exercise?.imageData && exercise?.imageMime
      ? [{ data: exercise.imageData, mime: exercise.imageMime }]
      : [];
  const [images, setImages] = useState<{ data: string; mime: string }[]>(initialImages);
  const [compressing, setCompressing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 10;

  const onPickFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setCompressing(true);
    try {
      const compressed = await Promise.all(
        files.map((f) => compressImage(f, 700, 0.78)),
      );
      setImages((curr) => [...curr, ...compressed].slice(0, MAX_IMAGES));
    } finally {
      setCompressing(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = useMutation({
    mutationFn: () => {
      const data: ExerciseInput = {
        name,
        bodyPart: bodyPart || null,
        reps: reps || null,
        instructions: instructions || null,
        cautions: cautions || null,
        images,
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
          <Label>횟수 (권장)</Label>
          <Input
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            placeholder="예: 10회 × 3세트 / 30초 / 양쪽 12회"
          />
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
          <Label>방법 이미지 (최대 {MAX_IMAGES}장)</Label>
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2 mb-2">
              {images.map((img, i) => (
                <div key={i} className="relative">
                  <img
                    src={img.data}
                    alt=""
                    className="w-full h-auto rounded border"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((curr) => curr.filter((_, idx) => idx !== i))}
                    className="absolute top-0.5 right-0.5 bg-white/90 rounded-full w-5 h-5 text-xs hover:bg-white border leading-none"
                    title="이 이미지 제거"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onPickFiles}
            disabled={images.length >= MAX_IMAGES}
            className="block text-sm"
          />
          {compressing && <p className="text-xs text-gray-500 mt-1">이미지 압축 중...</p>}
          <p className="text-xs text-gray-500 mt-1">
            {images.length}/{MAX_IMAGES}장 — 자세별로 여러 컷을 올리면 학생이 이해하기 쉬워요.
          </p>
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

// 운동 카드 안의 이미지 갤러리 — 작은 썸네일, 클릭 시 원본 크기 새 탭
function ExerciseImageGallery({ exercise }: { exercise: Exercise }) {
  const items =
    exercise.images && exercise.images.length > 0
      ? exercise.images.map((i) => i.data)
      : exercise.imageData
        ? [exercise.imageData]
        : [];
  if (items.length === 0) return null;
  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((src, i) => (
        <a key={i} href={src} target="_blank" rel="noopener noreferrer" className="block">
          <img
            src={src}
            alt=""
            className="w-full h-auto rounded border hover:opacity-80 transition"
          />
        </a>
      ))}
    </div>
  );
}
