var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import readline from 'readline';
import Session from '../Session.js';
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});
const aspen = new Session();
rl.question('Username: ', (username) => {
    rl.question('Password: ', (password) => __awaiter(void 0, void 0, void 0, function* () {
        console.clear();
        yield aspen.login(username, password);
        const profile = yield aspen.getStudentInfo();
        console.log(`Hello, ${profile.name}\nHere is your Aspen SIS profile:`);
        console.log(profile);
    }));
});
