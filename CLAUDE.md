# Harry Academy — TOEIC S&W Placement Test Simulator

Owner: Harry Academy (English test-prep center, Ho Chi Minh City). Owner is an ETS-certified TOEIC Master Trainer.

## Goal
A prospective student gets a link + one-time access code, takes a simulated TOEIC Speaking & Writing test in the browser, gets AI-estimated scores + feedback, and results go automatically to Google Sheets for consultants.
This is a practice/placement tool, NOT an official score. Scores are shown only as labeled estimates (see Owner decisions).

## Architecture (decided — do not change without asking the owner)
- Frontend: static HTML/CSS/vanilla JS on GitHub Pages. No build step, no framework.
- Backend: Google Apps Script web app bound to the Sheet "HA TOEIC SW Results". Deployed "Execute as: me", "Who has access: Anyone". Code managed with `clasp`.
- AI: Gemini API called ONLY from Apps Script (UrlFetchApp). Key in Script Properties `GEMINI_API_KEY`. Never in frontend code or the repo.
  - Model ID lives in one config constant. Verified 2026-09-23 on ai.google.dev: current stable Flash is `gemini-3.8-flash` — inputs text/image/video/audio/PDF, structured output supported, thinking levels low/medium/high (no minimal), 1M-token input. Re-check https://ai.google.dev/gemini-api/docs/models before changing.
  - Google's Gemini 3 guide "strongly recommends" temperature 1.0 for all Gemini 3 models; below 1.0 can cause looping/degraded output. Temperature is a config constant (owner chose 1.0).
  - Use a paid-tier (billing-enabled) Gemini key for real student data — free-tier prompts may be used by Google to improve products.
- Storage: Google Sheet (tabs: Results, Codes, …) + optional Drive folder for audio (configurable).
- Frontend → Apps Script: `fetch` POST, `Content-Type: text/plain` (avoids CORS preflight), JSON body; server responds via ContentService JSON. Apps Script redirects to script.googleusercontent.com — fetch must follow redirects.

## Test format (configurable JSON test form; timings editable)
Speaking (11 Qs):
- Q1–2 Read aloud: 45s prep, 45s response. 0–3.
- Q3–4 Describe a picture: 45s prep, 30s response. 0–3.
- Q5–7 Respond to questions: 3s prep, 15s/15s/30s. 0–3.
- Q8–10 Respond using information (schedule/agenda): 45s read, 3s prep, 15s/15s/30s; Q10 question played twice. 0–3.
- Q11 Express an opinion: 45s prep, 60s response. 0–5.
Writing (8 Qs):
- Q1–5 Sentence from picture using two given words: 8 min total. 0–3.
- Q6–7 Respond to a written request (email): 10 min each. 0–4.
- Q8 Opinion essay: 30 min. 0–5.
Speaking prompts Q5–11 are audio: owner pre-generates MP3s with their edge-tts pipeline; app loads them from the repo.
Use placeholder audio/images + a sample form during development. NEVER use official ETS test content.

## Scoring pipeline
- Grade each question as soon as it is submitted (not whole test at once).
- Gemini structured output returning: transcript (speaking), score, criteria breakdown, errors[], feedback_vi (Vietnamese, full diacritics), band_note.
- Rubrics in a separate editable file, based on official TOEIC S&W scoring criteria, with slots for few-shot anchor samples scored by the owner.
- Rule-based checks in code:
  - Speaking Q1–2: WER / word accuracy of transcript vs reference text computed in code; Gemini only comments on pronunciation, intonation, stress.
  - Writing Q1–5: code checks both required words are used (inflected forms allowed).
- Speaking Q11 and Writing Q8: grade twice; if scores differ by ≥1 → average + flag "needs teacher review".
- Final report: raw section totals → estimated 0–200 range via editable mapping table, labeled "ước tính" (see Owner decisions).

## Audio
- Record in browser, encode 16 kHz mono WAV client-side (no ffmpeg in Apps Script). Must work on Chrome desktop/Android and Safari iOS.
- Send base64 to Apps Script; optionally save to Drive and store link in Sheet.

## Access control & cost protection
- Sheet tab "Codes": code, created_by, created_at, used_at, status. Single-use; session valid for limited time after first use.
- Reject grading without a valid active session. Daily global cap on Gemini calls (configurable) via PropertiesService/CacheService.

## Results sheet (tab "Results")
timestamp, code, full name, phone, section, question id, response text/transcript, audio link, AI score, criteria, feedback, review flag, estimated level.
Before the test: short Vietnamese consent notice (name/phone collection) + required checkbox. Optional: MailApp email to consultant on completion.

## UI rules
- Student-facing text in Vietnamese with full diacritics; test instructions may stay in English (as in the real exam).
- Real-test flow: countdown timers, auto-advance, no going back, mic check before Speaking.
- Mobile-friendly, clean, professional. No emojis. Use Harry Academy brand (see `harry-academy-design` skill).

## Delivery phases — stop for owner review after each
- Phase 0: repo structure, CLAUDE.md, clasp setup, Sheet schema, hello-world round trip (Pages → Apps Script → Sheet).
- Phase 1: Writing section end-to-end with one sample form.
- Phase 2: Speaking (recording, WAV, timers, audio prompts, grading).
- Phase 3: access codes, final report page, consultant email, cost cap.
- Also: short Vietnamese README (deploy, add a test form, create access codes).

## Owner decisions (2026-09-23)
- Temperature: default 1.0 + thinking_level low; config constant. Phase 1 compares 1.0 vs 0.2 on owner's anchor samples.
- Test content: form JSON served by Apps Script only after a valid session; media on Pages under hard-to-guess folder names (obscurity, accepted).
- Writing Q1–5: free navigation within the shared 8 min block; all other questions locked (no going back).
- Speaking Q1–2 WER: transcribe audio in a call that does NOT see the reference text.
- Daily Gemini cap: 100 calls/day (2026-09-24). Phase 3: one code per student (single-use), so a code cannot be reused.
- Final report: estimated 0–200 score per section shown as a 20-point RANGE (e.g. "130–150 (ước tính)"), from an editable raw→range table the owner calibrates, with disclaimer "Điểm ước tính dựa trên bài thi mô phỏng, không phải điểm chính thức của ETS." This replaces the earlier "no scaled scores" rule. No course recommendation for now.

## Project location
- Project root: `E:/Claude/SW` (Windows: E:\Claude\SW). GitHub: https://github.com/harryacademy/toeic-sw-test (public). Pages: https://harryacademy.github.io/toeic-sw-test/ (master, /docs).

## Working rules
- Do not write code for a phase until the owner approves the plan for it.
- Flag anything unclear, conflicting, or technically unsound before building.

## Deployment IDs
- Google account: harry@harryacademy.edu.vn (Workspace).
- Sheet: https://docs.google.com/spreadsheets/d/1m1kmpfmL48LeYwqYHXkR1jbJp0MKg1T7FoXURiieCOs
- Script ID: 1NMZYJEpQtem0uWU0pBpGZC5woT3_QqgY6pL5aL9kK_SwcEFIG7yYwUlQ
- Web app deployment ID (keep stable; update with `clasp redeploy <id>`): AKfycbxxWFiaSBNKrB-hZQNPK5BNsOMDEjGXNlt1eXxuUdaCFUsqg1dBVal6lGbK6CrKLdEOsw
- After `clasp create`/`clasp pull`, restore apps-script/appsscript.json from git (clasp overwrites it).

## Known platform behaviour (observed 2026-09-23)
- Apps Script round trips usually take 2–7 s but can take 20–40 s. Google's echo redirect sometimes returns 404 or another request's reply. `docs/js/api.js` handles this with a request id (rid), server-side result cache and retries.
- Design rule: students never wait on the network mid-test. Submit answers to a background queue (persisted in localStorage) and let the test continue; only the final report waits for pending grades.
- Every API action must be safe to retry under the same rid (the server caches by rid; never call Gemini twice for one rid).

## Code notes
- Apps Script runs files in order; never reference another file's functions at top level (see `actions_()` in Main.gs).
- Forms: `apps-script/Form*.gs` (public sample) and `apps-script/PrivateForm*.gs` (real forms), registry in Forms.gs. `grading` keys are stripped before sending to the browser.
- The GitHub repo is PUBLIC. `apps-script/Private*.gs` is gitignored but still pushed by clasp: real forms and anchors (PrivateAnchors.gs, template PrivateAnchors.example.txt) live there. The owner backs these files up himself. Never put ETS manual text or benchmarks in the repo.
- Rubric level text in Rubrics.gs is our own paraphrase of the ETS Writing scoring guides (owner's 2019 Propell workshop manual). The manual's raw-to-scaled table (per question type patterns, weighted toward Q8) is the starting point for the Phase 3 range table.
- House standard for Q6-7 (owner, 2026-09-24): a 4 needs each task developed; a bare-minimum reply is at most 3. The sample e-mail in testGradeSample is the owner's reference 3/4 (literal ETS reading gave 4).
- Results are reported per question type (Q1-5 average, Q6-7 each, Q8), never as one raw sum; Sessions.writing_raw holds that summary string.
- Grading: Grading.gs (rule checks + prompt), Gemini.gs (fetchAll, retries, daily cap), Rubrics.gs (RUBRICS, ANCHORS).
- rid cache stores only ok replies. submitAnswer is also idempotent per (session, question) via the Results sheet, and saves the answer even when grading fails (review_flag AI_ERROR).
- Frontend: app.js (screens/timers, state in localStorage `ha_sw_state`), queue.js (background submissions, `ha_sw_queue`), check.html (connection check).
- Local testing without deploying: a Node harness that loads the .gs files into `vm` with mocked Google services and a fake Gemini, and serves docs/ with API_URL pointed at itself. (Was in the session scratchpad; recreate if needed.)

## Progress (update at the end of every work session)
- 2026-09-23: Phase 0 DONE and verified by owner (PC 5/5, phone 5/5; retries work; frontend v0.2.0).
- 2026-09-24: Phase 1 (Writing) BUILT, frontend v0.3.0. Tested locally against mocked Apps Script + fake Gemini (full flow on mobile viewport, reload resume, timeout auto-submit, server down mid-test, Gemini 503 retries, dedupe, double grading, daily cap). NOT yet deployed or tested with real Gemini.
  - Temporary shared access code: Script Property TEMP_ACCESS_CODE (real codes in Phase 3). Daily Gemini cap already enforced.
  - Report page shows raw scores + AI feedback per question; the 0–200 range table is Phase 3.
  - Placeholder pictures are SVG, so Gemini gets only the text description; owner should swap in real JPG/PNG photos.
- 2026-09-24 (later): owner deployed backend @3; testGradeOnce OK (sample e-mail scored 3/4, owner agrees with 3). Owner approved: ETS-aligned rubric rewrite, grouped report (no /28 sum), Private*.gs split, Sent line in e-mails. Built, not yet pushed/deployed.
- Next session: owner deploys (clasp push, redeploy, rerun setupSheets, set TEMP_ACCESS_CODE), runs testGradeSample, takes the test on PC + phone, and reviews the real AI feedback. Then fix issues and start Phase 2 only after approval.
- Waiting on owner: 3–5 real student answers per Writing task type with the owner's scores (anonymised), for ANCHORS and runTemperatureTest.
- Owner is on Windows. clasp is installed on the owner's machine and logged in as harry@harryacademy.edu.vn. Global installs made from Claude's sandbox do NOT reach the owner's machine.
