namespace Structures {
  /**
   * An object representing previously fetched data on a `Session`. Can be used to prevent performing an expensive task, like fetching a schedule.
   */
  export interface SessionCache {
    courses?: Course[];
    schedule?: Schedule;
    profile?: Student;
    assessments?: MajorAssessment[];
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

  /**
   * Represents a student in Aspen SIS.
   */
  export class Student {
    studentId: string;
    name: string;
    school: { name: string, id: string, counselor: string };
    sasid: string;
    grade: number;
    email: string;
    schedule?: Schedule;
    studentPhoto?: string;
    gpa?: string;
  
    constructor(data: UserData) {
      const { studentId, name, school, sasid, grade, email, gpa, studentPhoto } = data;
      this.studentId = studentId;
      this.name = name;
      this.school = school;
      this.sasid = sasid;
      this.grade = parseInt(grade);
      this.email = email;
      this.gpa = gpa;
      this.studentPhoto = studentPhoto;
    }
  
    loadSchedule(schedule: Schedule): this {
      this.schedule = schedule;
      return this;
    }
  }

  /**
   * An object representing the absences, tardies, and early dismissals from a given course.
   */
  export interface AttendanceChart {
    absences: number,
    tardy: number,
    dismissal: number,
  }

  /**
   * 
   */
  export namespace ScheduleClassifiers {
    export namespace Nomenclature {
      export type Day = 'M' | 'T' | 'W' | 'R' | 'F';
      export type DayAsNumber = 0 | 1 | 2 | 3 | 4;
  
      export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7;
      
      export type Code = `${Day}${Period}`;
    }
  
    export interface Block {
      schedule: ({
        day: ScheduleClassifiers.Nomenclature.Day,
        period: string,
      })[],
      course: Partial<Course>
    }
  
    export type Day = (Block)[][];
  
    export interface BaseSchedule {
      M: Day,
      T: Day,
      W: Day,
      R: Day,
      F: Day,
    }
  }

  /**
   * A schedule object representing five days, Monday through Friday.
   */
  export class Schedule {
    M: ScheduleClassifiers.Day;
    T: ScheduleClassifiers.Day;
    W: ScheduleClassifiers.Day;
    R: ScheduleClassifiers.Day;
    F: ScheduleClassifiers.Day;
  
    constructor(schedule: ScheduleClassifiers.BaseSchedule) {
      this.M = schedule.M;
      this.T = schedule.T;
      this.W = schedule.W;
      this.R = schedule.R;
      this.F = schedule.F;
    }
  
    getDay(day: (ScheduleClassifiers.Nomenclature.Day | ScheduleClassifiers.Nomenclature.DayAsNumber)): ScheduleClassifiers.Day {
      if (typeof day === 'number') {
        day = ['M', 'T', 'W', 'R', 'F'][day] as ScheduleClassifiers.Nomenclature.Day;
      }
      return this[day];
    }
    
    getPeriod(code: ScheduleClassifiers.Nomenclature.Code) {
      const day: ScheduleClassifiers.Nomenclature.Day = code[0] as ScheduleClassifiers.Nomenclature.Day,
        period: ScheduleClassifiers.Nomenclature.Period = parseInt(code[1]) as ScheduleClassifiers.Nomenclature.Period;
      return this[day][period];
    }
  
    /**
     * 
     * @param period
     * @returns The time of which the period ends
     */
    getTimeOfPeriod(period: ScheduleClassifiers.Nomenclature.Period) {
      switch(period) {
      case 1:
        return '7:29 - 8:16';
      case 2:
        return '8:19 - 9:06';
      case 3:
        return '9:09 - 9:56';
      case 4:
        return '9:59 - 11:10';
      case 5:
        return '11:13 - 12:00';
      case 6:
        return '12:03 - 12:50';
      case 7:
        return '12:50 - 1:40';
      }
    }
  
    /**
     * Populates the schedule with extra course data for each block, such as section number.
     * 
     * NOTE: It is **strongly recommended** to use the **full year course load** with the { term: all } option when passing in a course load (ex. `Session.getCourses({ year: 'current', term: 'all' })`) to avoid partial courses being returned due to them being in a different term.
     * @param courseLoad An array of courses, usually obtained through `Session.getCourses()`
     * @returns a `Schedule` with populated courses
     */
    loadCourses(courseLoad: Structures.Course[]) {
      for (const course of courseLoad) {
        for (const day of [this.M, this.T, this.W, this.R, this.F]) {
          day.forEach(period => {
            period.forEach(block => {
              if (block.course.courseName === course.courseName) {
                block.course = {
                  ...course,
                  ...block.course,
                  schedule: {
                    ...block.schedule
                  }
                };
              }
            });
          });
        }
      }
      return this;
    }
  }

  export type MarkingTerms = 'q1' | 'q2' | 'q3' | 'q4'

  /**
   * Search options when filtering for `Course`s in either the current/previous year across one or all `MarkingTerms`.
   */
  export interface CourseSearchOptions {
    year: 'current' | 'previous'
    term: MarkingTerms | 'all'
  }

  export type ClassDetailSearchMethod = 'courseName' | 'teacherName' | 'courseCode' | 'sectionNumber';
  
  export interface GradingCategory {
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

  export class Course {
    courseName: string;
    courseElementId: string;
    courseCode: string;
    sectionNumber: string;
    semesters: string;
    teacherName: string;
    roomNumber: string;
    grade: string | null;
    attendance: AttendanceChart;
    schedule: object | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories?: any[];
  
    constructor(data: CourseData) {
      const { courseName, courseCode, courseElementId, sectionNumber, semesters, teacherName, roomNumber, grade, attendance, schedule } = data;
      this.courseName = courseName;
      this.courseCode = courseCode;
      this.courseElementId = courseElementId;
      this.sectionNumber = sectionNumber;
      this.semesters = semesters;
      this.teacherName = teacherName;
      this.roomNumber = roomNumber;
      this.grade = grade;
      this.attendance = {
        absences: parseInt(attendance.absences),
        tardy: parseInt(attendance.tardy),
        dismissal: parseInt(attendance.dismissal),
      };
      this.schedule = schedule || null;
    }
  }

  export interface MajorAssessmentData {
    name: string;
    schoolYear: string;
    rawScore: number;
    scaleScore: number;
    performanceLevel: string;
  }
  
  export interface MCASData extends MajorAssessmentData {
    performanceLevel: 'NM' | 'PM' | 'M' | 'E' | 'P' | 'A' | 'NI' | 'F';
  }

  export class MajorAssessment {
    name: string;
    schoolYear: string;
    rawScore: number;
    scaleScore: number;
    performanceLevel: string;
  
    constructor(data: MajorAssessmentData) {
      this.name = data.name;
      this.schoolYear = data.schoolYear;
      this.rawScore = data.rawScore;
      this.scaleScore = data.scaleScore;
      this.performanceLevel = data.performanceLevel;
    }
  }
  
  export class MCAS extends MajorAssessment {
    performanceLevel: 'NM' | 'PM' | 'M' | 'E' | 'P' | 'A' | 'NI' | 'F';
    subject?: string;

    constructor (data: MCASData) {
      super({
        ...data,
        name: 'MCAS',
      });
      this.performanceLevel = data.performanceLevel;
      this.subject;
    }
  
    getAchievementLevel(): string {
      switch (this.performanceLevel) {
      case 'NM':
        return 'Not Meeting Expectations';
      case 'PM':
        return 'Partially Meeting Expectations';
      case 'M':
        return 'Meeting Expectations';
      case 'E':
        return 'Exceeding Expectations';
      case 'A':
        return 'Advanced';
      case 'P':
        return 'Proficient';
      case 'NI':
        return 'Needs Improvement';
      case 'F':
        return 'Failing';
      }
    }
  }
}

export default Structures;