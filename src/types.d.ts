export type terms = 'q1' | 'q2' | 'q3' | 'q4'

export interface CourseSearchOptions {
  year: 'current' | 'previous'
  term: terms | 'all'
}

export type ClassDetailSearchMethod = 'courseName' | 'teacherName' | 'courseCode' | 'sectionNumber';

export interface Category {
  name: string,
  terms: {
    q1: {
      weight: number,
      average: number,
    },
    q2: {
      weight: number,
      average: number,
    },
    q3: {
      weight: number,
      average: number,
    },
    q4: {
      weight: number,
      average: number,
    },
  },
}


export interface UserData {
  studentId: string,
  name: string,
  school: {
    name: string,
    id: string,
    counselor: string,
  },
  sasid: string,
  grade: string,
  email: string,
  schedule?: Schedule;
  studentPhoto?: string;
  gpa?: string;
}

export interface CourseData {
  courseName: string,
  courseCode: string,
  courseElementId: string;
  sectionNumber: string,
  semesters: string,
  teacherName: string,
  roomNumber: string,
  grade: string | null,
  attendance: {
    absences: string,
    tardy: string,
    dismissal: string,
  },
  schedule?: object,
}

export namespace Schedules {
  export namespace Nomenclature {
    export type Day = 'M' | 'T' | 'W' | 'R' | 'F';
    export type DayAsNumber = 0 | 1 | 2 | 3 | 4;

    export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7;
    
    export type Code = `${Day}${Period}`;
  }

  export interface Block {
    schedule: ({
      day: Schedules.Nomenclature.Day,
      period: string,
    })[],
    course: Partial<Course>
  }

  export type Day = (Block)[][];

  export interface Structure {
    M: Day,
    T: Day,
    W: Day,
    R: Day,
    F: Day,
  }
}