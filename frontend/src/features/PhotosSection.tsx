import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { photosApi } from '@/api/photos';
import { Card, EmptyState, Input, Label } from '@/components/ui';
import { fmtDate, todayISO } from '@/utils/format';
import { compressImage } from '@/utils/image';

export function PhotosSection({ memberId }: { memberId: number }) {
  const qc = useQueryClient();
  const { data: photos = [] } = useQuery({
    queryKey: ['photos', memberId],
    queryFn: () => photosApi.list(memberId),
  });

  const fileRef = useRef<HTMLInputElement>(null);
  const [date, setDate] = useState(todayISO());
  const [caption, setCaption] = useState('');

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { data, mime } = await compressImage(file);
      return photosApi.upload({
        memberId,
        date,
        caption: caption || undefined,
        data,
        mime,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photos', memberId] });
      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
    },
  });

  const remove = useMutation({
    mutationFn: photosApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['photos', memberId] }),
  });

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">사진 기록 (Before/After)</h2>
      </div>

      <div className="flex flex-wrap gap-2 items-end mb-4">
        <div>
          <Label>날짜</Label>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="!w-36"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <Label>캡션</Label>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="예: 정면, 측면"
          />
        </div>
        <div>
          <Label>이미지</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload.mutate(f);
            }}
            className="text-sm"
          />
        </div>
      </div>

      {photos.length === 0 ? (
        <EmptyState title="사진이 없습니다" description="시작 시점의 사진을 올려두면 비교가 쉬워요." />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="relative group">
              <img
                src={p.data}
                alt={p.caption ?? ''}
                className="w-full aspect-square object-cover rounded-lg border"
              />
              <div className="text-xs text-gray-600 mt-1">
                {fmtDate(p.date)}
                {p.caption && ` · ${p.caption}`}
              </div>
              <button
                onClick={() => {
                  if (confirm('삭제하시겠습니까?')) remove.mutate(p.id);
                }}
                className="absolute top-1 right-1 bg-black/50 text-white rounded-full w-6 h-6 text-xs opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
