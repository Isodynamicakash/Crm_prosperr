# Prosperr Sales CRM — Frontend

React + TypeScript + Vite + Tailwind, wired to the Spring Boot backend (`prosperr-crm-backend`).

## Run it (2 minutes)

1. Start the backend first (IntelliJ → Run `CrmApplication`, profile `local`). It runs on **http://localhost:8081**.
2. In this folder:
   ```bash
   npm install
   cp .env.example .env.local      # Windows: copy .env.example .env.local
   npm run dev
   ```
3. Open **http://localhost:5173** and sign in with the email of a user that exists in `crm.app_user`
   (dev login needs `crm.auth.dev-login-enabled: true` on the backend — it is in your `application-local.yml`).

The dev server proxies `/api` to the backend, so there is no CORS setup. If your backend runs on another port,
change `VITE_API_TARGET` in `.env.local`.

### Google sign-in
Create an OAuth **Web client** in Google Cloud Console (authorised JavaScript origin `http://localhost:5173`),
then set the same client id in both places:
- frontend `.env.local` → `VITE_GOOGLE_CLIENT_ID=...`
- backend `application-local.yml` → `crm.auth.google-client-id: ...`

Only users the admin created (Team page) and who are on the allowed domain can get in.

## Landing page & brand

- Logged-out visitors land on the cinematic landing page at `/`; sign-in is at `/login`. Signed-in users can still open it at `/welcome`.
- Brand colours (forest, navy, lime) live in `tailwind.config.js`. Decisions and the motion rules are in **`docs/DESIGN.md`**.
- Video slots use branded fallback scenes until real clips exist. Prompts, filenames and export settings are in **`docs/MEDIA-PLAN.md`**. Add a clip by editing `src/lib/media/manifest.ts`.

## Build for production
```bash
npm run build          # type-checks, then writes dist/
```
Serve `dist/` from any static host. If the API is on a different host, set `VITE_API_BASE=https://api.yourdomain`
at build time and add the frontend URL to the backend's `crm.app.frontend-url` (CORS).

## What each role sees

| Role | Screens |
|---|---|
| **BDR** | Home (own numbers + targets), **My Day** calling list, Accounts, Account page (stakeholders, log call, submit SQL + book L1), My SQLs, Tasks |
| **AE** | Home (meetings needing outcome, flagged accounts, pipeline by stage, MRR by temperature), **Pipeline board**, Accounts, Account page (opportunity, checklist, book meeting, record outcome, keep active / inactive), Tasks |
| **Manager** | Home (funnel, pipeline MRR, days in stage, pipeline by AE, data hygiene), **SQL queue** (review → approve/reject → assign AE by capacity), Pipeline, Accounts, Reports (targets + 7 reports), Team, Settings |
| **Admin** | Everything the manager has, plus adding people and choosing their role |

## Built for speed
- **Ctrl/⌘ K** — search companies, people, emails, phones, LinkedIn; or jump to any page. `/` also opens it.
- **G then D / A / P / S / T / R / H** — go to My Day, Accounts, Pipeline, SQLs, Tasks, Reports, Home.
- **My Day:** `J`/`K` move, `Enter` logs the call. **Start calling** + **Save & next** runs through the list without leaving the keyboard.
- **[** collapses the sidebar.
- Logging a call shows *what will happen* (new status, next task and date) before you save, and you can change the date.
- The SQL form re-checks the ICP rules live (location, licenses, right stakeholder, BANT) as you fill it in.
- Pipeline drag-and-drop only allows moves the business rules permit; everything else moves automatically when a meeting outcome is recorded.

## Project layout
```
src/
  lib/            api client, auth, types (mirror the backend records), formatting, shared hooks
  components/ui   design system: Button, Input, Select, Card, Badge, Modal, Drawer, Tabs, Stat, status badges
  components/layout  sidebar shell, command menu, navigation (one list drives sidebar + shortcuts)
  features/       reusable flows: LogCallModal, SqlForms (submit/review/assign), PipelineForms, OpportunityPanel, AccountForms
  pages/          one file per route
```

Design tokens live in `tailwind.config.js`: Inter, canvas `#F7F8FA`, borders `#E7E9EE`, text `#17191F`,
accent `#635BDB`, success `#16A477`, warning `#E5A13B`; 8–12px radii, very soft shadows, 150–200ms motion.
