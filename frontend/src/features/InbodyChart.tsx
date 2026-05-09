// 인바디 변화 그래프
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { InbodyRecord } from '@/types';
import { fmtDate } from '@/utils/format';

export function InbodyChart({ records }: { records: InbodyRecord[] }) {
  const data = records.map((r) => ({
    date: fmtDate(r.date),
    weight: r.weight ?? null,
    bodyFat: r.bodyFat ?? null,
    muscleMass: r.muscleMass ?? null,
  }));

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        인바디 기록이 없습니다. 측정 데이터를 추가하면 변화가 그래프로 표시됩니다.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid stroke="#eee" strokeDasharray="3 3" />
        <XAxis dataKey="date" fontSize={12} />
        <YAxis fontSize={12} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="weight"
          name="체중(kg)"
          stroke="#6366f1"
          strokeWidth={2}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="bodyFat"
          name="체지방(%)"
          stroke="#ef4444"
          strokeWidth={2}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="muscleMass"
          name="골격근(kg)"
          stroke="#10b981"
          strokeWidth={2}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
