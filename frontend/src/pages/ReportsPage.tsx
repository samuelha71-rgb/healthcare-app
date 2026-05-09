import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { inbodyApi } from '@/api/inbody';
import { workoutLogsApi } from '@/api/workout-logs';
import { Button, Card, Label, Select } from '@/components/ui';
import { InbodyChart } from '@/features/InbodyChart';
import { AttendanceCalendar } from '@/features/AttendanceCalendar';
import { fmtDate } from '@/utils/format';

export function ReportsPage() {
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });
  const [memberId, setMemberId] = useState<number | null>(null);

  const { data: member } = useQuery({
    queryKey: ['members', memberId],
    queryFn: () => membersApi.get(memberId!),
    enabled: !!memberId,
  });
  const { data: inbody = [] } = useQuery({
    queryKey: ['inbody', memberId],
    queryFn: () => inbodyApi.list(memberId!),
    enabled: !!memberId,
  });
  const { data: logs = [] } = useQuery({
    queryKey: ['workout-logs', memberId],
    queryFn: () => workoutLogsApi.list({ memberId: memberId! }),
    enabled: !!memberId,
  });

  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // 인바디 변화 요약
  const first = inbody[0];
  const last = inbody[inbody.length - 1];
  const delta =
    first && last
      ? {
          weight: last.weight && first.weight ? (last.weight - first.weight).toFixed(1) : null,
          bodyFat:
            last.bodyFat && first.bodyFat ? (last.bodyFat - first.bodyFat).toFixed(1) : null,
          muscleMass:
            last.muscleMass && first.muscleMass
              ? (last.muscleMass - first.muscleMass).toFixed(1)
              : null,
        }
      : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold">리포트</h1>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              const token = localStorage.getItem('hc_token') ?? '';
              const r = await fetch('/api/export/all', {
                headers: { 'x-auth-token': token },
              });
              const blob = await r.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `healthcare-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            📦 전체 데이터 백업
          </Button>
          {memberId && (
            <Button onClick={handlePrint}>PDF로 저장 (인쇄 → PDF로 저장)</Button>
          )}
        </div>
      </div>

      <Card className="print:hidden">
        <Label>대상 선택</Label>
        <Select
          value={memberId ?? ''}
          onChange={(e) => setMemberId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">선택</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </Select>
      </Card>

      {memberId && member && (
        <div ref={reportRef} className="space-y-6 print:space-y-4">
          <Card>
            <h2 className="text-xl font-bold">{member.name} 헬스케어 리포트</h2>
            <p className="text-sm text-gray-500">
              시작일: {fmtDate(member.joinedAt)} · 발행: {fmtDate(new Date())}
            </p>
          </Card>

          <Card>
            <h3 className="font-semibold mb-2">참여 요약</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-500">총 운동 일수</p>
                <p className="text-2xl font-bold">{logs.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">인바디 측정</p>
                <p className="text-2xl font-bold">{inbody.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">목표 달성</p>
                <p className="text-2xl font-bold">
                  {member.goals.filter((g) => g.achieved).length}/{member.goals.length}
                </p>
              </div>
            </div>
          </Card>

          {delta && (
            <Card>
              <h3 className="font-semibold mb-2">인바디 변화</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-500">체중</p>
                  <p className="text-xl font-bold">
                    {delta.weight ? (Number(delta.weight) >= 0 ? '+' : '') + delta.weight + 'kg' : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">체지방률</p>
                  <p className="text-xl font-bold">
                    {delta.bodyFat ? (Number(delta.bodyFat) >= 0 ? '+' : '') + delta.bodyFat + '%' : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">골격근량</p>
                  <p className="text-xl font-bold">
                    {delta.muscleMass
                      ? (Number(delta.muscleMass) >= 0 ? '+' : '') + delta.muscleMass + 'kg'
                      : '-'}
                  </p>
                </div>
              </div>
            </Card>
          )}

          <Card>
            <h3 className="font-semibold mb-2">인바디 추이</h3>
            <InbodyChart records={inbody} />
          </Card>

          <Card>
            <h3 className="font-semibold mb-2">출석</h3>
            <AttendanceCalendar dates={logs.map((l) => l.date)} />
          </Card>

          {member.goals.length > 0 && (
            <Card>
              <h3 className="font-semibold mb-2">목표 진행</h3>
              <ul className="space-y-1 text-sm">
                {member.goals.map((g) => (
                  <li key={g.id}>
                    {g.achieved ? '✅' : '⬜'} {g.description}
                    {g.targetValue && ` (목표 ${g.targetValue}, 현재 ${g.currentValue ?? '-'})`}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
