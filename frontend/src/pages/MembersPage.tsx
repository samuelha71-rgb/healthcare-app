import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { membersApi } from '@/api/members';
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  Modal,
  Select,
  Textarea,
} from '@/components/ui';
import type { Member } from '@/types';

export function MembersPage() {
  const qc = useQueryClient();
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.list,
  });

  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const remove = useMutation({
    mutationFn: membersApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">대상 관리</h1>
        <Button onClick={() => setShowAdd(true)}>+ 대상 추가</Button>
      </div>

      {members.length === 0 ? (
        <Card>
          <EmptyState
            title="등록된 대상이 없습니다"
            description="프로그램을 진행할 대상을 먼저 추가해주세요."
            action={<Button onClick={() => setShowAdd(true)}>대상 추가</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => (
            <Card key={m.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div>
                  <Link
                    to={`/members/${m.id}`}
                    className="font-semibold text-lg text-indigo-700 hover:underline"
                  >
                    {m.name}
                  </Link>
                  <p className="text-sm text-gray-500 mt-1">
                    {m.gender === 'male' ? '남' : m.gender === 'female' ? '여' : ''}
                    {m.age ? ` · ${m.age}세` : ''}
                    {m.height ? ` · ${m.height}cm` : ''}
                  </p>
                  {(m.pin || m.pinStoredSecurely) && (
                    <p className="text-xs text-gray-400 mt-1">
                      PIN:{' '}
                      {m.pinStoredSecurely && !m.pin
                        ? '(안전하게 저장됨)'
                        : m.pin}
                    </p>
                  )}
                </div>
              </div>
              {m.memo && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{m.memo}</p>}
              <div className="mt-4 flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(m)}>
                  수정
                </Button>
                <Button
                  variant="danger"
                  onClick={() => {
                    if (confirm(`${m.name} 님을 삭제할까요? (모든 기록이 함께 삭제됩니다)`))
                      remove.mutate(m.id);
                  }}
                >
                  삭제
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <MemberFormModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onDone={() => qc.invalidateQueries({ queryKey: ['members'] })}
      />
      <MemberFormModal
        open={!!editing}
        member={editing ?? undefined}
        onClose={() => setEditing(null)}
        onDone={() => qc.invalidateQueries({ queryKey: ['members'] })}
      />
    </div>
  );
}

function MemberFormModal({
  open,
  onClose,
  onDone,
  member,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
  member?: Member;
}) {
  const [name, setName] = useState(member?.name ?? '');
  const [pin, setPin] = useState(member?.pin ?? '');
  const [age, setAge] = useState(member?.age?.toString() ?? '');
  const [gender, setGender] = useState<string>(member?.gender ?? '');
  const [height, setHeight] = useState(member?.height?.toString() ?? '');
  const [memo, setMemo] = useState(member?.memo ?? '');

  const save = useMutation({
    mutationFn: async () => {
      const data = {
        name,
        ...(pin && { pin }),
        age: age ? Number(age) : null,
        gender: (gender || null) as Member['gender'],
        height: height ? Number(height) : null,
        memo: memo || null,
      };
      return member
        ? membersApi.update(member.id, data)
        : membersApi.create(data);
    },
    onSuccess: () => {
      onDone();
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={member ? '대상 수정' : '대상 추가'}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={!name || (!member && !pin) || save.isPending}
          >
            {save.isPending ? '저장 중...' : '저장'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>이름 *</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>PIN {member ? '(비워두면 변경 안 함)' : '*'}</Label>
          <Input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="학생이 로그인할 때 입력할 비밀번호 (예: 1234)"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>나이</Label>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
          </div>
          <div>
            <Label>성별</Label>
            <Select value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">선택</option>
              <option value="male">남</option>
              <option value="female">여</option>
              <option value="other">기타</option>
            </Select>
          </div>
        </div>
        <div>
          <Label>키 (cm)</Label>
          <Input
            type="number"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
          />
        </div>
        <div>
          <Label>메모</Label>
          <Textarea
            rows={3}
            value={memo ?? ''}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}
