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