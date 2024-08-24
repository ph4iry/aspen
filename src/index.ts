import { Browser, Page } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

interface SessionCache {
  courses: {
    previous: Structures.Course[],
    current: Structures.Course[],
  };
  schedule: Structures.Schedule | null;
  profile: Structures.Student | null;
  assessments: Structures.MajorAssessment[] | null;
}

export class Session {
  username: string;
  pass: string;
  browser!: Browser;
  page!: Page;
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
    this.cache = {
      courses: { previous: [], current: [] },
      schedule: null,
      profile: null,
      assessments: null,
    };
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
    await this.page.waitForSelector('div[id="passwordNext"]');
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

  async getStudentInfo(useCache = true): Promise<Structures.Student> {
    if (this.cache.profile && useCache) return this.cache.profile;
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
    if (this.cache.courses[options.year] && options.useCache) return this.cache.courses[options.year]!;
    this.checkValidity();
    await this.page.goto('https://sis.mybps.org/aspen/portalClassList.do?navkey=academics.classes.list');
    await this.page.waitForSelector('#dataGrid');

    // selects year to view
    await this.page.select('select[name="yearFilter"]', options.year);
    await this.page.waitForSelector('#dataGrid');

    // selects the term to view
    await this.page.select('select[name="termFilter"]', Session.#markingPeriods.get(options.term));
    await this.page.waitForSelector('#dataGrid');

    const courses = await this.page.evaluate(() => {
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

      try {
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
              absences: (course[(course.length === 9 ? 6 : 7)]) as `${number}`,
              tardy: (course[(course.length === 9 ? 7 : 8)]) as `${number}`,
              dismissal: (course[(course.length === 9 ? 8 : 9)]) as `${number}`,
            },
          });
        });
      } catch {
        return [];
      }
    });

    this.cache.courses = { previous: [], current: [] };
    this.cache.courses[options.year] = courses;

    return courses;
  }

  async getClassDetailsByElementId(id: string, options?: Structures.CourseSearchOptions) {
    const _classes = this.cache.courses[options?.year || 'current'] || await this.getClasses({ year: (options?.year || 'current'), term: (options?.term || 'all') });
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

    let _course = _classes[options?.year || 'current'].find(course => {
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
  ) {
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

  async getSchedule(useCache = true) { // : Promise<Structures.Schedule> {
    if (this.cache.schedule && useCache) return this.cache.schedule;

    this.checkValidity();
    await this.page.goto('https://sis.mybps.org/aspen/studentScheduleContextList.do?navkey=myInfo.sch.list&forceRedirect=false');
    await this.page.waitForSelector('.listGridFixed > table table > tbody > tr');

    const ScheduleStructure = Structures.Schedule;
    const Course = Structures.Course;
    
    const schedule = await this.page.evaluate((stringifiedScheduleStructure, stringifiedCourseDefinition, courseCache) => {
      eval('window.ScheduleStructure = ' + stringifiedScheduleStructure);
      eval('window.Course = ' + stringifiedCourseDefinition);
      // each row (including number... idk)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function rowToColumnMajor(matrix: any[][]): any[][] {
        const numRows = matrix.length;
        const numCols = matrix[0].length;
    
        // Create a new matrix with switched dimensions
        const columnMajorMatrix = Array.from({ length: numCols }, () => Array(numRows).fill(null));
    
        // Populate the new matrix
        for (let i = 0; i < numRows; i++) {
          for (let j = 0; j < numCols; j++) {
            columnMajorMatrix[j][i] = matrix[i][j];
          }
        }
    
        return columnMajorMatrix;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function isRectangular(matrix: any[][]): boolean {
        if (matrix.length === 0) return false; // An empty matrix is not considered rectangular
      
        const rowLength = matrix[0].length;
        for (let i = 1; i < matrix.length; i++) {
          if (matrix[i].length !== rowLength) {
            return false; // Found a row with a different length
          }
        }
        return true; // All rows have the same length
      }

      const rows = (Array.from(document.querySelectorAll('.listGridFixed > table:nth-child(1) > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(1) > table:nth-child(1) > tbody:nth-child(1) > tr:not(.listHeader)')) as HTMLTableRowElement[])
        .map(row => {
          const res: HTMLTableCellElement[] = Array.from(row?.querySelectorAll(':scope > td'));
          return res;
        });

      if (!isRectangular(rows)) {
        rows.map((tableRow: HTMLTableCellElement[], rowNumber: number) => {
          tableRow.forEach((cell, columnNumber) => {
            if (cell.rowSpan > 1) {
              cell.setAttribute('rowspan', '1');
              rows[rowNumber + 1].splice(columnNumber, 0, cell);
            }
          });
          return tableRow;
        });
      }

      // console.log('did i fix it??', isRectangular(rows));
      
      const tableByColumns: HTMLTableCellElement[][] = rowToColumnMajor(rows);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const scheduleAsCourseCollection: any[][] = tableByColumns.map(c => c.map(cell => {
        const dataToFormat = cell.innerText.split('\n');
        const [courseCode, sectionNumber] = dataToFormat[0].split('-');
        const courseName = dataToFormat[1];
        const teacherName = dataToFormat[2];
        const roomNumber = dataToFormat[3];
        const semesters = dataToFormat[4];

        console.log(courseCode, sectionNumber, courseName, teacherName, roomNumber, semesters);

        return {
          ...(courseCache.current.find(c => c.courseCode === courseCode && c.sectionNumber === sectionNumber)),
          courseName,
          teacherName,
          roomNumber,
          courseCode,
          sectionNumber,
          semesters,
          schedule: null,
          grade: null,
          attendance: null,
        };
      }));

      scheduleAsCourseCollection.shift();

      console.log(scheduleAsCourseCollection);

      // assign indivdual schedules to courses
      const courses: { [room: string]: ({
        day: 'M' | 'T' | 'W' | 'R' | 'F',
        period: string,
      })[] } = {};

      scheduleAsCourseCollection.forEach((day, dayOfWeekAsNumber) => {
        const daysOfWeek = ['M', 'T', 'W', 'R', 'F'];
        day.forEach((course, period) => {
          if (!courses[`${course.courseCode}-${course.sectionNumber}`]) {
            courses[`${course.courseCode}-${course.sectionNumber}`] = [];
          }

          console.log(dayOfWeekAsNumber, period + 1);

          courses[`${course.courseCode}-${course.sectionNumber}`].push({
            day: daysOfWeek[dayOfWeekAsNumber] as Structures.ScheduleClassifiers.Nomenclature.Day,
            period: (period + 1).toString(),
          });
        });
      });

      console.log(courses);

      const finalStructure = scheduleAsCourseCollection
        .map(d =>
          d.map((col) => {
            if (courses[`${col.courseCode}-${col.sectionNumber}`]) {
              col.schedule = courses[`${col.courseCode}-${col.sectionNumber}`];
            }
            return {
              course: col,
              schedule: courses[`${col.courseCode}-${col.sectionNumber}`],
            };
          })
        );
      
      return new ScheduleStructure({
        M: finalStructure[0],
        T: finalStructure[1],
        W: finalStructure[2],
        R: finalStructure[3],
        F: finalStructure[4],
      });
    }, ScheduleStructure.toString(), Course.toString(), this.cache.courses);

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

export namespace Structures {
  /**
   * An object representing previously fetched data on a `Session`. Can be used to prevent performing an expensive task, like fetching a schedule.
   */
  export interface SessionCache {
    courses?: Course[];
    schedule?: Schedule;
    profile?: Student;
    assessments?: MajorAssessment[];
  }

  export interface UserData {
    studentId: string,
    name: string,
    school: {
      name: string,
      id: string,
      counselor: string,
    },
    sasid: string,
    grade: string,
    email: string,
    schedule?: Schedule;
    studentPhoto?: string;
    gpa?: string;
  }

  /**
   * Represents a student in Aspen SIS.
   */
  export class Student {
    studentId: string;
    name: string;
    school: { name: string, id: string, counselor: string };
    sasid: string;
    grade: number;
    email: string;
    schedule?: Schedule;
    studentPhoto?: string;
    gpa?: string;
  
    constructor(data: UserData) {
      const { studentId, name, school, sasid, grade, email, gpa, studentPhoto } = data;
      this.studentId = studentId;
      this.name = name;
      this.school = school;
      this.sasid = sasid;
      this.grade = parseInt(grade);
      this.email = email;
      this.gpa = gpa;
      this.studentPhoto = studentPhoto;
    }
  
    loadSchedule(schedule: Schedule): this {
      this.schedule = schedule;
      return this;
    }
  }

  /**
   * An object representing the absences, tardies, and early dismissals from a given course.
   */
  export interface AttendanceChart {
    absences: `${number}`,
    tardy: `${number}`,
    dismissal: `${number}`,
  }

  /**
   * 
   */
  export namespace ScheduleClassifiers {
    export namespace Nomenclature {
      export type Day = 'M' | 'T' | 'W' | 'R' | 'F';
      export type DayAsNumber = 0 | 1 | 2 | 3 | 4;
  
      export type Period = 1 | 2 | 3 | 4 | 5 | 6 | 7;
      
      export type Code = `${Day}${Period}`;
    }
  
    export interface Block {
      schedule: ({
        day: ScheduleClassifiers.Nomenclature.Day,
        period: string,
      })[],
      course: Partial<Course>
    }
  
    export type Day = (Block)[];
  
    export interface BaseSchedule {
      M: Day,
      T: Day,
      W: Day,
      R: Day,
      F: Day,
    }
  }

  /**
   * A schedule object representing five days, Monday through Friday.
   */
  export class Schedule {
    M: ScheduleClassifiers.Day;
    T: ScheduleClassifiers.Day;
    W: ScheduleClassifiers.Day;
    R: ScheduleClassifiers.Day;
    F: ScheduleClassifiers.Day;
  
    constructor(schedule: ScheduleClassifiers.BaseSchedule) {
      this.M = schedule.M;
      this.T = schedule.T;
      this.W = schedule.W;
      this.R = schedule.R;
      this.F = schedule.F;
    }
  
    getDay(day: (ScheduleClassifiers.Nomenclature.Day | ScheduleClassifiers.Nomenclature.DayAsNumber)): ScheduleClassifiers.Day {
      if (typeof day === 'number') {
        day = ['M', 'T', 'W', 'R', 'F'][day] as ScheduleClassifiers.Nomenclature.Day;
      }
      return this[day];
    }
    
    getPeriod(code: ScheduleClassifiers.Nomenclature.Code) {
      const day: ScheduleClassifiers.Nomenclature.Day = code[0] as ScheduleClassifiers.Nomenclature.Day,
        period: ScheduleClassifiers.Nomenclature.Period = parseInt(code[1]) as ScheduleClassifiers.Nomenclature.Period;
      return this[day][period];
    }
  
    /**
     * 
     * @param period
     * @returns The time of which the period ends
     */
    getTimeOfPeriod(period: ScheduleClassifiers.Nomenclature.Period) {
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
    loadCourses(courseLoad: Structures.Course[]) {
      for (const course of courseLoad) {
        for (const day of [this.M, this.T, this.W, this.R, this.F]) {
          day.forEach(period => {
            if (period.course.courseName === course.courseName) {
              period.course = {
                ...course,
                ...period.course,
                schedule: {
                  ...period.schedule
                }
              };
            }
          });
        }
      }
      return this;
    }
  }

  export type MarkingTerms = 'q1' | 'q2' | 'q3' | 'q4'

  /**
   * Search options when filtering for `Course`s in either the current/previous year across one or all `MarkingTerms`.
   */
  export interface CourseSearchOptions {
    year: 'current' | 'previous'
    term: MarkingTerms | 'all'
    useCache?: boolean;
  }

  export type ClassDetailSearchMethod = 'courseName' | 'teacherName' | 'courseCode' | 'sectionNumber';
  
  export interface GradingCategory {
    name: string,
    terms: {
      q1: {
        weight: number,
        average: number,
      },
      q2: {
        weight: number,
        average: number,
      },
      q3: {
        weight: number,
        average: number,
      },
      q4: {
        weight: number,
        average: number,
      },
    },
  }

  export interface CourseData {
    courseName: string,
    courseCode: string,
    courseElementId?: string;
    sectionNumber: string,
    semesters: string,
    teacherName: string,
    roomNumber: string,
    grade: string | null,
    attendance: AttendanceChart | null,
    schedule?: object | null,
  }

  export class Course {
    courseName: string;
    courseElementId?: string;
    courseCode: string;
    sectionNumber: string;
    semesters: string;
    teacherName: string;
    roomNumber: string;
    grade: string | null;
    attendance: AttendanceChart | null;
    schedule?: object | null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories?: any[];
  
    constructor(data: CourseData) {
      const { courseName, courseCode, courseElementId, sectionNumber, semesters, teacherName, roomNumber, grade, attendance, schedule } = data;
      this.courseName = courseName;
      this.courseCode = courseCode;
      this.courseElementId = courseElementId;
      this.sectionNumber = sectionNumber;
      this.semesters = semesters;
      this.teacherName = teacherName;
      this.roomNumber = roomNumber;
      this.grade = grade;
      this.attendance = attendance && {
        absences: (attendance.absences),
        tardy: (attendance.tardy),
        dismissal: (attendance.dismissal),
      };
      this.schedule = schedule || null;
    }
  }

  export interface MajorAssessmentData {
    name: string;
    schoolYear: string;
    rawScore: number;
    scaleScore: number;
    performanceLevel: string;
  }
  
  export interface MCASData extends MajorAssessmentData {
    performanceLevel: 'NM' | 'PM' | 'M' | 'E' | 'P' | 'A' | 'NI' | 'F';
  }

  export class MajorAssessment {
    name: string;
    schoolYear: string;
    rawScore: number;
    scaleScore: number;
    performanceLevel: string;
  
    constructor(data: MajorAssessmentData) {
      this.name = data.name;
      this.schoolYear = data.schoolYear;
      this.rawScore = data.rawScore;
      this.scaleScore = data.scaleScore;
      this.performanceLevel = data.performanceLevel;
    }
  }
  
  export class MCAS extends MajorAssessment {
    performanceLevel: 'NM' | 'PM' | 'M' | 'E' | 'P' | 'A' | 'NI' | 'F';
    subject?: string;

    constructor (data: MCASData) {
      super({
        ...data,
        name: 'MCAS',
      });
      this.performanceLevel = data.performanceLevel;
      this.subject;
    }
  
    getAchievementLevel(): string {
      switch (this.performanceLevel) {
      case 'NM':
        return 'Not Meeting Expectations';
      case 'PM':
        return 'Partially Meeting Expectations';
      case 'M':
        return 'Meeting Expectations';
      case 'E':
        return 'Exceeding Expectations';
      case 'A':
        return 'Advanced';
      case 'P':
        return 'Proficient';
      case 'NI':
        return 'Needs Improvement';
      case 'F':
        return 'Failing';
      }
    }
  }
}