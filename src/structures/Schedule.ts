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

type Day = Block[];

interface ScheduleData {
  M: Day,
  T: Day,
  W: Day,
  R: Day,
  F: Day,
}



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
}