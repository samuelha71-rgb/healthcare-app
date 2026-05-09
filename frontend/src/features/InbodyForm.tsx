import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { inbodyApi } from '@/api/inbody';
import { Button, Input, Label, Modal } from '@/components/ui';
import { todayISO } from '@/utils/format';

export function InbodyForm({
  memberId,
  open,
  onClose,
}: {
  memberId: number;
  open: boolean;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayISO());
  const [weight, setWeight] = useState('');
  const [bodyFat, setBodyFat] = useState('');
  const [muscleMass, setMuscleMass] = useState('');
  const [bmi, setBmi] = useState('');
  const [note, setNote] = useState('');

  const create = useMutation({
    mutationFn: () =>
      inbodyApi.create({
        memberId,
        date,
        weight: weight ? Number(weight) : null,
        bodyFat: bodyFat ? Number(bodyFat) : null,
        muscleMass: muscleMass ? Number(muscleMass) : null,
        bmi: bmi ? Number(bmi) : null,
        note: note || null,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inbody', memberId] });
      onClose();
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="인바디 측정 추가"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            취소
          </Button>
          <Button onClick={() => create.mutate()}>저장</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>측정일</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>체중 (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
            />
          </div>
          <div>
            <Label>체지방률 (%)</Label>
            <Input
              type="number"
              step="0.1"
              value={bodyFat}
              onChange={(e) => setBodyFat(e.target.value)}
            />
          </div>
          <div>
            <Label>골격근량 (kg)</Label>
            <Input
              type="number"
              step="0.1"
              value={muscleMass}
              onChange={(e) => setMuscleMass(e.target.value)}
            />
          </div>
          <div>
            <Label>BMI</Label>
            <Input
              type="number"
              step="0.1"
              value={bmi}
              onChange={(e) => setBmi(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>메모</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>
    </Modal>
  );
}
