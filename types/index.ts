export interface TimetableEvent {
  id: string;
  title: string;
  location: string;
  day: number;        // 0=MON, 1=TUE, 2=WED, 3=THU, 4=FRI
  start: number;     // float e.g. 9.5 = 9:30
  duration: number;  // float hours e.g. 1.5 = 90min
  color: string;
}

export interface ParseAPIResponse {
  success: boolean;
  events?: TimetableEvent[];
  error?: string;
}
