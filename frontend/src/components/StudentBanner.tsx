import { useState } from 'react';

/**
 * 학생 "내 정보" 상단 배너.
 * `frontend/public/student-banner.jpg` 파일이 존재할 때만 표시됩니다.
 */
export function StudentBanner({
  src = '/student-banner.jpg',
  alt = 'banner',
}: {
  src?: string;
  alt?: string;
}) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
      <img
        src={src}
        alt={alt}
        className="block w-full h-40 md:h-48 object-cover object-[center_72%]"
        loading="lazy"
        onError={(e) => {
          const img = e.currentTarget;
          // jpg가 없으면 안내용 기본 배너(svg)를 표시
          if (img.src.endsWith('/student-banner.svg')) {
            setVisible(false);
            return;
          }
          img.src = '/student-banner.svg';
        }}
      />
    </div>
  );
}

