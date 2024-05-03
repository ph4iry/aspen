import pTypes from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Structures from './structures.js';

type Day = Structures.ScheduleClassifiers.Day;

interface SessionCache {
  courses?: Structures.Course[];
  schedule?: Structures.Schedule;
  profile?: Structures.Student;
  assessments?: Structures.MajorAssessment[];
}

export default class Session {
  username: string;
  pass: string;
  browser!: pTypes.Browser;
  page!: pTypes.Page;
  loggedIn: boolean;
  cache: SessionCache;

  constructor(email: string, password: string) {
    if(email.toLowerCase().includes('@bostonk12.org')) {
      this.username = email.substring(0, email.indexOf('@bostonk12.org'));
    } else {
      this.username = email;
    }
    this.pass = password;
    this.loggedIn = false;
    this.cache = {};
  }

  static #markingPeriods = new Map()
    .set('q1', 'GTMp1000026Gdh')
    .set('q2', 'GTMp1000026Gdi')
    .set('q3', 'GTMp1000026Gdj')
    .set('q4', 'GTMp1000026Gdk')
    .set('all', 'all');

  async init() {
    puppeteer.use(StealthPlugin());

    this.browser = await puppeteer.launch({ args: ['--no-sandbox'], headless: true });
    this.page = await this.browser.newPage();
    await this.page.setViewport({ width: 800, height: 600 });

    await this.page.goto('https://sis.mybps.org/aspen/logon.do');
    await this.page.click('#ssoButton');
    await this.page.waitForNavigation();
    await this.page.type('input[type="email"]', `${this.username}@bostonk12.org`);
    await this.page.click('div[id="identifierNext"]');
    await this.page.waitForTimeout(2000); // Wait for the password field to appear
    await this.page.type('input[type="password"]', this.pass);
    await this.page.click('div[id="passwordNext"]');
    await this.page.waitForNavigation({ waitUntil: 'networkidle2' }).then(() => {
      this.loggedIn = true;
    });

    return this;
  }

  private checkValidity(): void | never {
    if (!this.loggedIn) {
      throw new Error('Not logged in');
    }
    if (!this.page) {
      this.init();
    }
  }

  async getStudentInfo(): Promise<Structures.Student> {
    // this.checkValidity();
    await this.page.goto('https://sis.mybps.org/aspen/gradePointSummary.do?navkey=myInfo.gradePoints.summary');
    await this.page.waitForSelector('#dataGrid');

    // weighted gpa (quarters)
    const _weightedGPA = await this.page.evaluate(() => {
      return (document.querySelector('#dataGrid > table > tbody')?.lastElementChild?.lastElementChild as HTMLTableCellElement)?.innerText;
    });
    
    
    await this.page.goto('https://sis.mybps.org/aspen/portalStudentDetail.do?navkey=myInfo.details.detail');

    await this.page.click('#contentArea > table:nth-child(2) > tbody > tr:nth-child(1) > td.contentContainer > table:nth-child(7) > tbody > tr:nth-child(3) > td > table > tbody > tr > td:nth-child(2) > a')
      .then(async () => await this.page.waitForSelector('#propertyValue\\(relStdPsnOid_psnPhoOIDPrim\\)-span > img'));

    const _photo = await this.page.evaluate(() => {
      return (document.querySelector('#propertyValue\\(relStdPsnOid_psnPhoOIDPrim\\)-span > img') as HTMLImageElement).src;
    });

    await this.page.goto('https://sis.mybps.org/aspen/portalStudentDetail.do?navkey=myInfo.details.detail');

    await this.page.waitForSelector('#mainTable');

    const profile = new Structures.Student(Object.assign(await this.page.evaluate(() => {
      const primary = {
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

      return primary; // document.querySelector("#propertyValue\\(relStdPsnOid_psnPhoOIDPrim\\)-span > img")
    }), {
      gpa: _weightedGPA,
      studentPhoto: _photo,
    }));

    this.cache.profile = profile;

    return profile;
  }

  async getClasses (options: Structures.CourseSearchOptions): Promise<Structures.Course[]> {
    this.checkValidity();
    await this.page.goto('https://sis.mybps.org/aspen/portalClassList.do?navkey=academics.classes.list');
    await this.page.waitForSelector('#dataGrid');

    // selects year to view
    await this.page.select('select[name="yearFilter"]', options.year);
    await this.page.waitForSelector('#dataGrid');

    // selects the term to view
    await this.page.select('select[name="termFilter"]', Session.#markingPeriods.get(options.term));
    await this.page.waitForSelector('#dataGrid');

    this.cache.courses = await this.page.evaluate(() => {
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
        return new Structures.Course({
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

    return this.cache.courses;
  }

  async getClassDetailsByElementId(id: string, options?: Structures.CourseSearchOptions) {
    const _classes = this.cache.courses || await this.getClasses({ year: (options?.year || 'current'), term: (options?.term || 'all') });
    let _course = _classes.find(c => c.courseElementId === id);

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
      const _categories: Structures.GradingCategory[] = [].slice
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

    _course = Object.assign(_course, _classDetails);
    return _course;

  }

  async getClassDetails(method: Structures.ClassDetailSearchMethod, searchValue: string, options?: Structures.CourseSearchOptions) {
    const _classes = this.cache.courses || await this.getClasses({ year: (options?.year || 'current'), term: (options?.term || 'all')});

    let _course = _classes.find(course => {
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
      const _categories: Structures.GradingCategory[] = [].slice
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

    _course = Object.assign(_course, _classDetails);
    return _course;
  }

  async getAssignments(
    course: {
      method: Structures.ClassDetailSearchMethod,
      search: string,
      options?: Structures.CourseSearchOptions
    },
    assignmentFilter: {
      term: Structures.MarkingTerms
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
    await this.page.select('#gradeTermOid', Session.#markingPeriods.get(assignmentFilter.term));
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
            category: _course?.categories!.find((_category) => _category.name === _cols[2]),
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

  async getSchedule(): Promise<Structures.Schedule> {
    this.checkValidity();
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
      return {
        schedule: schedule,
        course: {
          courseName: course[0],
          semesters: course[1],
          roomNumber: course[3],
          teacherName: course[4],
        }
      };
    });

    const fullSchedule = (() => {
      const structure: {  M: Day, T: Day, W: Day, R: Day, F: Day } = {
        M: [[], [], [], [], [], [], []],
        T: [[], [], [], [], [], [], []],
        W: [[], [], [], [], [], [], []],
        R: [[], [], [], [], [], [], []],
        F: [[], [], [], [], [], [], []],
      };

      scheduleByClass.flat().forEach(course => {
        if (!course.schedule[0].day) return;
        for (const meeting of course.schedule) {
          structure[meeting.day][parseInt(meeting.period) - 1].push(course);
        }
      });
      
      return structure;
    })();
    const schedule = new Structures.Schedule(fullSchedule);

    this.cache.schedule = schedule;
    return schedule;
  }

  /**
   * 
   * @returns A number from 0-100 representing the percentage of progress made towards graduation.
   */
  async getGraduationProgress(): Promise<number> {
    this.checkValidity();
    await this.page.goto('https://sis.mybps.org/aspen/transcriptList.do?navkey=myInfo.trn.list');
    await this.page.waitForSelector('#layoutVerticalTabs > table > tbody > tr:nth-child(2) > td > div:nth-child(10) > a');

    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.click('#layoutVerticalTabs > table > tbody > tr:nth-child(2) > td > div:nth-child(10) > a'),
    ]);
    
    await Promise.all([
      this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
      this.page.select('#selectedProgramStudiesOid', 'GPR000001wUaN6'),
    ]);

    return await this.page.evaluate(() => {
      const mainTable = document.querySelector('#contentArea > table:nth-child(2) > tbody > tr:nth-child(1) > td.contentContainer > table:nth-child(4) > tbody > tr:nth-child(7) > td > table > tbody > tr > td > div > table > tbody');
      // const 
      const lastRow = mainTable!.querySelector('#contentArea > table:nth-child(2) > tbody > tr:nth-child(1) > td.contentContainer > table:nth-child(4) > tbody > tr:nth-child(7) > td > table > tbody > tr > td > div > table > tbody > tr:nth-child(10)');
      return parseInt((lastRow?.querySelector('th:last-child') as HTMLTableCellElement).innerText);
    });
    // await this.page.evaluate(() => {
    //   (document.querySelector('#layoutVerticalTabs > table > tbody > tr:nth-child(2) > td > div:nth-child(10) > a') as HTMLAnchorElement).click();
    // }).then(() => this.page.waitForNavigation());
  }

  async getAssessments() {
    this.checkValidity();
    await this.page.goto('https://sis.mybps.org/aspen/assessmentList.do?navkey=myInfo.asm.list');
    await this.page.waitForSelector('#dataGrid > table > tbody');

    const assessments = await this.page.evaluate(() => {
      const _rows = Array.from(document.querySelector('#dataGrid > table > tbody')!.querySelectorAll('tr'));
      _rows.shift();
      return _rows.map(tr => {
        const cells = Array.from(tr.querySelectorAll('td'));
        cells.shift();

        return cells;
      }).map(cells => {
        const ASSESSMENT_DATA = cells.map(c => c.innerText);
        return {
          name: ASSESSMENT_DATA[1],
          schoolYear: ASSESSMENT_DATA[0],
          rawScore: parseFloat(ASSESSMENT_DATA[2]),
          scaleScore: parseFloat(ASSESSMENT_DATA[3]),
          performanceLevel: ASSESSMENT_DATA[4],
        };
      });
    });

    const result = assessments.map(test => {
      // add support for more unique exams & test details such as subject for mcas tests
      switch(test.name) {
      case 'MCAS':
        return new Structures.MCAS({
          ...test,
          performanceLevel: test.performanceLevel as 'NM' | 'PM' | 'M' | 'E' | 'P' | 'A' | 'NI' | 'F',
        });
      default:
        return new Structures.MajorAssessment(test);
      }
    });

    this.cache.assessments = result;
  }

  // async getCourseRequests(table: 'build-yr' | 'current-yr') {

  // }

  async exit() {
    this.browser.close();
  }
}