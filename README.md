# Chop Market Rider: delivery app

Expo (SDK 57, expo-router) app for delivery riders: get set up, go online,
claim nearby jobs, collect from the kitchen and hand over with the customer's
Trust-Lock code.

## Run it

```bash
npm install
npm start            # then press a (Android) / i (iOS) / w (web preview)
```

The app talks to `chopbase-server`. In development it uses the machine running
Metro on port 5000; set `EXPO_PUBLIC_API_URL` in `.env` to point elsewhere (see
`.env.example`).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run typecheck` | TypeScript, including typed routes |
| `npm run lint` | ESLint (eslint-config-expo) |
| `npm run gen:api` | Regenerate `src/api/schema.d.ts` from the backend's OpenAPI spec |

## What a rider does in the app

- **Setup** (`GET /auth/me/onboarding?role=rider`): identity (NIN/BVN +
  selfie), vehicle and plate, a 3-minute safety & Trust-Lock training with a
  short quiz, and a bank account. The server refuses to go online until these
  are done.
- **Jobs**: an online switch (needs the phone's location), today's deliveries
  and earnings, and unclaimed jobs within 5 km of the kitchen
  (`GET /riders/me/jobs`). New jobs arrive over Socket.IO; the phone buzzes only
  when the job is actually nearby. First rider to accept gets it. One standard
  job at a time, or up to 3 economy jobs batched.
- **Delivery** (`GET /riders/me/deliveries?view=active`): collect (directions,
  call the kitchen, bag contents to check, "food is ready" arrives live), then
  deliver (address, landmark, call the customer) and enter the customer's
  4-digit code, which releases the rider's pay to the wallet immediately.
  If the kitchen cancels, the job disappears and the phone buzzes.
- **Earnings**: wallet balance, today and all-time numbers, bank account,
  4-digit withdrawal PIN, idempotent withdrawals.
- **Account**: vehicle, past deliveries, the training refresher, sign out
  (which takes the rider offline first).

## Privacy and location

- Customer and kitchen phone numbers come from the server only while the job is
  active, and the first disclosure per order is written to the audit log
  (NDPA). History never includes them. Before a job is claimed the rider sees
  only addresses.
- Location is shared only while the rider is online **and the app is open**
  (foreground permission only; no background location). Every ~10 s during a
  job, every ~60 s between jobs; over the socket, with HTTP as fallback. The
  screen stays on during a job. Background tracking would need a development
  build, an Android foreground service and store review.

## Shared with the other apps

`src/api/client.ts`, `src/lib/{session,storage,device,socket,...}` and the UI
kit in `src/components/ui` are copies of the customer and chef apps'. Keep them
in step.
