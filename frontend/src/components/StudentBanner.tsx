/** 크롭된 배너 파일(90% 기준) — CSS가 아니라 이미지 자체에 위치 반영 */
const BANNER_SRC = '/student-banner.jpg?pos=90';

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
