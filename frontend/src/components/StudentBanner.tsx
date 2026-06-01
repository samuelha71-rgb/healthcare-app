import { useState } from 'react';

/**
 * 학생 "내 정보" 상단 배너.
 * `frontend/public/student-banner.jpg` 파일이 존재할 때만 표시됩니다.
 *
 * 가로가 넓어질수록 배너 높이도 함께 커지게 해서( clamp + vw ),
 * object-cover로 잘릴 때도 하단(햄스터)이 보이도록 object-bottom 고정.
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
    <div
      className="relative w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50
        h-[clamp(13rem,22vw,24rem)]"
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-bottom"
        loading="lazy"
        onError={(e) => {
          const img = e.currentTarget;
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
