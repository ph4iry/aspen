# Aspen-SIS (Boston Latin Academy)
> An API library to interact with the [Boston Latin Academy's (in Boston Public Schools) version of Aspen (SIS) by Follett](https://sis.mybps.org/aspen/)

## ⚠️ Note
> The package uses [Puppeteer](https://github.com/puppeteer/puppeteer/tree/main) (and a version of Chromium with Puppeteer) to fetch the data. Due to web restrictions, this package should only be used on the server side of applications.

## ⬇️ Installation
Install the package on NPM using the package manager of your choice:
```bash
npm install bla-aspen
```
```bash
yarn add bla-aspen
```
```bash
pnpm add bla-aspen
```

## 🛠️ Usage
The package uses a `Session` to fetch data from a specific student. Upon creating a Session instance, you can call various methods on the session in order to fetch different pieces of data.

To get started, create a session object with the login information of a user:
```js
const aspen = new Session(process.env.STUDENT_EMAIL, process.env.PASSWORD);
```

`STUDENT_EMAIL` can be either a fragment of a BPS email (ex. jdoe3 of jdoe3@bostonk12.org) OR the full email, such as jdoe@bostonk12.org.
`PASSWORD` is the password to the student's account.

Here are a couple of example methods:
### `Session.init()`: `Promise<Session>`
Performs a login request to Aspen to fetch data. Returns a promise that resolves with the Session itself to enable chaining of methods.

⚠️ NOTE: This method is **required** before performing any other operation on the session.

### `Session.getStudentInfo()`: `Promise<Student>`

Fetches a student profile from the logged in session. Returns a `Promise` that resolves with the student's key information (such as email, name, and student ID).

## 💡 Example
For this example, user credentials are passed in from a `.env` file. However, the login credentials can come in the form of an HTTP request or anything akin to that.
```js
import 'dotenv/config.js';

import { Session } from 'bla-aspen';

(async function () {
  const aspen = new Session(process.env.STUDENT_EMAIL, process.env.PASSWORD).init();
  const info = await aspen.getStudentInfo();
  return aspen;
})().then((aspen) => aspen.exit().catch());
```