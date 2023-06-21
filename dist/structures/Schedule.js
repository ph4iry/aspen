export default class Schedule {
    constructor(schedule) {
        this.M = schedule.M;
        this.T = schedule.T;
        this.W = schedule.W;
        this.R = schedule.R;
        this.F = schedule.F;
    }
    getDay(day) {
        if (typeof day === 'number') {
            day = ['M', 'T', 'W', 'R', 'F'][day];
        }
        return this[day];
    }
    getPeriod(code) {
        const day = code[0], period = parseInt(code[1]);
        return this[day][period];
    }
    /**
     *
     * @param period
     * @returns The time of which the period ends
     */
    getTimeOfPeriod(period) {
        switch (period) {
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
    loadCourses(courseLoad) {
        for (const course of courseLoad) {
            for (const day of [this.M, this.T, this.W, this.R, this.F]) {
                day.forEach(period => {
                    period.forEach(block => {
                        if (block.course.courseName === course.courseName) {
                            block.course = Object.assign(Object.assign(Object.assign({}, course), block.course), { schedule: Object.assign({}, block.schedule) });
                        }
                    });
                });
            }
        }
        return this;
    }
}
