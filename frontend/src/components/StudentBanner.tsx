import { useState } from 'react';

/** 원본 전체가 보이도록 contain + 축소 (잘림 없음) */
const BANNER_SRC = '/student-banner-source.jpg?v=fit1';

export function StudentBanner({ alt = '학생 배너' }: { alt?: string }) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-neutral-800">
      <div className="flex w-full items-center justify-center px-3 py-3 sm:px-4 sm:py-4">
        <img
          src={BANNER_SRC}
          alt={alt}
          className="h-auto w-auto max-h-[130px] max-w-[min(88%,28rem)] object-contain sm:max-h-[150px] lg:max-h-[175px] xl:max-h-[195px]"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            const step = img.dataset.fallback ?? 'source';
            if (step === 'source') {
              img.dataset.fallback = 'jpg';
              img.src = '/student-banner.jpg?v=fit1';
              return;
            }
            if (step === 'jpg') {
              img.dataset.fallback = 'svg';
              img.src = '/student-banner.svg';
              return;
            }
            setVisible(false);
          }}
        />
      </div>
    </div>
  );
}
