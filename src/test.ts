import 'dotenv/config.js';

import Session from './Session.js';

(async function () {
  const aspen = await new Session().login(process.env.USERNAME!, process.env.PASSWORD!);
  const schedule = await aspen.getStudentInfo();
  console.log(schedule);
  aspen.exit().catch();
})();