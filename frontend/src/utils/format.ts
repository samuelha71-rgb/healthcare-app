// 날짜/숫자 포매팅 유틸
import { format, parseISO } from 'date-fns';

export const fmtDate = (s: string | Date) =>
  format(typeof s === 'string' ? parseISO(s) : s, 'yyyy-MM-dd');

export const fmtDateTime = (s: string | Date) =>
  format(typeof s === 'string' ? parseISO(s) : s, 'yyyy-MM-dd HH:mm');

export const todayISO = () => format(new Date(), 'yyyy-MM-dd');
