import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { inbodyApi } from '@/api/inbody';
import { workoutLogsApi } from '@/api/workout-logs';
import { Badge, Button, Card, EmptyState } from '@/components/ui';
import { InbodyChart } from '@/features/InbodyChart';
import { InbodyForm } from '@/features/InbodyForm';
import { MemberComparison } from '@/features/MemberComparison';
import { LogDetailModal } from '@/features/LogDetailModal';
import { SleepDietReport } from '@/features/SleepDietReport';
import { fmtDate } from '@/utils/format';
import { useAuth } from '@/auth/AuthContext';
import { StudentBanner } from '@/components/StudentBanner';

export function MemberDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const qc = useQueryClient();
  const { user } = useAuth();
  const isStudent = user?.role === 'student';

  const { data: member } = useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.get(id),
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
  const [openLog, setOpenLog] = useState<import('@/types').WorkoutLog | null>(null);

  if (!member) return <p>로딩 중...</p>;

  return (
    <div className="space-y-6">
      {isStudent && (
        <div className="-mx-8 -mt-8 mb-2">
          <StudentBanner alt="학생 배너" />
        </div>
      )}
      <div>
        {!isStudent && (
          <Link to="/members" className="text-sm text-indigo-600 hover:underline">
            ← 대상 목록
          </Link>
        )}
        <h1 className="text-2xl font-bold mt-2">{member.name}</h1>
        <p className="text-sm text-gray-500 mt-1">
          {member.gender === 'male' ? '남' : member.gender === 'female' ? '여' : ''}
          {member.age ? ` · ${member.age}세` : ''}
          {member.height ? ` · ${member.height}cm` : ''}
          {' · 시작 '}
          {fmtDate(member.joinedAt)}
        </p>
      </div>

      {isStudent && <MemberComparison />}

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
              <li
                key={l.id}
                onClick={() => setOpenLog(l)}
                className="py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 -mx-2 px-2 rounded transition"
              >
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

      <SleepDietReport memberId={id} showDiet={false} />

      {openLog && (
        <LogDetailModal log={openLog} onClose={() => setOpenLog(null)} />
      )}
    </div>
  );
}

