// 운동 라이브러리 — 부위별 모음, 다중 이미지 지원
import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../prisma';
import { asyncHandler, HttpError } from '../middleware/error';
import { requireAdmin, requireAuth } from '../middleware/auth';

export const exercisesRouter = Router();

const imageItem = z.object({
  data: z.string().min(20),
  mime: z.string().regex(/^image\//),
});

const exerciseInput = z.object({
  name: z.string().min(1),
  bodyPart: z.string().optional().nullable(),
  reps: z.string().optional().nullable(),
  instructions: z.string().optional().nullable(),
  cautions: z.string().optional().nullable(),
  images: z.array(imageItem).max(10).optional(),
});

function validateImages(images?: { data: string }[]) {
  if (!images) return;
  for (const img of images) {
    if (img.data.length > 800_000) {
      throw new HttpError(413, '이미지가 너무 큽니다 (자동 압축 후에도 0.8MB 초과)');
    }
  }
}

exercisesRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const bodyPart = req.query.bodyPart ? String(req.query.bodyPart) : undefined;
    const slim = req.query.slim === '1';
    // slim=1 — 이미지 제외 (드롭다운/선택용). 기본은 이미지 포함 (운동 라이브러리 화면용)
    const exercises = await prisma.exercise.findMany({
      where: { ...(bodyPart && { bodyPart }) },
      include: slim ? undefined : { images: { orderBy: { orderIndex: 'asc' } } },
      ...(slim && {
        select: {
          id: true,
          name: true,
          bodyPart: true,
          reps: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      orderBy: [{ bodyPart: 'asc' }, { name: 'asc' }],
    });
    res.json(exercises);
  }),
);

exercisesRouter.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const ex = await prisma.exercise.findUnique({
      where: { id },
      include: { images: { orderBy: { orderIndex: 'asc' } } },
    });
    if (!ex) throw new HttpError(404, 'Exercise not found');
    res.json(ex);
  }),
);

exercisesRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { images = [], ...data } = exerciseInput.parse(req.body);
    validateImages(images);
    const ex = await prisma.exercise.create({
      data: {
        ...data,
        images: {
          create: images.map((img, i) => ({ ...img, orderIndex: i })),
        },
      },
      include: { images: { orderBy: { orderIndex: 'asc' } } },
    });
    res.status(201).json(ex);
  }),
);

exercisesRouter.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    const { images, ...data } = exerciseInput.partial().parse(req.body);
    validateImages(images);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.exercise.update({ where: { id }, data });
      if (images) {
        // 통째로 교체 — 단순화
        await tx.exerciseImage.deleteMany({ where: { exerciseId: id } });
        if (images.length > 0) {
          await tx.exerciseImage.createMany({
            data: images.map((img, i) => ({
              ...img,
              exerciseId: id,
              orderIndex: i,
            })),
          });
        }
      }
      return tx.exercise.findUnique({
        where: { id },
        include: { images: { orderBy: { orderIndex: 'asc' } } },
      });
    });

    res.json(updated);
  }),
);

exercisesRouter.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = Number(req.params.id);
    await prisma.exercise.delete({ where: { id } });
    res.status(204).end();
  }),
);
