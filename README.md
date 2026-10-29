# Attendance System: Web App

Faculty-only web version of the Attendance System, for faculty on iPhone until a native iOS build exists. Students keep using the mobile app; the backend refuses student accounts here.

It follows the mobile app's faculty screens, currently v1.2.0.

Same backend (Render) and database (Neon) as the mobile app.

## What it does

- Sign in (faculty only), reset password
- Subjects: create, edit, duplicate, share the join code and delete (the warning says how many lectures, records and students go with it)
- Academic year and Odd/Even semester on every subject; search and filters by type, year and semester; the list opens on the running year and semester
- Start attendance: full-screen code, countdown and live present count; the screen stays on while the code is showing
- Lecture summary after each session, with tap-to-correct statuses
- Per subject: students with attendance %, enrollment requests (with Approve all), leave requests (Approve, Reject with a note, Approve all, Take back), past lectures
- Approved leave shows as Excused and is left out of attendance percentages
- Reports: recent classes (search by subject or date, filters) and Excel downloads with quick date ranges
- Profile: change password with a code emailed to the account, sign out, delete account (needs the password)
- Faculty sign-up with an email code (any email address)

Not on the web: student sign-up and moving an account to a new phone (app only).

## Run locally

```bash
npm install
cp .env.example .env   # optional: point at another backend
npm run dev
```

| Variable | Purpose |
|---|---|
| `VITE_SERVER_URL` | Backend URL, no trailing slash. Defaults to the Render backend |

## Deploy on Vercel

1. Push this folder to its own GitHub repository.
2. On vercel.com, **Add New → Project** and import the repository. Vercel detects Vite (build `npm run build`, output `dist`).
3. Add the environment variable `VITE_SERVER_URL` if the backend is not the default.
4. Deploy. `vercel.json` sends every route to `index.html`, so reloading any page works.
5. On the backend (Render), set `FRONTEND_URL` to the Vercel URL, e.g. `https://attendance-web.vercel.app`, so the browser is allowed to call the API.

## Install on iPhone

Open the link in **Safari**, tap **Share**, then **Add to Home Screen**. It then opens full screen with its own icon.
