# Khushi Borde — Portfolio

A self-contained portfolio site built around one idea: your skills, projects,
experience and achievements aren't a list — they're a **graph**. The site's
centerpiece is an interactive, force-directed knowledge graph (built by hand
in plain JS on `<canvas>`, no libraries, no build step) that shows how
everything connects: which skills a project used, which internship taught a
skill, which hackathon proved it.

Everything below the graph — project cards, an experience timeline, an
achievements grid, and a contact section — is generated from the same data,
so you only ever edit content in one place.

## Files

```
index.html      the page structure
style.css       all styling, colors, type, layout, animations
data.js         ← THE ONLY FILE YOU NEED TO EDIT to add/change content
graph.js        the knowledge-graph engine (physics + rendering + interaction)
main.js         populates every other section from data.js + page interactions
```

## Adding your resume

The "Resume" buttons (in the nav and the contact section) already have a
`download` attribute pointing at `resume.pdf`. Just drop a file named
`resume.pdf` in this same folder — no code changes needed. The button will
download it directly instead of opening a blank tab. If you want a
different filename, change `RESUME_FILE` near the top of the resume-button
block in `main.js`.

## How to add a new project (or skill, role, achievement)

Open `data.js`. It's laid out in plain English with a comment block at the
top explaining the exact steps. Short version:

1. Find the right array — `PORTFOLIO.nodes.projects`, `.skills`,
   `.experience`, or `.achievements`.
2. Copy an existing object in that array, paste it as a new entry, and
   change the fields (`label`, `date`, `description`, `tags`, etc). Give it
   a unique `id`.
3. If you want it connected to specific skills on the graph, add a pair
   like `["proj_yourNewId", "skill_react"]` to the `PORTFOLIO.edges` array
   near the bottom of the file.
4. Save and refresh — the graph, the project grid, the timeline, and the
   achievements grid all update automatically. No other file needs to
   change.

To change your name, tagline, email, or links, edit `PORTFOLIO.profile` at
the top of `data.js`.

## Running it locally

The site itself is static (no build step). Two ways to run it:

**Just the front end, no working contact form:**
```
python3 -m http.server 8000
```
then visit `http://localhost:8000`. The graph, projects, terminal, etc. all
work — but the contact form will fail over to a mailto link since there's
no backend running to send the email.

**Site + working contact form:**
```
npm install
cp .env.example .env      # then fill in your SMTP details, see below
npm start
```
then visit `http://localhost:3000`. This runs `server.js`, which serves the
site *and* handles `POST /api/contact`.

## Making the contact form actually send email

**Current setup (simplest — no login/password needed):** the form posts
directly to [FormSubmit](https://formsubmit.co), a free form-to-email relay.
It only needs the destination address, which is already set to
`PORTFOLIO.profile.email` in `data.js` — nothing to configure.

The one thing to do, **once, ever**: the very first message anyone submits
triggers a confirmation email from FormSubmit to that address. Whoever owns
that inbox needs to open it and click "Confirm" one time. Every submission
after that is delivered automatically — no server, no `.env`, no SMTP, no
app password required, for anyone.

To change which inbox receives messages, just edit `profile.email` in
`data.js` — the form picks it up automatically.

---

**Alternative (advanced): self-hosted SMTP via server.js / api/contact.js**
If you'd rather send mail from your own server instead of relying on a third
party, this repo still ships with a Node/Nodemailer backend you can wire up
instead — see below. Most people won't need this; it exists for anyone who
wants full control over delivery.

The contact form POSTs to `/api/contact`, which sends the message via
[Nodemailer](https://nodemailer.com) using SMTP credentials you provide as
environment variables. The handler lives in `lib/sendContactEmail.js` and is
used by two interchangeable entry points — use whichever matches your host:

- `api/contact.js` — a Vercel serverless function (zero config beyond env vars)
- `server.js` — a plain Express server, for Render / Railway / a VPS / local dev

**Required environment variables** (put these in `.env` locally, or in your
host's dashboard when deployed):

| Variable      | Example                     | Notes                                  |
|---------------|------------------------------|-----------------------------------------|
| `SMTP_HOST`   | `smtp.gmail.com`             | your provider's SMTP server             |
| `SMTP_PORT`   | `587`                        | 587 for TLS, 465 for SSL                |
| `SMTP_USER`   | `khushiborde2@gmail.com`     | the mailbox that sends the email        |
| `SMTP_PASS`   | `xxxx xxxx xxxx xxxx`        | an **app password**, not your login password |
| `CONTACT_TO`  | `khushiborde2@gmail.com`     | optional — where messages land (defaults to `SMTP_USER`) |

**Getting a Gmail app password** (free, 2 minutes):
1. Turn on 2-Step Verification on the Google account: `myaccount.google.com/security`
2. Go to `myaccount.google.com/apppasswords`
3. Create an app password (name it anything, e.g. "portfolio-contact-form")
4. Google shows you a 16-character password — that's `SMTP_PASS`. Your normal
   Gmail password will **not** work here and shouldn't be used.

Any other SMTP provider (Outlook, a transactional service like Resend or
SendGrid's SMTP relay, your web host's mail server, etc.) works the same way —
just swap the host/port/user/pass.

### Deploying the backend on Vercel (recommended — free, easiest)
1. Push this folder to a GitHub repo.
2. Import the repo at [vercel.com/new](https://vercel.com/new). No build
   settings needed — Vercel auto-detects `api/contact.js` as a function and
   serves everything else (`index.html`, etc.) as static files.
3. In the Vercel project → **Settings → Environment Variables**, add the five
   variables from the table above.
4. Redeploy. The form now posts to `https://your-project.vercel.app/api/contact`
   automatically, since the frontend calls the relative path `/api/contact`.

### Deploying the backend elsewhere (Render, Railway, a VPS)
Any of these can run `server.js` directly:
```
npm install
npm start
```
Set the same environment variables in that host's dashboard (or a `.env`
file if it's a VPS you control). Make sure the site is served from the same
origin as the API (which it is by default here, since `server.js` serves
both) — otherwise you'll need to add the deployed API's full URL in place of
`/api/contact` in `main.js` and adjust CORS in `api/contact.js`/`server.js`
accordingly.

### If the backend isn't deployed yet
The form still works gracefully: submitting it will show an error with a
"Open email app →" fallback link that pre-fills a `mailto:` instead, so
nothing is ever a dead end for a visitor.

## Deploying it

This is mostly a static site with one small backend endpoint, so it works
on any host that can also run a single Node function or server:

- **Vercel** (recommended): see the backend section above — it serves the
  static files *and* the `/api/contact` function from one deploy.
- **GitHub Pages / any pure static host**: works for everything except the
  contact form, which will fall back to opening the visitor's email app.
- **Render / Railway**: deploy `server.js` as a Node web service; it serves
  the whole site.

## Notes on the graph

- Node color = category (skills are teal, projects amber, experience violet,
  achievements pink). Line = a real relationship pulled from `data.js`.
- Drag any node to rearrange the layout; scroll/pinch to zoom; click a node
  to open its detail panel on the right, including a clickable list of
  everything it connects to.
- Use the filter chips above the graph to isolate one category at a time —
  the core profile node and category hubs always stay visible for context.
- Fonts (Fraunces / IBM Plex Sans / JetBrains Mono) load from Google Fonts,
  so an internet connection is needed the first time a visitor loads the
  page. If you'd rather not depend on Google Fonts, download the font files
  and swap the `<link>` tags in `index.html` for local `@font-face` rules.
