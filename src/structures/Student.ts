import { UserData } from '../types';
import Schedule from './Schedule';

export default class Student {
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