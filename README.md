Built by ALSayed Omer - Aspiring Computer Science student
---

*This is an initial runnable front-end prototype built with React + Vite. It runs locally in the browser only, with no real backend at this stage.*

What is implemented now?

- Arabic RTL interface titled *East Nile College Exam System*.
- Responsive design (mobile / desktop) with blue and white colors.
- Demo student login screen (name + university ID) with basic validation.
- Instructions screen before starting the exam.
- Local demo exam experience:
 - Timer
 - Progress bar
 - One question at a time
 - Answer selection and navigation between questions
 - Answers saved locally in `localStorage`
- On submit:
 - No score is calculated or displayed
 - A message shows that the attempt was saved with status *Under Review*
 - Student data and attempt ID are displayed
- Demo review screen after submission showing that results are saved for admin review only.
- Front-end protection indicators (demo):
 - Disabled copy / paste / cut and text selection inside the exam screen
 - Disabled context menu
 - Local logging of tab switch / focus loss events

> *Important note:* This protection is front-end only and does not fully prevent cheating without a server-side security layer.

Logo

A clear placeholder logo file is placed at:

`public/college-logo-placeholder.svg`

It can be replaced directly with the official college logo image while keeping the same path, or by updating the path in `src/App.jsx`.

Run Locally

npm install
npm run dev

Then open the local link shown in the terminal.

Verification and Quality

npm run lint
npm run build

> There is no automated test setup in the project yet (such as Vitest / Jest), so verification at this stage was done via lint / build only.

What is needed next (Next Phase)

- Real backend for managing students, exams, and attempts.
- Real database instead of local browser storage.
- Real authentication and roles (student / teacher / admin).
- Full admin dashboard for review, correction, and approval.
- Server-side security (sessions, encryption, audit logs, API protection).
- Stronger anti-cheating mechanisms at server and infrastructure level.

---



