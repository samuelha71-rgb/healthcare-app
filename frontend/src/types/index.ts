// 도메인 타입 — 백엔드 모델과 1:1로 맞춤

export interface Member {
  id: number;
  name: string;
  pin?: string;
  /** 서버에 bcrypt로만 저장된 경우 true — pin 필드는 내려오지 않음 */
  pinStoredSecurely?: boolean;
  age?: number | null;
  gender?: 'male' | 'female' | 'other' | null;
  height?: number | null;
  memo?: string | null;
  joinedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberDetail extends Member {
  goals: Goal[];
  routineAssignments: Array<{
    routineId: number;
    memberId: number;
    routine: Routine;
  }>;
  stats: {
    logCount: number;
    lastLog: WorkoutLog | null;
    inbodyCount: number;
    photoCount: number;
  };
}

export interface RoutineExercise {
  id: number;
  routineId: number;
  exerciseName: string;
  targetSets?: number | null;
  targetReps?: number | null;
  targetWeight?: number | null;
  instructions?: string | null;
  cautions?: string | null;
  orderIndex: number;
}

export interface Routine {
  id: number;
  name: string;
  description?: string | null;
  weekdays: number[]; // [0,1,3] = 일/월/수, [] = 무관
  instructions?: string | null;
  cautions?: string | null;
  exercises: RoutineExercise[];
  assignments?: { memberId: number; routineId: number; member: { id: number; name: string } }[];
}

export interface ExerciseSet {
  id: number;
  workoutLogId: number;
  exerciseName: string;
  setNumber: number;
  weight?: number | null;
  reps?: number | null;
}

export interface WorkoutLog {
  id: number;
  memberId: number;
  date: string;
  condition?: number | null;
  rpe?: number | null;
  painArea?: string | null;
  note?: string | null;
  sets: ExerciseSet[];
}

export interface InbodyRecord {
  id: number;
  memberId: number;
  date: string;
  weight?: number | null;
  bodyFat?: number | null;
  muscleMass?: number | null;
  bmi?: number | null;
  note?: string | null;
}

export interface Photo {
  id: number;
  memberId: number;
  date: string;
  data: string; // data URL (base64)
  mime: string;
  caption?: string | null;
}

export interface Goal {
  id: number;
  memberId: number;
  type: 'weight' | 'bodyFat' | 'muscleMass' | 'lift' | 'custom';
  description: string;
  targetValue?: number | null;
  currentValue?: number | null;
  deadline?: string | null;
  achieved: boolean;
}

export const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;
