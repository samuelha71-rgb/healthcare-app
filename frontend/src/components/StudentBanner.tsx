/** 원본 사진을 가로 전체에 cover로 채움 (가운데 네모·검은 여백 없음) */
const BANNER_URL = '/student-banner-source.jpg?v=fullbleed4';

export function StudentBanner({ alt = '학생 배너' }: { alt?: string }) {
  return (
    <div
      role="img"
      aria-label={alt}
      className="block w-full bg-cover bg-no-repeat"
      style={{
        backgroundImage: `url('${BANNER_URL}')`,
        backgroundPosition: 'center 80%',
        aspectRatio: '5 / 1',
        minHeight: '10.5rem',
      }}
    />
  );
}
