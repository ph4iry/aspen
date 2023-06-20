var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Session_instances, _a, _Session_markingPeriods, _Session_checkForClientReadiness;
import puppeteer from 'puppeteer';
import ClientNotReadyError from './errors/ClientNotReady.js';
import LoginFailedError from './errors/LoginFailed.js';
import Course from './structures/Course.js';
import Schedule from './structures/Schedule.js';
class Session {
    constructor() {
        _Session_instances.add(this);
        this.loggedIn = false;
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            this.browser = yield puppeteer.launch({ args: ['--no-sandbox'], headless: true });
            this.page = yield this.browser.newPage();
            yield this.page.goto('http://sis.mybps.org/aspen/logon.do');
        });
    }
    login(id, password) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.init();
            yield this.page.type('input#username', id);
            yield this.page.type('input#password', password);
            yield this.page.evaluate(() => document.querySelector('#logonButton').click())
                .then(() => this.page.waitForNavigation({ waitUntil: 'networkidle2' }))
                .then(() => __awaiter(this, void 0, void 0, function* () {
                const text = yield this.page.$('#messageWindow > table > tbody > tr:nth-child(3) > td:nth-child(2) > div');
                if (text) {
                    throw new LoginFailedError();
                }
                else {
                    this.loggedIn = true;
                }
            }))
                .catch(() => {
                return 401;
            });
            return this;
        });
    }
    getStudentInfo() {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldGet(this, _Session_instances, "m", _Session_checkForClientReadiness).call(this);
            yield this.page.goto('https://sis.mybps.org/aspen/gradePointSummary.do?navkey=myInfo.gradePoints.summary');
            yield this.page.waitForSelector('#dataGrid');
            // weighted gpa (quarters)
            const _weightedGPA = yield this.page.evaluate(() => {
                var _b, _c, _d;
                return (_d = (_c = (_b = document.querySelector('#dataGrid > table > tbody')) === null || _b === void 0 ? void 0 : _b.lastElementChild) === null || _c === void 0 ? void 0 : _c.lastElementChild) === null || _d === void 0 ? void 0 : _d.innerText;
            });
            yield this.page.goto('http://sis.mybps.org/aspen/portalStudentDetail.do?navkey=myInfo.details.detail');
            yield this.page.click('#contentArea > table:nth-child(2) > tbody > tr:nth-child(1) > td.contentContainer > table:nth-child(7) > tbody > tr:nth-child(3) > td > table > tbody > tr > td:nth-child(2) > a')
                .then(() => __awaiter(this, void 0, void 0, function* () { return yield this.page.waitForSelector('#propertyValue\\(relStdPsnOid_psnPhoOIDPrim\\)-span > img'); }));
            const _photo = yield this.page.evaluate(() => {
                return document.querySelector('#propertyValue\\(relStdPsnOid_psnPhoOIDPrim\\)-span > img').src;
            });
            yield this.page.goto('http://sis.mybps.org/aspen/portalStudentDetail.do?navkey=myInfo.details.detail');
            yield this.page.waitForSelector('#mainTable');
            return Object.assign(yield this.page.evaluate(() => {
                var _b, _c, _d, _e, _f, _g, _h, _j;
                const primary = {
                    studentId: (_b = document.querySelector('input[name="propertyValue(stdIDLocal)"]')) === null || _b === void 0 ? void 0 : _b.value,
                    // studentId: (table.querySelector('input[name="propertyValue(stdIDLocal)"]')).value,
                    name: (_c = document.querySelector('input[name="propertyValue(stdViewName)"]')) === null || _c === void 0 ? void 0 : _c.value,
                    school: {
                        name: (_d = document.querySelector('input[name="propertyValue(relStdSklOid_sklSchoolName)"]')) === null || _d === void 0 ? void 0 : _d.value,
                        id: (_e = document.querySelector('input[name="propertyValue(relStdSklOid_sklSchoolID)"]')) === null || _e === void 0 ? void 0 : _e.value,
                        counselor: (_f = document.querySelector('input[name="propertyValue(stdFieldB009)"]')) === null || _f === void 0 ? void 0 : _f.value,
                    },
                    sasid: (_g = document.querySelector('input[name="propertyValue(stdIDState)"]')) === null || _g === void 0 ? void 0 : _g.value,
                    grade: (_h = document.querySelector('input[name="propertyValue(stdGradeLevel)"]')) === null || _h === void 0 ? void 0 : _h.value,
                    email: (_j = document.querySelector('input[name="propertyValue(relStdPsnOid_psnEmail01)"]')) === null || _j === void 0 ? void 0 : _j.value,
                };
                return primary; // document.querySelector("#propertyValue\\(relStdPsnOid_psnPhoOIDPrim\\)-span > img")
            }), {
                gpa: _weightedGPA,
                studentPhoto: _photo,
            });
        });
    }
    getClasses(options) {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldGet(this, _Session_instances, "m", _Session_checkForClientReadiness).call(this);
            yield this.page.goto('http://sis.mybps.org/aspen/portalClassList.do?navkey=academics.classes.list');
            yield this.page.waitForSelector('#dataGrid');
            // selects year to view
            yield this.page.select('select[name="yearFilter"]', options.year);
            yield this.page.waitForSelector('#dataGrid');
            // selects the term to view
            yield this.page.select('select[name="termFilter"]', __classPrivateFieldGet(Session, _a, "f", _Session_markingPeriods).get(options.term));
            yield this.page.waitForSelector('#dataGrid');
            this.courses = yield this.page.evaluate(() => {
                const _rows = document.querySelectorAll('#dataGrid tr');
                const classes = [];
                _rows.forEach(_row => {
                    const course = [];
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
            return this.courses;
        });
    }
    getClassDetailsByElementId(id, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const _classes = yield this.getClasses({ year: ((options === null || options === void 0 ? void 0 : options.year) || 'current'), term: ((options === null || options === void 0 ? void 0 : options.term) || 'all') });
            const _course = _classes.find(c => c.courseElementId === id);
            if (!_course)
                return null;
            Promise.all([
                this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
                this.page.click(`#${_course === null || _course === void 0 ? void 0 : _course.courseElementId} > a`),
            ]);
            yield this.page.waitForSelector('#dataGridRight');
            const _propertySelectors = {
                teacherEmail: 'input[name="propertyValue(relSscMstOid_relMstStfPrim_relStfPsnOid_psnEmail01)"]',
                classSize: 'input[name="propertyValue(relSscMstOid_mstEnrTotal)"]',
            };
            const _classDetails = yield this.page.evaluate((_properties) => {
                const _categories = [].slice
                    .call(document.querySelectorAll('#dataGridRight > table > tbody > tr > td[rowspan]'))
                    .map((_category) => {
                    var _b, _c, _d;
                    const _categoryName = _category.innerText;
                    const _averages = [].slice
                        .call((_c = (_b = _category.parentElement) === null || _b === void 0 ? void 0 : _b.nextElementSibling) === null || _c === void 0 ? void 0 : _c.querySelectorAll('td'))
                        .map((_avg) => {
                        return parseFloat(_avg.innerText);
                    });
                    _averages.shift();
                    const _weights = [].slice
                        .call(((_d = _category.parentElement) === null || _d === void 0 ? void 0 : _d.querySelectorAll('td')))
                        .map((_wgt) => {
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
                    teacherEmail: document.querySelector(_properties.teacherEmail).value,
                    classSize: parseInt(document.querySelector(_properties.classSize).value),
                    categories: _categories,
                };
            }, _propertySelectors);
            return Object.assign(_course, _classDetails);
        });
    }
    getClassDetails(method, searchValue, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const _classes = yield this.getClasses({ year: ((options === null || options === void 0 ? void 0 : options.year) || 'current'), term: ((options === null || options === void 0 ? void 0 : options.term) || 'all') });
            const _course = _classes.find(course => {
                // returns a falsy value (0) if it doesnt come up, and indices will be 1+ (therefore truthy)
                return course[method].toLowerCase().indexOf(searchValue.toLowerCase()) + 1;
            });
            if (!_course) {
                return null;
            }
            Promise.all([
                this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
                this.page.click(`#${_course === null || _course === void 0 ? void 0 : _course.courseElementId} > a`),
            ]);
            yield this.page.waitForSelector('#dataGridRight');
            const _propertySelectors = {
                teacherEmail: 'input[name="propertyValue(relSscMstOid_relMstStfPrim_relStfPsnOid_psnEmail01)"]',
                classSize: 'input[name="propertyValue(relSscMstOid_mstEnrTotal)"]',
            };
            const _classDetails = yield this.page.evaluate((_properties) => {
                const _categories = [].slice
                    .call(document.querySelectorAll('#dataGridRight > table > tbody > tr > td[rowspan]'))
                    .map((_category) => {
                    var _b, _c, _d;
                    const _categoryName = _category.innerText;
                    const _averages = [].slice
                        .call((_c = (_b = _category.parentElement) === null || _b === void 0 ? void 0 : _b.nextElementSibling) === null || _c === void 0 ? void 0 : _c.querySelectorAll('td'))
                        .map((_avg) => {
                        return parseFloat(_avg.innerText);
                    });
                    _averages.shift();
                    const _weights = [].slice
                        .call(((_d = _category.parentElement) === null || _d === void 0 ? void 0 : _d.querySelectorAll('td')))
                        .map((_wgt) => {
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
                    teacherEmail: document.querySelector(_properties.teacherEmail).value,
                    classSize: parseInt(document.querySelector(_properties.classSize).value),
                    categories: _categories,
                };
            }, _propertySelectors);
            return Object.assign(_course, _classDetails);
        });
    }
    getAssignments(course, assignmentFilter) {
        return __awaiter(this, void 0, void 0, function* () {
            const { method, search, options } = course;
            const _course = yield this.getClassDetails(method, search, options);
            Promise.all([
                this.page.waitForNavigation({ waitUntil: 'networkidle2' }),
                this.page.click('#layoutVerticalTabs > table > tbody > tr:nth-child(2) > td > div > a'),
            ]);
            yield this.page.waitForSelector('#gradeTermOid');
            // TODO: fix this select (the selector is wrong)
            yield this.page.select('#gradeTermOid', __classPrivateFieldGet(Session, _a, "f", _Session_markingPeriods).get(assignmentFilter.term));
            yield this.page.waitForSelector('#dataGrid > table');
            return yield this.page.evaluate((_course) => {
                const _assignments = [].slice
                    .call(document.querySelectorAll('#dataGrid > table > tbody > tr'))
                    .map((_assignment) => {
                    var _b, _c, _d;
                    const _cols = [].slice
                        .call(_assignment.querySelectorAll('td'))
                        .map((td) => td.innerText);
                    return {
                        assignmentName: _cols[1],
                        category: _course === null || _course === void 0 ? void 0 : _course.categories.find((_category) => _category.name === _cols[2]),
                        dateAssigned: _cols[3],
                        dateDue: _cols[4],
                        score: {
                            percent: parseFloat((_b = _cols[5]) === null || _b === void 0 ? void 0 : _b.split('\t')[0]),
                            fraction: (_c = _cols[5]) === null || _c === void 0 ? void 0 : _c.split('\t')[1],
                            raw: parseFloat((_d = _cols[5]) === null || _d === void 0 ? void 0 : _d.split('\t')[2].replace('(', '').replace(')', '')),
                        }
                    };
                });
                _assignments.shift();
                return _assignments;
            }, _course);
        });
    }
    getSchedule() {
        return __awaiter(this, void 0, void 0, function* () {
            __classPrivateFieldGet(this, _Session_instances, "m", _Session_checkForClientReadiness).call(this);
            yield this.page.goto('https://sis.mybps.org/aspen/studentScheduleContextList.do?navkey=myInfo.sch.list&forceRedirect=false');
            yield this.page.waitForSelector('#dataGrid > table');
            const result = yield this.page.evaluate(() => {
                const schedule = [];
                const rows = document.querySelectorAll('#dataGrid > table > tbody > tr.listCell');
                console.log(rows);
                rows.forEach(course => {
                    const list = [];
                    Array.from(course.getElementsByTagName('td')).forEach(col => {
                        list.push(col.innerText);
                    });
                    schedule.push(list.slice(2));
                });
                return schedule;
            });
            const scheduleByClass = result.map((course) => {
                const schedule = course[2].trim().split(' ').map(day => {
                    var _b, _c;
                    const periodRegex = /\(([^)]+)\)/;
                    const dayRegex = /^([a-zA-Z])\(.*\)$/;
                    return {
                        day: (_b = day.match(dayRegex)) === null || _b === void 0 ? void 0 : _b.toString().split(',')[1],
                        period: (_c = day.match(periodRegex)) === null || _c === void 0 ? void 0 : _c.toString().split(',')[1],
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
                const structure = {
                    M: [[], [], [], [], [], [], []],
                    T: [[], [], [], [], [], [], []],
                    W: [[], [], [], [], [], [], []],
                    R: [[], [], [], [], [], [], []],
                    F: [[], [], [], [], [], [], []],
                };
                scheduleByClass.flat().forEach(course => {
                    if (!course.schedule[0].day)
                        return;
                    for (const meeting of course.schedule) {
                        structure[meeting.day][parseInt(meeting.period) - 1].push(course);
                    }
                });
                return structure;
            })();
            return new Schedule(fullSchedule);
        });
    }
    exit() {
        return __awaiter(this, void 0, void 0, function* () {
            this.browser.close();
        });
    }
}
_a = Session, _Session_instances = new WeakSet(), _Session_checkForClientReadiness = function _Session_checkForClientReadiness() {
    if (!this.loggedIn) {
        throw new ClientNotReadyError('Try logging in first, then getting information.');
    }
};
_Session_markingPeriods = { value: new Map()
        .set('q1', 'GTMp1000026Gdh')
        .set('q2', 'GTMp1000026Gdi')
        .set('q3', 'GTMp1000026Gdj')
        .set('q4', 'GTMp1000026Gdk')
        .set('all', 'all') };
export default Session;
