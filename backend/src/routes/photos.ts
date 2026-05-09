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
    const photos = await prisma.photo.findMany({
      where: { ...(memberId && { memberId }) },
      orderBy: { date: 'asc' },
      // 사진 데이터(큰 base64) 포함해서 보냄 — 갤러리에 직접 표시
    });
    res.json(photos);
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
