interface Block {
  name: string,
  semesters: string,
  schedule: {
    day: string,
    period: string,
  },
  roomNumber: string,
  teacher: string,
}

type MultiSemesterBlock = Block[];

type Day = (Block | MultiSemesterBlock)[];

interface ScheduleData {
  M: Day,
  T: Day,
  W: Day,
  R: Day,
  F: Day,
}

type ScheduleDays = 'M' | 'T' | 'W' | 'R' | 'F';
type SchedulePeriods = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type ScheduleCode = `${ScheduleDays}${SchedulePeriods}`;

export default class Schedule {
  M: Day;
  T: Day;
  W: Day;
  R: Day;
  F: Day;

  constructor(schedule: ScheduleData) {
    this.M = schedule.M;
    this.T = schedule.T;
    this.W = schedule.W;
    this.R = schedule.R;
    this.F = schedule.F;
  }

  getDay(day: keyof ScheduleData): Day {
    return this[day];
  }
  
  getPeriod(code: ScheduleCode) {
    const day: ScheduleDays = code[0] as ScheduleDays, period: SchedulePeriods = parseInt(code[1]) as SchedulePeriods;
    return this[day][period];
  }

  static DURATIONS = {

  };
}