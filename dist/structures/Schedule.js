export default class Schedule {
    constructor(schedule) {
        this.M = schedule.M;
        this.T = schedule.T;
        this.W = schedule.W;
        this.R = schedule.R;
        this.F = schedule.F;
    }
    getDay(day) {
        return this[day];
    }
    getPeriod(code) {
        const day = code[0], period = parseInt(code[1]);
        return this[day][period];
    }
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
     * Populates the schedule with extra course data, such as section number.
     * @param courseLoad An array of courses, usually obtained through `Session.getCourses()`
     * @returns a `Schedule` with populated courses
     */
    loadCourses(courseLoad) {
        for (const course of courseLoad) {
            console.log('name', course.courseName);
            const allBlocks = [this.M, this.T, this.W, this.R, this.F].flat(4);
            for (const day of [this.M, this.T, this.W, this.R, this.F]) {
                day.forEach(period => {
                    period.map(block => {
                        const corresponding = period.find(b => b.course.courseName === course.courseName && b.course.roomNumber === course.roomNumber);
                        // if (corresponding) {
                        //   corresponding.course = {
                        //     ...course,
                        //     ...corresponding.course,
                        //     schedule: {
                        //       ...corresponding.schedule
                        //     }
                        //   };
                        // }
                    });
                    // period.forEach(block => {
                    //   block.course = {
                    //     ...course,
                    //     ...block.course,
                    //   };
                    // });
                });
                // const correspondingBlocks = allBlocks.filter(block => {
                //   return block.course.courseName === course.courseName && block.course.roomNumber && course.roomNumber;
                // });
                // console.log(correspondingBlocks.map(c => `${c.course.courseName}${c.course.roomNumber}`));
                // correspondingBlocks.forEach(block => {
                //   console.log(block.course.courseName, block.course.roomNumber);
                //   block.course = {
                //     ...course,
                //     schedule: block.schedule,
                //   };
                // });
            }
        }
        return this;
    }
}
