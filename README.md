# The Grove Lab

An agentic AI tinkering lab for faculty, by Marc Watkins with the Academic Innovations Group (AIG). Faculty browse a gallery of builds, describe an idea in a "Here's my idea" box that Jev sorts into a build pathway, fill out a build form with exemplars and sample language, then download their response and email it to mwatkins@olemiss.edu.

Static site. No build step, no accounts, no analytics. Answers save only in the visitor's browser (localStorage) until they download and email them.

## Pages

| File | What it is |
| --- | --- |
| `index.html` | The vision, how it works, the six pathways, and three things to know |
| `guidelines.html` | Accordions: prototypes, timeline, complexity, data security, FERPA, APIs, accessibility and Title II, sharing, reflection, how Jev reads your idea, how to download and send |
| `gallery.html` | 35 builds (28 from Context Is All You Need plus 7 newer ones), grouped by pathway, with search, filters, and "Close to my idea" flags that carry into the form |
| `form.html` | The build form, one accordion per section with "next section" buttons: Jev intake and rubric, pathway picker, pathway sections with side-by-side gallery comparisons and sample language, shared sections, optional reflection, download and send |

## Editing

- **Contact email, pathways, gallery builds, quotes:** `js/data.js`
- **Form questions, exemplars, sample language, Jev rubric:** `js/schema.js`
- **Colors and type:** tokens at the top of `css/grove.css`. Styled after olemiss.edu: navy #14213D, red #CE1126, Archivo Expanded (open stand-in for UM's licensed Termina) for headings, IBM Plex Sans and Serif for text. No italics.
- **Header and footer:** repeated in each HTML page; change all four together
- **Screenshots:** `shots/` (1280×720 captures saved as 960px JPEGs)

To add a build, add a `B(...)` line in `js/data.js` and drop its screenshot in `shots/`. To add a question, add a field object to a section in `js/schema.js`; it appears in the form, the progress nav, and every download automatically.

## Jev

The intake box sends only the idea text to Jev (TypeSafe AI) through the Cloudflare Worker proxy at `https://jev-sandbox-proxy.watkins-um.workers.dev` (the same proxy as Jev Sandbox and The Red Button; the API key stays in the Worker). It asks eight questions, the proxy's maximum: one pathway choice, three rubric scores (purpose, audience, complexity), and four yes/no flags (student data, outside data, AI inside the app, desirable difficulty). Results show probabilities so faculty can see the model's doubt. If the proxy is unreachable, the form falls back to a clearly labeled keyword estimate. The proxy address can be changed in the form's Connection dialog.

## Downloads

- **Download for Word (.doc):** HTML that Word opens and edits
- **Download as a web page (.html)**
- **Print or save as PDF**
- **Copy as text**
- **Blank form** (Word or print) listing every question for every pathway

Downloaded .doc and .html files carry the response as embedded JSON, so "Open a saved response" restores the form in another browser.

## Deploy to GitHub Pages

1. Create a repository and upload everything in this folder, including `.nojekyll`.
2. Settings → Pages → Deploy from a branch → `main` / root.

## Attribution and AI disclosure

Concept, vision language, and gallery builds by Marc Watkins. Quoted language is from Marc's newsletter Rhetorica, linked to each essay. Build titles, descriptions, and screenshots come from Context Is All You Need. Site coded with Anthropic's Claude under Marc's direction. The intake uses Jev from TypeSafe AI to suggest a pathway; nothing else on the site uses AI.

Builds from the lab are prototypes only and likely should not be deployed in the classroom.

## Open/closed sign

Every page shows whether the build form is **open** or **closed for submissions**. When closed, `form.html` sends visitors to `closed.html` ("temporarily closed while we catch up, check back soon"), and the main "Start the build form" buttons change to "Submissions temporarily closed". Anything a visitor already typed stays saved in their browser.

There are two ways to switch it:

**1. Live switch with a password (recommended).** A tiny Cloudflare Worker in `worker/` stores the status and checks the admin password on the server, so the password never appears in the page. It is separate from the Jev proxy, so it can't affect other builds. One-time setup, from inside `worker/`:

```
npx wrangler login
npx wrangler kv namespace create GROVE
```
Paste the `id` it prints into `wrangler.toml`, then:
```
npx wrangler secret put ADMIN_PASSWORD
npx wrangler deploy
```
Type the password when prompted. Copy the `https://grove-lab-status.<you>.workers.dev` address it prints into `endpoint` in `js/status-config.js` and re-upload that file. After that, use `admin.html` (linked as "Admin" in every footer): enter the password, choose Open or Closed, Save. Visitors see the change within about a minute. Five wrong passwords lock out for 15 minutes.

**2. Without the Worker.** Leave `endpoint` empty and change `open: true` to `open: false` in `js/status-config.js`, then re-upload it.
