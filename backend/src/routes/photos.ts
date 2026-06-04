// 사진 — base64 데이터 URL을 DB에 직접 저장
// (디스크 영속성 의존을 없애기 위해 — 무료 호스팅 호환)
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { ensureSelfOrAdmin, memberIdFilter, requireAuth } from '../middleware/auth';

export const photosRouter = Router();

const photoInput = z.object({
  memberId: z.number().int(),
  date: z.string().transform((s) => new Date(s)),
  caption: z.string().optional().nullable(),
  data: z.string().min(20), // data URL
  mime: z.string().regex(/^image\//),
});

photosRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const studentId = memberIdFilter(req);
    const memberId = studentId ?? (req.query.memberId ? Number(req.query.memberId) : undefined);

    // 누가 사용해도 응답이 폭주하지 않도록 기본 한도
    const limitRaw = req.query.limit ? Number(req.query.limit) : undefined;
    const limit = limitRaw && limitRaw > 0 && limitRaw <= 200 ? limitRaw : 100;
    // 메타만 vs 실제 이미지 데이터 포함 — 기본은 데이터 포함(현재 UX 유지)
    const metaOnly = req.query.metaOnly === '1';

    const photos = await prisma.photo.findMany({
      where: { ...(memberId && { memberId }) },
      orderBy: { date: 'desc' },
      take: limit,
      ...(metaOnly && {
        select: {
          id: true,
          memberId: true,
          date: true,
          mime: true,
          caption: true,
          createdAt: true,
        },
      }),
    });
    // 화면 표시는 오래된 순이 자연스러우니 역순으로 반환
    res.json(photos.reverse());
  }),
);

photosRouter.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = photoInput.parse(req.body);
    ensureSelfOrAdmin(req, data.memberId);
    // 너무 큰 사진 거부 (대략 1MB 초과)
    if (data.data.length > 1_500_000) {
      throw new HttpError(413, '이미지가 너무 큽니다 (1MB 이하로 압축됩니다)');
    }
    const photo = await prisma.photo.create({ data });
    res.status(201).json(photo);
  }),
);

photosRouter.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) throw new HttpError(404, 'Photo not found');
    ensureSelfOrAdmin(req, photo.memberId);
    await prisma.photo.delete({ where: { id } });
    res.status(204).end();
  }),
);
