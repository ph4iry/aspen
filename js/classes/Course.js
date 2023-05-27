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
