import { useState } from 'react';

/** 2000×400 (5:1) — 컨테이너도 같은 비율로 맞춰 전체 화면에서 잘리지 않음 */
const BANNER_SRC = '/student-banner.jpg?v=wide2';

export function StudentBanner({ alt = '학생 배너' }: { alt?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      <div className="relative w-full aspect-[5/1] max-h-[min(26rem,42vh)]">
        <img
          src={BANNER_SRC}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover object-center"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.includes('student-banner.svg')) {
              setVisible(false);
              return;
            }
            img.src = '/student-banner.svg';
          }}
        />
      </div>
    </div>
  );
}
