// 운동 통계 계산 유틸
import { differenceInCalendarDays, format } from 'date-fns';

export function uniqueDates(dates: string[]): Set<string> {
  return new Set(dates.map((d) => format(new Date(d), 'yyyy-MM-dd')));
}

// 마지막 운동일로부터 거꾸로 연속된 일 수
export function currentStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = uniqueDates(dates);
  // 오늘 또는 어제 운동했어야 streak 인정 (오늘 안 했으면 어제까지)
  const today = new Date();
  let cursor: Date;
  if (set.has(format(today, 'yyyy-MM-dd'))) {
    cursor = today;
  } else {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (!set.has(format(y, 'yyyy-MM-dd'))) return 0;
    cursor = y;
  }

  let count = 0;
  while (set.has(format(cursor, 'yyyy-MM-dd'))) {
    count++;
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

// 최근 N일 동안 운동한 일 수
export function recentDays(dates: string[], days: number): number {
  const set = uniqueDates(dates);
  const today = new Date();
  let count = 0;
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (set.has(format(d, 'yyyy-MM-dd'))) count++;
  }
  return count;
}

// 첫 운동일부터 오늘까지의 출석률 (%)
export function lifetimeAttendanceRate(dates: string[]): number {
  if (dates.length === 0) return 0;
  const set = uniqueDates(dates);
  const sorted = [...dates].map((d) => new Date(d)).sort((a, b) => a.getTime() - b.getTime());
  const total = differenceInCalendarDays(new Date(), sorted[0]) + 1;
  if (total <= 0) return 0;
  return Math.round((set.size / total) * 100);
}
