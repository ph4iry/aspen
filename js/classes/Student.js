export default class Student {
    constructor(data) {
        const { studentId, name, school, sasid, grade, email } = data;
        this.studentId = studentId;
        this.name = name;
        this.school = school;
        this.sasid = sasid;
        this.grade = parseInt(grade);
        this.email = email;
    }
}
