import { CourseData } from '../types';

interface AttendanceChart {
  absences: number,
  tardy: number,
  dismissal: number,
}

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

  constructor(data: CourseData) {
    const { courseName, courseCode, courseElementId, sectionNumber, semesters, teacherName, roomNumber, grade, attendance } = data;
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
  }
}