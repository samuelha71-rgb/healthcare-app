import { useState } from 'react';

/** 2400×480 (5:1) 합성 배너 — 가로 꽉 채우고 햄스터 전체 노출 */
const BANNER_SRC = '/student-banner.jpg?v=fill2';

export function StudentBanner({ alt = '학생 배너' }: { alt?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-neutral-900">
      <div className="relative w-full aspect-[5/1]">
        <img
          src={BANNER_SRC}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback === 'source') {
              img.dataset.fallback = 'done';
              img.src = '/student-banner-source.jpg?v=fill1';
              return;
            }
            setVisible(false);
          }}
        />
      </div>
    </div>
  );
}
