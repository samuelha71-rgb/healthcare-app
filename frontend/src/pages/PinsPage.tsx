// 관리자 — 학생 PIN 일람 + 재설정 (대상이 추가되면 자동으로 표에 나타남)
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { membersApi } from '@/api/members';
import { Button, Card, EmptyState, Input } from '@/components/ui';
import type { Member } from '@/types';

export function PinsPage() {
  const qc = useQueryClient();
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });

  const updatePin = useMutation({
    mutationFn: ({ id, pin }: { id: number; pin: string }) =>
      membersApi.update(id, { pin }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });

  const copyAll = () => {
    const text = members.map((m) => `${m.name}: ${m.pin ?? '-'}`).join('\n');
    navigator.clipboard.writeText(text);
    alert('전체 PIN 목록이 클립보드에 복사되었습니다.\n학생들에게 공유하세요.');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">PIN 관리</h1>
          <p className="text-sm text-gray-500 mt-1">
            대상을 추가하면 자동으로 이 목록에 나타납니다. 학생에게 PIN을 알려주세요.
          </p>
        </div>
        {members.length > 0 && (
          <Button variant="secondary" onClick={copyAll}>
            📋 전체 복사
          </Button>
        )}
      </div>

      {members.length === 0 ? (
        <Card>
          <EmptyState
            title="등록된 대상이 없습니다"
            description="대상 메뉴에서 먼저 학생을 추가해주세요."
          />
        </Card>
      ) : (
        <Card>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b">
                <th className="py-2 pr-2">이름</th>
                <th className="pr-2">PIN</th>
                <th className="pr-2">변경</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <PinRow key={m.id} member={m} onSave={updatePin.mutate} />
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold mb-2 text-sm">💡 안내</h3>
        <ul className="text-sm text-gray-600 space-y-1 list-disc pl-5">
          <li>PIN은 4~6자리 숫자를 추천 (예: 1234)</li>
          <li>대상마다 서로 다른 PIN을 사용하세요</li>
          <li>학생이 PIN을 잊었을 때 여기서 새 PIN으로 재설정 가능</li>
          <li>"전체 복사" 버튼으로 이름:PIN 전체 목록을 클립보드에 복사할 수 있어요</li>
        </ul>
      </Card>
    </div>
  );
}

function PinRow({
  member,
  onSave,
}: {
  member: Member;
  onSave: (data: { id: number; pin: string }) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState(member.pin ?? '');

  return (
    <tr className="border-b last:border-0">
      <td className="py-3 pr-2 font-medium">{member.name}</td>
      <td className="pr-2">
        {editing ? (
          <Input
            className="!w-32"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
        ) : (
          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
            {member.pin ?? '(미설정)'}
          </code>
        )}
      </td>
      <td className="pr-2">
        {editing ? (
          <div className="flex gap-1">
            <Button
              onClick={() => {
                if (pin.length < 2) {
                  alert('PIN은 최소 2자리 이상이어야 합니다.');
                  return;
                }
                onSave({ id: member.id, pin });
                setEditing(false);
              }}
            >
              저장
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setPin(member.pin ?? '');
                setEditing(false);
              }}
            >
              취소
            </Button>
          </div>
        ) : (
          <Button variant="ghost" onClick={() => setEditing(true)}>
            재설정
          </Button>
        )}
      </td>
    </tr>
  );
}
