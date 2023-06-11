class Schedule {
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
}
Schedule.DURATIONS = {};
export default Schedule;
