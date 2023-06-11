import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
// app.use(express.bodyParser)
const port = process.env.PORT || 3000;
import Client from '../Session.js';
import { CourseSearchOptions } from '../types.js';

interface LoginRequest {
  studentId: string;
  password: string;
  client?: Client
}

interface ClassRequest {
  options: CourseSearchOptions;
}

app.get('/', async (req, res) => {
  res.send('This is an example response. To see more, try to use /student/profile with a json body with student login information.');
});

app.post('/student/profile', async (req, res) => {
  const data: LoginRequest = req.body;
  if (!data.client) {
    data.client = new Client();
    await data.client.login(data.studentId, data.password);
  }

  const student = await data.client.getStudentInfo();
  res.send({
    data: student,
    client: data.client
  });
});

app.post('/student/classes', async (req, res) => {
  const data: LoginRequest & ClassRequest = req.body;
  if (!data.client) {
    data.client = new Client();
    await data.client.login(data.studentId, data.password);
  }

  if (!data.options) {
    data.options = {
      year: 'current',
      term: 'all',
    };
  }
  const classes = await data.client.getClasses(data.options);
  res.send({
    data: classes,
    client: data.client
  });
});

app.post('/student/classes/:courseCode', async (req, res) => {
  const courseCode = req.params.courseCode;

  const data: LoginRequest & ClassRequest = req.body;
  if (!data.client) {
    data.client = new Client();
    await data.client.login(data.studentId, data.password).catch(() => {
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
  const courseDetails = await data.client.getClassDetails('sectionNumber', courseCode);
  res.send({
    data: courseDetails,
    client: data.client,
  });
});

app.post('/student/schedule', async (req, res) => {

  const data: LoginRequest = req.body;
  if (!data.client) {
    data.client = new Client();
    await data.client.login(data.studentId, data.password).catch(() => {
      res.status(401).send('Failed to log in.');
      return;
    });
  }

  const schedule = await data.client.getSchedule();
  res.send({
    data: schedule,
    client: data.client,
  });
});

app.listen(port, () => {
  console.log(`Aspen SIS listening on port ${port}`);
});