var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from 'express';
import cors from 'cors';
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// app.use(express.bodyParser)
const port = process.env.PORT || 3000;
import Client from '../Client.js';
// const client = new Client();
// app.post('/login', async (req, res) => {
//   const data: LoginRequest = req.body;
//   await client.login(data.studentId, data.password);
//   // console.log(req.body);
//   res.send(client);
// });
app.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.send('This is an example response. To see more, try to use /student/profile with a json body with student login information.');
}));
app.get('/student/profile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    if (!data.client) {
        data.client = new Client();
        yield data.client.login(data.studentId, data.password);
    }
    const student = yield data.client.getStudentInfo();
    res.send({
        data: student,
        client: data.client
    });
}));
app.get('/student/classes', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    if (!data.client) {
        data.client = new Client();
        yield data.client.login(data.studentId, data.password);
    }
    if (!data.options) {
        data.options = {
            year: 'current',
            term: 'all',
        };
    }
    const classes = yield data.client.getClasses(data.options);
    res.send({
        data: classes,
        client: data.client
    });
}));
app.get('/student/classes/:courseCode', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const courseCode = req.params.courseCode;
    const data = req.body;
    if (!data.client) {
        data.client = new Client();
        yield data.client.login(data.studentId, data.password).catch(() => {
            res.status(401).send('Failed to log in.');
            return;
        });
    }
    if (!data.options) {
        data.options = {
            year: 'current',
            term: 'all',
        };
    }
    const courseDetails = yield data.client.getClassDetails('sectionNumber', courseCode);
    res.send({
        data: courseDetails,
        client: data.client,
    });
}));
app.get('/student/schedule', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const data = req.body;
    if (!data.client) {
        data.client = new Client();
        yield data.client.login(data.studentId, data.password).catch(() => {
            res.status(401).send('Failed to log in.');
            return;
        });
    }
    const schedule = yield data.client.getSchedule();
    res.send({
        data: schedule,
        client: data.client,
    });
}));
app.listen(port, () => {
    console.log(`Aspen SIS listening on port ${port}`);
});
