# Healthcare App

창의활동 — 헬스케어 프로그램 관리 웹사이트.

대상(참여자)별로 운동 루틴, 일일 운동 기록, 인바디 변화, 사진을 추적하고 보고서로 정리합니다.

## 기술 스택

### 프론트엔드 (`frontend/`)
- React + Vite + TypeScript
- TailwindCSS + shadcn/ui
- Recharts (그래프)
- React Router, TanStack Query

### 백엔드 (`backend/`)
- Node.js + Express + TypeScript
- Prisma ORM + PostgreSQL (`DATABASE_URL`)
- 사진은 파일 디스크가 아니라 DB에 base64로 저장 (호스팅 환경에서 업로드 디렉터리에 의존하지 않기 위함). 요청 본문 크기 제한은 서버에서 넉넉히 허용함.

## 폴더 구조

```
healthcare-app/
├── backend/        # API 서버
│   ├── src/
│   │   ├── routes/         # API 엔드포인트
│   │   ├── middleware/     # 인증, 에러 처리
│   │   └── prisma.ts       # Prisma 클라이언트
│   ├── prisma/             # DB 스키마
│   └── uploads/            # (선택) 로컬 예약용 — 현재 구현은 DB 저장
└── frontend/       # 웹 화면
    └── src/
        ├── components/     # 재사용 UI
        ├── pages/          # 페이지
        ├── features/       # 기능별 모듈
        ├── api/            # 백엔드 호출
        ├── hooks/
        ├── types/
        └── utils/
```

## 코드 규칙

1. **파일/폴더 이름**: 영문 소문자 + 케밥-케이스 (`workout-log.ts`)
2. **컴포넌트 이름**: 파스칼 케이스 (`MemberCard.tsx`)
3. **변수/함수 이름**: 카멜 케이스 (`getMembers`)
4. **상수**: 대문자 + 언더스코어 (`MAX_PHOTOS`)
5. **타입은 `types/`에 모아 관리**, 도메인별로 파일 분리
6. **API 호출은 `api/` 모듈을 통해서만** — 컴포넌트에서 `fetch` 직접 호출 금지
7. **백엔드 라우트는 도메인별로 분리** (`routes/members.ts`, `routes/routines.ts` 등)
8. **에러 처리는 미들웨어에서 일관되게** — 라우트 안에서 `try/catch` 흩뿌리지 않기
9. **환경변수는 `.env`** — 코드에 비밀값 하드코딩 금지
10. **커밋 전 lint/format 통과** (ESLint + Prettier)

## 환경 변수 (`backend/.env`)

로컬에서 백엔드를 띄우려면 PostgreSQL 연결 문자열과 관리자 비밀번호가 필요합니다.

| 변수 | 설명 |
|------|------|
| `DATABASE_URL` | PostgreSQL 연결 URL (Prisma) |
| `ADMIN_PASSWORD` | 관리자 로그인 비밀번호 |
| `PORT` | (선택) 기본값 `4000` |

프론트 개발 서버는 `vite.config.ts`에서 `/api`를 백엔드로 프록시합니다.

배포(Render 등)는 저장소 루트의 [`render.yaml`](./render.yaml)을 참고합니다.

## 실행 방법

```bash
# 백엔드
cd backend
npm install
npm run dev          # http://localhost:4000

# 프론트엔드 (다른 터미널)
cd frontend
npm install
npm run dev          # http://localhost:5173
```
