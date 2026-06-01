import { useState } from 'react';

/** 2400×480 cover 크롭 배너 — 가로 전체를 사진으로 채움 */
const BANNER_SRC = '/student-banner.jpg?v=fill3';

export function StudentBanner({ alt = '학생 배너' }: { alt?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200">
      <div className="relative w-full aspect-[5/1]">
        <img
          src={BANNER_SRC}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.dataset.fallback === 'source') {
              setVisible(false);
              return;
            }
            img.dataset.fallback = 'source';
            img.src = '/student-banner-source.jpg?v=fill3';
          }}
        />
      </div>
    </div>
  );
}
