import puppeteer, { Browser, Page } from 'puppeteer';
import ClientNotReadyError from './errors/ClientNotReady.js';
// import ClientNotReadyError from './errors/ClientNotReady.js';
import LoginFailedError from './errors/LoginFailed.js';
import Course from './classes/Course.js';
import { CourseSearchOptions, terms, ClassDetailSearchMethod, Category } from './types.js';

export default class Client {
  browser!: Browser;
  page!: Page;
  loggedIn: boolean;
  constructor() {
    this.loggedIn = false;
  }

  static #markingPeriods = new Map()
    .set('q1', 'GTMp1000026Gdh')
    .set('q2', 'GTMp1000026Gdi')
    .set('q3', 'GTMp1000026Gdj')
    .set('q4', 'GTMp1000026Gdk')
    .set('all', 'all');

  static #terms = Object.keys(Client.#markingPeriods);

  async init() {
    this.browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
    this.page = await this.browser.newPage();

    await this.page.goto('http://sis.mybps.org/aspen/logon.do');
  }

  async login(id: string, password: string) {
    await this.init();
    await this.page.type('input#username', id);
    await this.page.type('input#password', password);
    await this.page.evaluate(() => (<HTMLButtonElement>document.querySelector('#logonButton')).click())
      .then(() => this.page?.waitForNavigation({ waitUntil: 'networkidle2' }))
      .then(async () => {
        if (await this.page.$('div.messageText')) {
          throw new LoginFailedError();
        } else {
          this.loggedIn = true;
        }
      })
      .catch(() => {
        return 401;
      });
    return this;
  }

  #checkForClientReadiness() {
    if (!this.loggedIn) {
      throw new ClientNotReadyError('Try logging in first, then getting information.');
    }
  }

  async getStudentInfo() {
    this.#checkForClientReadiness();
    await this.page.goto('https://sis.mybps.org/aspen/gradePointSummary.do?navkey=myInfo.gradePoints.summary');
    await this.page.waitForSelector('#dataGrid');

    // weighted gpa (quarters)
    const _weightedGPA = await this.page.evaluate(() => {
      return (document.querySelector('#dataGrid > table > tbody')?.lastElementChild?.lastElementChild as HTMLTableCellElement)?.innerText;
    });
    
    await this.page.goto('http://sis.mybps.org/aspen/portalStudentDetail.do?navkey=myInfo.details.detail');
    this.page.waitForSelector('#mainTable');

    return Object.assign(await this.page.evaluate(() => {
      return {
        studentId: (document.querySelector('input[name="propertyValue(stdIDLocal)"]') as HTMLInputElement)?.value,
        // studentId: (table.querySelector('input[name="propertyValue(stdIDLocal)"]')).value,
        name: (document.querySelector('input[name="propertyValue(stdViewName)"]') as HTMLInputElement)?.value,
        school: {
          name: (document.querySelector('input[name="propertyValue(relStdSklOid_sklSchoolName)"]') as HTMLInputElement)?.value,
          id: (document.querySelector('input[name="propertyValue(relStdSklOid_sklSchoolID)"]') as HTMLInputElement)?.value,
          counselor: (document.querySelector('input[name="propertyValue(stdFieldB009)"]') as HTMLInputElement)?.value,
        },
        sasid: (document.querySelector('input[name="propertyValue(stdIDState)"]') as HTMLInputElement)?.value,
        grade: (document.querySelector('input[name="propertyValue(stdGradeLevel)"]') as HTMLInputElement)?.value,
        email: (document.querySelector('input[name="propertyValue(relStdPsnOid_psnEmail01)"]') as HTMLInputElement)?.value,
      };
    }), {
      gpa: _weightedGPA
    });
  }

  async getClasses (options: CourseSearchOptions) {
    this.#checkForClientReadiness();
    await this.page.goto('http://sis.mybps.org/aspen/portalClassList.do?navkey=academics.classes.list');
    await this.page.waitForSelector('#dataGrid');

    // selects year to view
    await this.page.select('select[name="yearFilter"]', options.year);
    await this.page.waitForSelector('#dataGrid');

    // selects the term to view
    await this.page.select('select[name="termFilter"]', Client.#markingPeriods.get(options.term));
    await this.page.waitForSelector('#dataGrid');

    return await this.page.evaluate(() => {
      const _rows = document.querySelectorAll('#dataGrid tr');
      const classes: (string[])[] = [];
      _rows.forEach(_row => {
        const course: string[] = [];
        _row.querySelectorAll('td').forEach(_col => {
          if (_col.id) {
            course.push(_col.id);
          }
          if (_col.innerText != 'Select current record checkbox') {
            course.push(_col.innerText);
          }
        });
        classes.push(course);
      });
      return classes;
    }).then(classes => {
      classes.shift();
      return classes.map((course) => {
        return new Course({
          courseName: course[1],
          courseElementId: course[0],
          courseCode: course[2].split('-')[0],
          sectionNumber: course[2],
          semesters: course[3],
          teacherName: course[4],
          roomNumber: course[5],
          grade: (course.length === 9 ? null : course[6]),
          attendance: {
            absences: (course[(course.length === 9 ? 6 : 7)]),
            tardy: (course[(course.length === 9 ? 7 : 8)]),
            dismissal: (course[(course.length === 9 ? 8 : 9)]),
          },
        });
      });
    });
  }

  async getClassDetailsByElementId(id: string, options?: CourseSearchOptions) {
    const _classes = await this.getClasses({ year: (options?.year || 'current'), term: (options?.term || 'all') });
    const _course = _classes.find(c => c.courseElementId === id);

    if (!_course) return null;

    Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click(`#${_course?.courseElementId} > a`),
    ]);

    await this.page.waitForSelector('#dataGridRight');

    const _propertySelectors = {
      teacherEmail: 'input[name="propertyValue(relSscMstOid_relMstStfPrim_relStfPsnOid_psnEmail01)"]',
      classSize: 'input[name="propertyValue(relSscMstOid_mstEnrTotal)"]',
    };

    const _classDetails = await this.page.evaluate((_properties) => {
      const _categories: Category[] = [].slice
        .call(document.querySelectorAll('#dataGridRight > table > tbody > tr > td[rowspan]'))
        .map((_category: HTMLTableCellElement) => {
          const _categoryName = _category.innerText;
          const _averages: number[] = [].slice
            .call(_category.parentElement?.nextElementSibling?.querySelectorAll('td'))
            .map((_avg: HTMLTableCellElement) => {
              return parseFloat(_avg.innerText);
            });
          _averages.shift();
        
          const _weights: number[] = [].slice
            .call((_category.parentElement?.querySelectorAll('td')))
            .map((_wgt: HTMLTableCellElement) => {
              return parseFloat(_wgt.innerText);
            });
          _weights.shift();
          _weights.shift();

          return {
            name: _categoryName,
            terms: {
              q1: {
                weight: _weights[0],
                average: _averages[0],
              },
              q2: {
                weight: _weights[1],
                average: _averages[1],
              },
              q3: {
                weight: _weights[2],
                average: _averages[2]
              },
              q4: {
                weight: _weights[3],
                average: _averages[3]
              },
            },
          };
        });

      return {
        teacherEmail: (document.querySelector(_properties.teacherEmail) as HTMLInputElement).value,
        classSize: parseInt((document.querySelector(_properties.classSize) as HTMLInputElement).value),
        categories: _categories,
      };
    }, _propertySelectors);

    return Object.assign(_course, _classDetails);
  }

  async getClassDetails(method: ClassDetailSearchMethod, searchValue: string, options?: CourseSearchOptions) {
    const _classes = await this.getClasses({ year: (options?.year || 'current'), term: (options?.term || 'all')});

    const _course = _classes.find(course => {
      // returns a falsy value (0) if it doesnt come up, and indices will be 1+ (therefore truthy)
      return course[method].toLowerCase().indexOf(searchValue.toLowerCase()) + 1;
    });

    if (!_course) {
      return null;
    }

    Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click(`#${_course?.courseElementId} > a`),
    ]);

    await this.page.waitForSelector('#dataGridRight');

    const _propertySelectors = {
      teacherEmail: 'input[name="propertyValue(relSscMstOid_relMstStfPrim_relStfPsnOid_psnEmail01)"]',
      classSize: 'input[name="propertyValue(relSscMstOid_mstEnrTotal)"]',
    };

    const _classDetails = await this.page.evaluate((_properties) => {
      const _categories: Category[] = [].slice
        .call(document.querySelectorAll('#dataGridRight > table > tbody > tr > td[rowspan]'))
        .map((_category: HTMLTableCellElement) => {
          const _categoryName = _category.innerText;
          const _averages: number[] = [].slice
            .call(_category.parentElement?.nextElementSibling?.querySelectorAll('td'))
            .map((_avg: HTMLTableCellElement) => {
              return parseFloat(_avg.innerText);
            });
          _averages.shift();
        
          const _weights: number[] = [].slice
            .call((_category.parentElement?.querySelectorAll('td')))
            .map((_wgt: HTMLTableCellElement) => {
              return parseFloat(_wgt.innerText);
            });
          _weights.shift();
          _weights.shift();

          return {
            name: _categoryName,
            terms: {
              q1: {
                weight: _weights[0],
                average: _averages[0],
              },
              q2: {
                weight: _weights[1],
                average: _averages[1],
              },
              q3: {
                weight: _weights[2],
                average: _averages[2]
              },
              q4: {
                weight: _weights[3],
                average: _averages[3]
              },
            },
          };
        });

      return {
        teacherEmail: (document.querySelector(_properties.teacherEmail) as HTMLInputElement).value,
        classSize: parseInt((document.querySelector(_properties.classSize) as HTMLInputElement).value),
        categories: _categories,
      };
    }, _propertySelectors);

    return Object.assign(_course, _classDetails);
  }

  async getAssignments(
    course: {
      method: ClassDetailSearchMethod,
      search: string,
      options?: CourseSearchOptions
    },
    assignmentFilter: {
      term: terms
    },
  ){
    const { method, search, options } = course;
    const _course = await this.getClassDetails(method, search, options);
    
    Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click('#layoutVerticalTabs > table > tbody > tr:nth-child(2) > td > div > a'),
    ]);

    await this.page.waitForSelector('#gradeTermOid');

    // TODO: fix this select (the selector is wrong)
    await this.page.select('#gradeTermOid', Client.#markingPeriods.get(assignmentFilter.term));
    await this.page.waitForSelector('#dataGrid > table');
  
    return await this.page.evaluate((_course) => {
      const _assignments = [].slice
        .call(document.querySelectorAll('#dataGrid > table > tbody > tr'))
        .map((_assignment: HTMLTableRowElement) => {
          const _cols: string[] = [].slice
            .call(_assignment.querySelectorAll('td'))
            .map((td: HTMLTableCellElement) => td.innerText);
          
          return {
            assignmentName: _cols[1],
            category: _course?.categories.find((_category) => _category.name === _cols[2] ),
            dateAssigned: _cols[3],
            dateDue: _cols[4],
            score: {
              percent: parseFloat(_cols[5]?.split('\t')[0]),
              fraction: _cols[5]?.split('\t')[1],
              raw: parseFloat(_cols[5]?.split('\t')[2].replace('(', '').replace(')', '')),
            }
          };
        });

      _assignments.shift();

      return _assignments;
    }, _course);
  }

  async getSchedule() {
    this.#checkForClientReadiness();
    await this.page.goto('https://sis.mybps.org/aspen/studentScheduleContextList.do?navkey=myInfo.sch.list&forceRedirect=false');
    await this.page.waitForSelector('#dataGrid > table');
    const result = await this.page.evaluate(() => {
      const schedule: string[][] = [];
      const rows = document.querySelectorAll('#dataGrid > table > tbody > tr.listCell');
      console.log(rows);
      rows.forEach(course => {
        const list: string[] = [];
        Array.from(course.getElementsByTagName('td')).forEach(col => {
          list.push(col.innerText);
        });
        schedule.push(list.slice(2));
      });
      return schedule;
    });
    
    const scheduleByClass = result.map((course: string[]) => {
      const schedule = course[2].trim().split(' ').map(day => {
        const periodRegex = /\(([^)]+)\)/;
        const dayRegex = /^([a-zA-Z])\(.*\)$/;
        return {
          day: (day.match(dayRegex)?.toString().split(',')[1] as ('M' | 'T' | 'W' | 'R' | 'F')),
          period: (day.match(periodRegex)?.toString().split(',')[1] as (string)),
        };
      });
      console.log(schedule);
      return {
        name: course[0],
        term: course[1],
        schedule: schedule,
        location: course[3],
        teacher: course[4],
      };
    });

    const fullSchedule = (() => {
      const structure: {  M: (object | object[])[], T: (object | object[])[], W: (object | object[])[], R: (object | object[])[], F: (object | object[])[] } = {
        M: [],
        T: [],
        W: [],
        R: [],
        F: [],
      };

      scheduleByClass.flat().forEach(course => {
        if (!course.schedule[0].day) return;
        for (const meeting of course.schedule) {
          structure[meeting.day][parseInt(meeting.period) - 1] = course;
          // if (meeting.day && meeting.period) {
          //   console.log(structure[meeting.day][parseInt(meeting.period) - 1]);
          //   if (structure[meeting.day][parseInt(meeting.period) - 1] && !Array.isArray(structure[meeting.day][parseInt(meeting.period) - 1])) {
          //     structure[meeting.day][parseInt(meeting.period) - 1] = [structure[meeting.day][parseInt(meeting.period) - 1], {
          //       name: course.name,
          //       term: course.term,
          //       location: course.location,
          //       teacher: course.teacher,
          //     }];
          //   } else {
          //     (structure[meeting.day][parseInt(meeting.period) - 1] as object[]).push({
          //       name: course.name,
          //       term: course.term,
          //       location: course.location,
          //       teacher: course.teacher,
          //     });
          //   }
          // } else {
          //   structure[meeting.day][parseInt(meeting.period) - 1] = {
          //     name: course.name,
          //     term: course.term,
          //     location: course.location,
          //     teacher: course.teacher,
          //   };
          // }
        }
      });
      
      return structure;
    })();
    return fullSchedule;
  }
}