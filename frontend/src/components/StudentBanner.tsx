/** 크롭된 배너(세로 위치 70%) — student-banner.jpg 파일에 반영 */
const BANNER_SRC = '/student-banner.jpg?pos70';

export function StudentBanner({ alt = '학생 배너' }: { alt?: string }) {
  return (
    <img
      src={BANNER_SRC}
      alt={alt}
      className="block w-full aspect-[5/1] min-h-[10.5rem] object-cover object-center"
      loading="eager"
      decoding="async"
    />
  );
}
