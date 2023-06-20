import { CourseData } from '../types';

export interface AttendanceChart {
  absences: number,
  tardy: number,
  dismissal: number,
}

// interface GradeBook {
//   categories: 
// }

export default class Course {
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

export type PartialCourse = Partial<Course>