// 출석 캘린더 — 최근 N주 운동한 날을 색칠
import { addDays, eachDayOfInterval, format, startOfWeek, subWeeks } from 'date-fns';
import { clsx } from 'clsx';

export function AttendanceCalendar({
  dates,
  weeks = 12,
}: {
  dates: string[]; // ISO date strings
  weeks?: number;
}) {
  const set = new Set(dates.map((d) => format(new Date(d), 'yyyy-MM-dd')));
  const end = new Date();
  const start = startOfWeek(subWeeks(end, weeks - 1), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end: addDays(start, weeks * 7 - 1) });

  // 7행 x weeks열 (행=요일, 열=주)
  const grid: Date[][] = [[], [], [], [], [], [], []];
  days.forEach((d, i) => {
    grid[i % 7].push(d);
  });

  return (
    <div className="overflow-x-auto">
      <div className="inline-grid gap-1" style={{ gridTemplateRows: 'repeat(7, 14px)' }}>
        {grid.map((row, ri) => (
          <div key={ri} className="flex gap-1">
            {row.map((d) => {
              const ds = format(d, 'yyyy-MM-dd');
              const has = set.has(ds);
              const future = d > end;
              return (
                <div
                  key={ds}
                  title={`${ds}${has ? ' ✓ 운동' : ''}`}
                  className={clsx(
                    'w-3.5 h-3.5 rounded-sm',
                    future
                      ? 'bg-gray-50'
                      : has
                        ? 'bg-indigo-500'
                        : 'bg-gray-200',
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
        <span>안 함</span>
        <div className="w-3 h-3 bg-gray-200 rounded-sm" />
        <div className="w-3 h-3 bg-indigo-500 rounded-sm" />
        <span>함</span>
      </div>
    </div>
  );
}
