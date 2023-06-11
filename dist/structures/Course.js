export default class Course {
    constructor(data) {
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
export class PartialCourse {
    constructor(data) {
        this.courseName = data.courseName;
        this.courseElementId = data.courseElementId;
        this.courseCode = data.courseCode;
        this.sectionNumber = data.sectionNumber;
        this.semesters = data.semesters;
        this.teacherName = data.teacherName;
        this.roomNumber = data.roomNumber;
        this.grade = data.grade;
        this.attendance = data.attendance;
        this.schedule = data.schedule;
    }
}
