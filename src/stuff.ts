import 'dotenv/config.js';

import Session from './Session.js';

(async function () {
  const aspen = new Session();
  await aspen.login(process.env.STUDENT_ID!, process.env.PASSWORD!);
  console.log(aspen.cache);
  const profile = await aspen.getClasses({ year: 'previous', term: 'all' });
  console.log(profile);
  return aspen; 
})().then((aspen) => aspen.exit().catch());