import { UserData } from '../types';

export default class Student {
  studentId: string;
  name: string;
  school: { name: string, id: string, counselor: string };
  sasid: string;
  grade: number;
  email: string;

  constructor(data: UserData) {
    const { studentId, name, school, sasid, grade, email } = data;
    this.studentId = studentId;
    this.name = name;
    this.school = school;
    this.sasid = sasid;
    this.grade = parseInt(grade);
    this.email = email;
  }
}