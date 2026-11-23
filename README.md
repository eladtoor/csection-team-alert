# C-Section Team Alert

Built at the Soroka Medical Center hackathon in Beer Sheva.

When a senior doctor calls an emergency C-section, seven people have to reach the operating room within minutes, and someone has to know who is actually coming. This app alerts the team, collects each person's ETA from their phone, and shows the status live.

The interface is in Hebrew.

## How it works

1. The senior doctor fills in a short form (patient, location, room, urgency), picks the assistant doctor and triggers the alert.
2. Everyone on the team gets a Hebrew voice call and an SMS with a personal link. The team is the senior doctor, the assistant doctor, and whoever is on shift as pediatrician, anesthesiologist, OR nurse, orderly and head midwife.
3. From the link, each person answers "3 minutes", "4 minutes", "5 minutes" or "not arriving".
4. The dashboard updates live as answers come in, and arrivals are confirmed on it.
5. The analytics page shows response and arrival times and the fastest responders of the week.

## Calls and SMS

Calls and SMS go through Twilio. Without Twilio credentials, or with `MOCK_MODE=true` (the default in `.env.example`), the server runs in mock mode: it prints every call, SMS and personal link to the console instead of sending them. That is enough to walk through the whole flow on one machine.

To send real calls and SMS, set `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_PHONE_NUMBER` in `.env` and set `MOCK_MODE=false`.

## Stack

- Server: Node.js, Express, Socket.IO, SQLite through sql.js, Twilio
- Client: React 18, React Router, Socket.IO client, Axios

## Run it

Needs Node.js 18 or later.

```bash
npm install
cd client && npm install && cd ..
copy .env.example .env        # cp on macOS / Linux
npm run dev:all
```

The client opens on http://localhost:3000 and the API runs on http://localhost:3002.

The database file is created on first start from `database/schema.sql`, with seven roles, sixteen sample staff and an active shift. All names and phone numbers in it are made up. Run `node reset-database.js` with the server stopped to start over.

## Try the flow in mock mode

1. Open http://localhost:3000, fill in the form and trigger the alert.
2. The server console prints a link for each team member. Open a few in other tabs and answer.
3. Watch http://localhost:3000/dashboard update, then confirm an arrival.
4. Open http://localhost:3000/analytics.

## Layout

```
server/
  server.js                 Express app and Socket.IO rooms
  config/database.js        sql.js wrapper, saves to data/emergency.db
  routes/cases.js           trigger an alert, read cases and team status
  routes/responses.js       ETA answers and arrival confirmation
  routes/team.js            roles, staff, current shift
  routes/analytics.js       response times and weekly ranking
  services/twilioService.js voice call and SMS, with mock mode
client/src/pages/
  TriggerPage.js            the senior doctor's form
  ResponsePage.js           the page a team member opens from the SMS
  DashboardPage.js          live status of the team
  AnalyticsPage.js          metrics
database/schema.sql         tables and sample data
```

## License

MIT
