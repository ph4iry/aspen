import Course from './Course';

import { Schedules } from '../types.js';

export default class Schedule {
  M: Schedules.Day;
  T: Schedules.Day;
  W: Schedules.Day;
  R: Schedules.Day;
  F: Schedules.Day;

  constructor(schedule: Schedules.Structure) {
    this.M = schedule.M;
    this.T = schedule.T;
    this.W = schedule.W;
    this.R = schedule.R;
    this.F = schedule.F;
  }

  getDay(day: (Schedules.Nomenclature.Day | Schedules.Nomenclature.DayAsNumber)): Schedules.Day {
    if (typeof day === 'number') {
      day = ['M', 'T', 'W', 'R', 'F'][day] as Schedules.Nomenclature.Day;
    }
    return this[day];
  }
  
  getPeriod(code: Schedules.Nomenclature.Code) {
    const day: Schedules.Nomenclature.Day = code[0] as Schedules.Nomenclature.Day,
      period: Schedules.Nomenclature.Period = parseInt(code[1]) as Schedules.Nomenclature.Period;
    return this[day][period];
  }

  /**
   * 
   * @param period
   * @returns The time of which the period ends
   */
  getTimeOfPeriod(period: Schedules.Nomenclature.Period) {
    switch(period) {
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
  loadCourses(courseLoad: Course[]) {
    for (const course of courseLoad) {
      for (const day of [this.M, this.T, this.W, this.R, this.F]) {
        day.forEach(period => {
          period.forEach(block => {
            if (block.course.courseName === course.courseName) {
              block.course = {
                ...course,
                ...block.course,
                schedule: {
                  ...block.schedule
                }
              };
            }
          });
        });
      }
    }
    return this;
  }
}