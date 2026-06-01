import { useState } from 'react';

/**
 * 학생 "내 정보" 상단 배너.
 * `frontend/public/student-banner.jpg`
 *
 * 가로·세로 화면 모두에서 햄스터가 잘리지 않도록 object-contain 사용.
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
      className="relative w-full overflow-hidden rounded-xl border border-gray-200
        bg-neutral-900 h-[clamp(11rem,min(36vw,38vh),22rem)]"
    >
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-contain object-center"
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
