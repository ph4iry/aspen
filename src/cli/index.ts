import readline from 'readline';
import Session from '../Session.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const aspen = new Session();

rl.question('Username: ', (username: string) => {
  rl.question('Password: ', async (password: string) => {
    console.clear();
    await aspen.login(username, password);
    const profile = await aspen.getStudentInfo();
    console.log(`Hello, ${profile.name}\nHere is your Aspen SIS profile:`);
    console.log(profile);
  });
});