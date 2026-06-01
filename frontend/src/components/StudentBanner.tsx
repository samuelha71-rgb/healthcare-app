import { useState } from 'react';

/** 전체 화면(넓은 메인 영역) 기준 5:1 배너 — `public/student-banner.jpg` */
const BANNER_SRC = '/student-banner.jpg?v=wide1';

export function StudentBanner({ alt = '학생 배너' }: { alt?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
      {/* lg+ = 사이드바 제외한 전체 화면 메인 폭 기준 높이 */}
      <div className="relative w-full h-[200px] sm:h-[240px] lg:h-[280px] xl:h-[300px] 2xl:h-[320px]">
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
