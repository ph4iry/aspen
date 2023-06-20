import 'dotenv/config.js';

import Session from './Session.js';

(async function () {
  const aspen = new Session();
  await aspen.login(process.env.STUDENT_ID!, process.env.PASSWORD!);
  const schedule = await aspen.getSchedule();
  const classes = await aspen.getClasses({ year: 'current', term: 'q4' });
  schedule.loadCourses(classes);
  console.log(schedule.M[0]);
  return aspen; 
})().then((aspen) => aspen.exit().catch());