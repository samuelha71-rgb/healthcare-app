import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { inbodyApi } from '@/api/inbody';
import { workoutLogsApi } from '@/api/workout-logs';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { AttendanceCalendar } from '@/features/AttendanceCalendar';
import { InbodyChart } from '@/features/InbodyChart';
import { InbodyForm } from '@/features/InbodyForm';
import { PhotosSection } from '@/features/PhotosSection';
import { GoalsSection } from '@/features/GoalsSection';
import { fmtDate } from '@/utils/format';

export function MemberDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const qc = useQueryClient();

  const { data: member } = useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.get(id),
    enabled: !!id,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => membersApi.attendance(id),
    enabled: !!id,
  });

  const { data: inbody = [] } = useQuery({
    queryKey: ['inbody', id],
    queryFn: () => inbodyApi.list(id),
    enabled: !!id,
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['workout-logs', id],
    queryFn: () => workoutLogsApi.list({ memberId: id }),
    enabled: !!id,
  });

  const removeInbody = useMutation({
    mutationFn: inbodyApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbody', id] }),
  });

  const [showInbody, setShowInbody] = useState(false);

  if (!member) return <p>로딩 중...</p>;

  // 참여도 — 최근 30일 출석률
  const last30 = attendance.filter(
    (a) => Date.now() - new Date(a.date).getTime() < 30 * 24 * 60 * 60 * 1000,
  );
  const attendanceRate = Math.round((last30.length / 30) * 100);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/members" className="text-sm text-indigo-600 hover:underline">
          ← 대상 목록
        </Link>
        <h1 className="text-2xl font-bold mt-2">{member.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {member.gender === 'male' ? '남' : member.gender === 'female' ? '여' : ''}
          {member.age ? ` · ${member.age}세` : ''}
          {member.height ? ` · ${member.height}cm` : ''}
          {' · 시작 '}
          {fmtDate(member.joinedAt)}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm text-gray-500">전체 운동 일수</p>
          <p className="text-2xl font-bold">{member.stats.logCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">최근 30일 출석률</p>
          <p className="text-2xl font-bold">{attendanceRate}%</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">인바디 측정</p>
          <p className="text-2xl font-bold">{member.stats.inbodyCount}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">사진 기록</p>
          <p className="text-2xl font-bold">{member.stats.photoCount}</p>
        </Card>
      </div>

      <Card>
        <h2 className="font-semibold mb-3">출석 캘린더 (최근 12주)</h2>
        <AttendanceCalendar dates={attendance.map((a) => a.date)} />
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">인바디 변화</h2>
          <Button onClick={() => setShowInbody(true)}>+ 측정 추가</Button>
        </div>
        <InbodyChart records={inbody} />
        {inbody.length > 0 && (
          <div className="mt-4 max-h-48 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="text-gray-500">
                <tr>
                  <th className="text-left">날짜</th>
                  <th className="text-right">체중</th>
                  <th className="text-right">체지방</th>
                  <th className="text-right">골격근</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {[...inbody].reverse().map((r) => (
                  <tr key={r.id} className="border-t">
                    <td className="py-1">{fmtDate(r.date)}</td>
                    <td className="text-right">{r.weight ?? '-'}</td>
                    <td className="text-right">{r.bodyFat ?? '-'}</td>
                    <td className="text-right">{r.muscleMass ?? '-'}</td>
                    <td className="text-right">
                      <button
                        onClick={() => {
                          if (confirm('삭제?')) removeInbody.mutate(r.id);
                        }}
                        className="text-red-500 hover:underline text-xs"
                      >
                        삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <InbodyForm memberId={id} open={showInbody} onClose={() => setShowInbody(false)} />
      </Card>

      <Card>
        <h2 className="font-semibold mb-3">최근 운동 기록</h2>
        {logs.length === 0 ? (
          <EmptyState title="기록이 없습니다" description="오늘 기록 페이지에서 입력할 수 있어요." />
        ) : (
          <ul className="divide-y">
            {logs.slice(0, 10).map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between">
                <div>
                  <span className="font-medium">{fmtDate(l.date)}</span>
                  <span className="text-sm text-gray-500 ml-3">
                    {l.sets.length}세트
                    {l.condition && ` · 컨디션 ${l.condition}/5`}
                    {l.rpe && ` · RPE ${l.rpe}`}
                  </span>
                </div>
                {l.painArea && <Badge color="red">{l.painArea}</Badge>}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <GoalsSection memberId={id} />
      <PhotosSection memberId={id} />

      {member.routineAssignments.length > 0 && (
        <Card>
          <h2 className="font-semibold mb-3">배정된 루틴</h2>
          <ul className="space-y-1">
            {member.routineAssignments.map((a) => (
              <li key={a.routineId} className="text-sm">
                <Link to="/routines" className="text-indigo-600 hover:underline">
                  {a.routine.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
