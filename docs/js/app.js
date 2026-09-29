// Test flow: consent → overview → for each chosen section (Speaking first, then Writing):
//   Speaking: mic check → prompt loading → [directions → timed questions] × N
//   Writing:  [directions → timed step] × N
// → wait for uploads/grading → report.
// All progress is kept in localStorage, so a reload resumes where the student was, timers included.
(function () {
  'use strict';

  const KEY = 'ha_sw_state';
  const app = document.getElementById('app');
  // Speaking is only offered on the preview link (?preview=speaking) until it is released.
  const PREVIEW = new URLSearchParams(location.search).get('preview') === 'speaking';
  let state = load();
  let tickTimer = null;
  let saveTimer = null;
  const buffers = {};   // prompt audio, decoded (in memory only)

  // ---------- state ----------

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 2) return s;
      if (s && s.v === 1) return migrate(s);
    } catch (e) { /* ignore */ }
    return fresh();
  }

  // Version 1 (Writing only) → version 2, so a test in progress survives the update.
  function migrate(s) {
    const n = Object.assign(fresh(), s, { v: 2, sections: ['writing'], forms: { writing: s.form }, secIdx: 0, reports: {} });
    if (s.report) n.reports.writing = s.report;
    delete n.form;
    delete n.report;
    return n;
  }

  function fresh() {
    return { v: 2, screen: 'consent', session_id: null, expires_at: null, name: '', preview: PREVIEW,
      sections: [], forms: {}, secIdx: 0, stepIdx: 0, deadline: null, current: 0, answers: {},
      sp: null, reports: {} };
  }

  function save() {
    clearTimeout(saveTimer);
    saveTimer = null;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('[app] could not save', e);
    }
  }

  function saveSoon() {
    if (!saveTimer) saveTimer = setTimeout(save, 400);
  }

  function go(screen) {
    state.screen = screen;
    save();
    render();
  }

  // ---------- helpers ----------

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function wordCount(t) {
    return (String(t).trim().match(/\S+/g) || []).length;
  }

  function fmtTime(ms) {
    const s = Math.max(0, Math.ceil(ms / 1000));
    return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
  }

  function qNumber(qid) {
    return qid.replace(/^\D+/, '');
  }

  function section() {
    return state.sections[state.secIdx];
  }

  function form() {
    return state.forms[section()];
  }

  function totalQuestions(f) {
    return (f || form()).steps.reduce((n, st) => n + st.questions.length, 0);
  }

  function step() {
    return form().steps[state.stepIdx];
  }

  function stepLabel(st) {
    const a = qNumber(st.questions[0].id);
    const b = qNumber(st.questions[st.questions.length - 1].id);
    return a === b ? 'Question ' + a : 'Questions ' + a + '–' + b;
  }

  const SECTION_NAME = { speaking: 'Speaking', writing: 'Writing' };

  function confirmBox(message, okLabel) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal';
      wrap.innerHTML = '<div class="modal-card" role="dialog" aria-modal="true">' +
        '<p>' + esc(message) + '</p><div class="row">' +
        '<button type="button" class="btn btn-ghost" data-v="0">Quay lại</button>' +
        '<button type="button" class="btn" data-v="1">' + esc(okLabel) + '</button></div></div>';
      wrap.addEventListener('click', (e) => {
        const v = e.target.getAttribute('data-v');
        if (v === null) return;
        wrap.remove();
        resolve(v === '1');
      });
      document.body.appendChild(wrap);
      wrap.querySelector('[data-v="1"]').focus();
    });
  }

  function expired() {
    return state.expires_at && Date.now() > new Date(state.expires_at).getTime();
  }

  // ---------- render ----------

  function render() {
    clearInterval(tickTimer);
    tickTimer = null;
    if (state.screen !== 'consent' && state.screen !== 'report' && expired()) state.screen = 'expired';
    const screens = { consent: renderConsent, overview: renderOverview, mic: renderMic, loading: renderLoading,
      directions: renderDirections, step: renderStep, speak: renderSpeak, finishing: renderFinishing,
      report: renderReport, expired: renderExpired };
    (screens[state.screen] || renderConsent)();
    window.scrollTo(0, 0);
  }

  function renderConsent() {
    const withSpeaking = PREVIEW;
    app.innerHTML = `
      <section class="card">
        <h1>${withSpeaking ? 'Thi thử TOEIC Speaking &amp; Writing' : 'Thi thử TOEIC Writing'}</h1>
        <p class="muted">${withSpeaking
          ? 'Speaking gồm 11 câu, khoảng 20 phút. Writing gồm 8 câu, khoảng 60 phút.'
          : 'Bài thi mô phỏng gồm 8 câu, khoảng 60 phút.'} Kết quả là điểm ước tính, không phải điểm chính thức của ETS.</p>
        <form id="f" class="form" novalidate>
          ${withSpeaking ? `
          <fieldset class="choice">
            <legend>Bạn muốn làm phần nào?</legend>
            <label class="check"><input type="checkbox" name="sec_speaking" checked> Speaking (khoảng 20 phút, cần micro)</label>
            <label class="check"><input type="checkbox" name="sec_writing" checked> Writing (khoảng 60 phút)</label>
          </fieldset>` : ''}
          <label>Họ và tên<input name="full_name" autocomplete="name" required maxlength="80"></label>
          <label>Số điện thoại<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="15"></label>
          <label>Mã truy cập<input name="access_code" autocomplete="off" autocapitalize="characters" required maxlength="40"></label>
          <div class="notice">
            <strong>Thông báo thu thập thông tin</strong>
            <p>Harry Academy lưu họ tên, số điện thoại và bài làm của bạn để chấm điểm và tư vấn lộ trình học. Họ tên và số điện thoại chỉ dùng nội bộ, không chia sẻ cho bên thứ ba. Bài làm (không kèm thông tin cá nhân) được chấm bằng hệ thống chấm điểm tự động.${withSpeaking
              ? ' Phần Speaking được ghi âm; bản ghi âm được lưu tối đa 7 ngày rồi tự xóa.' : ''}</p>
            <label class="check"><input type="checkbox" name="consent" required> Tôi đã đọc và đồng ý.</label>
          </div>
          <button class="btn" type="submit">Bắt đầu</button>
          <div id="msg" class="status is-error" role="alert" hidden></div>
        </form>
      </section>`;
    const f = document.getElementById('f');
    const msg = document.getElementById('msg');
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const d = Object.fromEntries(new FormData(f));
      const phone = String(d.phone || '').replace(/[\s.\-()]/g, '');
      const sections = withSpeaking
        ? ['speaking', 'writing'].filter((s) => d['sec_' + s])
        : ['writing'];
      let err = '';
      if (!sections.length) err = 'Hãy chọn ít nhất một phần thi.';
      else if (String(d.full_name || '').trim().length < 2) err = 'Vui lòng nhập họ và tên.';
      else if (!/^(0|\+84)\d{9,10}$/.test(phone)) err = 'Số điện thoại chưa đúng định dạng.';
      else if (!String(d.access_code || '').trim()) err = 'Vui lòng nhập mã truy cập.';
      else if (!d.consent) err = 'Bạn cần đồng ý với thông báo thu thập thông tin.';
      if (err) {
        msg.hidden = false;
        msg.textContent = err;
        return;
      }
      const btn = f.querySelector('button[type=submit]');
      btn.disabled = true;
      btn.textContent = 'Đang kết nối...';
      msg.hidden = true;
      try {
        const r = await HA_API.call('startSession', {
          full_name: d.full_name, phone, access_code: d.access_code, consent: true, sections
        });
        HA_QUEUE.clear();
        state = fresh();
        Object.assign(state, {
          session_id: r.session_id, expires_at: r.expires_at, name: String(d.full_name).trim(),
          sections: r.sections || ['writing'], forms: r.forms || { writing: r.form }
        });
        go('overview');
      } catch (e2) {
        msg.hidden = false;
        msg.textContent = e2.message;
        btn.disabled = false;
        btn.textContent = 'Bắt đầu';
      }
    });
  }

  function renderOverview() {
    const parts = state.sections.map((sec) => {
      const f = state.forms[sec];
      const rows = f.steps.map((st) => `<tr><td>${esc(stepLabel(st))}</td><td>${esc(stepTime(st))}</td></tr>`).join('');
      return `<h2 class="step-title">${SECTION_NAME[sec]} · ${totalQuestions(f)} câu</h2><table class="plan">${rows}</table>`;
    }).join('');
    const speaking = state.sections.indexOf('speaking') >= 0;
    app.innerHTML = `
      <section class="card">
        <h1>Chào ${esc(state.name)}</h1>
        ${parts}
        <ul class="rules">
          <li>Mỗi phần có đồng hồ đếm ngược. Hết giờ, bài được nộp tự động.</li>
          <li>Đã nộp phần nào thì không quay lại phần đó được${state.sections.indexOf('writing') >= 0 ? ' (Writing câu 1–5 được chuyển qua lại trong 8 phút)' : ''}.</li>
          ${speaking ? '<li>Speaking: máy tự ghi âm khi có tiếng bíp và tự dừng khi hết giờ. Hãy làm bài ở nơi yên tĩnh.</li>' : ''}
          <li>Hướng dẫn trong bài bằng tiếng Anh, giống bài thi thật.</li>
          <li>Nếu lỡ tải lại trang, bài làm vẫn được giữ, nhưng đồng hồ vẫn chạy${speaking ? ' (câu Speaking đang ghi âm dở sẽ bị mất)' : ''}.</li>
        </ul>
        <button class="btn" type="button" id="go">Tôi đã sẵn sàng</button>
      </section>`;
    document.getElementById('go').addEventListener('click', startSection);
  }

  function stepTime(st) {
    if (st.time_sec) return Math.round(st.time_sec / 60) + ' phút';
    const q = st.questions[0];
    return 'chuẩn bị ' + q.prep_sec + 's · trả lời ' + st.questions.map((x) => x.resp_sec + 's').join(' / ');
  }

  // Enters the section at state.secIdx.
  function startSection() {
    state.stepIdx = 0;
    state.deadline = null;
    state.current = 0;
    state.sp = null;
    go(section() === 'speaking' ? 'mic' : 'directions');
  }

  // After the last step of a section: next section, or wait for grading.
  function endSection() {
    state.secIdx++;
    if (state.secIdx < state.sections.length) startSection();
    else go('finishing');
  }

  function renderDirections() {
    const st = step();
    const speaking = section() === 'speaking';
    app.innerHTML = `
      <section class="card">
        <div class="eyebrow">${SECTION_NAME[section()]} · ${esc(stepLabel(st))}${st.time_sec ? ' · ' + Math.round(st.time_sec / 60) + ' minutes' : ''}</div>
        <h1>Directions</h1>
        <p class="directions">${esc(st.directions_en)}</p>
        <p class="muted">${speaking ? 'Khi bấm nút bên dưới, phần này bắt đầu chạy liên tục cho đến hết câu cuối.' : 'Đồng hồ bắt đầu khi bạn bấm nút bên dưới.'}</p>
        <button class="btn" type="button" id="go">Bắt đầu làm bài</button>
        <div id="msg" class="status is-error" role="alert" hidden></div>
      </section>`;
    document.getElementById('go').addEventListener('click', async () => {
      if (speaking) {
        const btn = document.getElementById('go');
        btn.disabled = true;
        try {
          await ensureAudio();   // after a reload the mic and prompts must be set up again (needs this tap)
        } catch (e) {
          const msg = document.getElementById('msg');
          msg.hidden = false;
          msg.textContent = e.message;
          btn.disabled = false;
          return;
        }
        state.sp = { phase: 0, deadline: null };
        go('speak');
        return;
      }
      state.deadline = Date.now() + st.time_sec * 1000;
      state.current = 0;
      go('step');
    });
  }

  // ---------- Writing ----------

  function renderStep() {
    clearInterval(tickTimer);
    const st = step();
    if (!state.deadline) state.deadline = Date.now() + st.time_sec * 1000;
    if (Date.now() >= state.deadline) {
      submitStep();
      return;
    }
    const q = st.questions[Math.min(state.current, st.questions.length - 1)];
    const multi = st.questions.length > 1;
    const last = !multi || state.current === st.questions.length - 1;

    let body = '';
    if (st.type === 'picture_sentence') {
      body = `
        <figure class="picture"><img src="${esc(q.image)}" alt="Picture for question ${esc(qNumber(q.id))}"></figure>
        <div class="words">${q.words.map((w) => `<span>${esc(w)}</span>`).join('<i>/</i>')}</div>`;
    } else if (st.type === 'email') {
      const m = q.email;
      body = `
        <article class="email">
          <dl><dt>From:</dt><dd>${esc(m.from)}</dd><dt>To:</dt><dd>${esc(m.to)}</dd><dt>Subject:</dt><dd>${esc(m.subject)}</dd>${m.sent ? `<dt>Sent:</dt><dd>${esc(m.sent)}</dd>` : ''}</dl>
          <div class="email-body">${esc(m.body)}</div>
        </article>
        <p class="directions"><strong>Directions:</strong> ${esc(q.task)}</p>`;
    } else if (st.type === 'essay') {
      body = `<p class="directions prompt">${esc(q.prompt)}</p>`;
    }

    const nav = multi ? `<nav class="qnav" aria-label="Questions">${st.questions.map((x, i) =>
      `<button type="button" data-i="${i}" class="${i === state.current ? 'is-current' : ''} ${String(state.answers[x.id] || '').trim() ? 'is-done' : ''}">${esc(qNumber(x.id))}</button>`).join('')}</nav>` : '';

    app.innerHTML = `
      <div class="testbar">
        <span>${esc(multi ? 'Question ' + qNumber(q.id) + ' of ' + totalQuestions() : stepLabel(st) + ' of ' + totalQuestions())}</span>
        <span class="timer" id="timer" role="timer" aria-live="off"></span>
      </div>
      <section class="card">
        ${nav}
        ${body}
        <textarea id="answer" class="answer ${st.type === 'picture_sentence' ? 'short' : ''}" spellcheck="false" autocorrect="off"
          autocapitalize="off" autocomplete="off" aria-label="Your answer">${esc(state.answers[q.id] || '')}</textarea>
        <div class="answer-meta"><span id="wc"></span></div>
        <div class="row">
          ${multi && state.current > 0 ? '<button type="button" class="btn btn-ghost" id="prev">Câu trước</button>' : ''}
          ${last ? '<button type="button" class="btn" id="submit">Nộp bài' + (multi ? ' câu 1–5' : '') + '</button>'
                 : '<button type="button" class="btn" id="next">Câu tiếp theo</button>'}
        </div>
      </section>`;

    const ta = document.getElementById('answer');
    const wc = document.getElementById('wc');
    const showWc = () => { wc.textContent = wordCount(ta.value) + ' words'; };
    showWc();
    ta.addEventListener('input', () => {
      state.answers[q.id] = ta.value;
      showWc();
      saveSoon();
    });
    const move = (i) => { state.answers[q.id] = ta.value; state.current = i; save(); renderStep(); };
    app.querySelectorAll('.qnav button').forEach((b) => b.addEventListener('click', () => move(Number(b.dataset.i))));
    const prev = document.getElementById('prev');
    if (prev) prev.addEventListener('click', () => move(state.current - 1));
    const next = document.getElementById('next');
    if (next) next.addEventListener('click', () => move(state.current + 1));
    const sub = document.getElementById('submit');
    if (sub) sub.addEventListener('click', async () => {
      state.answers[q.id] = ta.value;
      save();
      const blanks = st.questions.filter((x) => !String(state.answers[x.id] || '').trim()).length;
      const msg = (blanks ? 'Còn ' + blanks + ' câu chưa trả lời. ' : '') + 'Sau khi nộp, bạn không thể quay lại phần này.';
      if (await confirmBox(msg, 'Nộp bài')) submitStep();
    });

    const timerEl = document.getElementById('timer');
    const tick = () => {
      const left = state.deadline - Date.now();
      timerEl.textContent = fmtTime(left);
      timerEl.classList.toggle('is-low', left < 60000);
      if (left <= 0) {
        state.answers[q.id] = ta.value;
        submitStep();
      }
    };
    tick();
    tickTimer = setInterval(tick, 250);
  }

  // Queues every answer of the current step for grading and moves on without waiting.
  function submitStep() {
    clearInterval(tickTimer);
    tickTimer = null;
    document.querySelectorAll('.modal').forEach((m) => m.remove());
    const st = step();
    st.questions.forEach((q) => {
      HA_QUEUE.add('submit:' + q.id, 'submitAnswer', { question_id: q.id, response: state.answers[q.id] || '' }, state.session_id);
    });
    state.stepIdx++;
    state.deadline = null;
    state.current = 0;
    if (state.stepIdx < form().steps.length) go('directions');
    else endSection();
  }

  // ---------- Speaking: microphone and prompt audio ----------

  function renderMic() {
    app.innerHTML = `
      <section class="card">
        <div class="eyebrow">Speaking</div>
        <h1>Kiểm tra micro</h1>
        <p>Phần Speaking cần micro. Hãy ngồi ở nơi yên tĩnh${/iPhone|iPad|Android/.test(navigator.userAgent) ? ', giữ điện thoại cách miệng khoảng một gang tay' : ''}.</p>
        <button id="enable" class="btn" type="button">Bật micro</button>
        <div class="meter" aria-hidden="true"><div id="level"></div></div>
        <p class="muted small">Nói thử vài từ: thanh màu phải nhảy theo giọng của bạn.</p>
        <button id="quick" class="btn btn-ghost" type="button" disabled>Ghi thử 5 giây và nghe lại</button>
        <audio id="playback" controls hidden></audio>
        <div class="row"><button id="go" class="btn" type="button" disabled>Micro ổn, tiếp tục</button></div>
        <div id="msg" class="status is-error" role="alert" hidden></div>
      </section>`;
    const $ = (id) => document.getElementById(id);
    const showError = (m) => { $('msg').hidden = !m; $('msg').textContent = m || ''; };
    HA_REC.onLevel = (x) => { const l = $('level'); if (l) l.style.width = Math.round(x * 100) + '%'; };
    const ready = () => {
      $('enable').textContent = 'Micro đã bật';
      $('enable').disabled = true;
      $('quick').disabled = false;
      $('go').disabled = false;
    };
    if (HA_REC.ready) ready();
    $('enable').addEventListener('click', async () => {
      showError('');
      try {
        await HA_REC.init();
        ready();
      } catch (e) {
        showError(e.message);
      }
    });
    $('quick').addEventListener('click', () => {
      $('quick').disabled = true;
      HA_REC.start();
      let left = 5;
      $('quick').textContent = 'Đang ghi… ' + left;
      const t = setInterval(() => {
        left--;
        if (!$('quick')) { clearInterval(t); HA_REC.stop(); return; }
        $('quick').textContent = 'Đang ghi… ' + left;
        if (left > 0) return;
        clearInterval(t);
        const r = HA_REC.stop();
        $('playback').src = URL.createObjectURL(r.blob);
        $('playback').hidden = false;
        $('quick').textContent = 'Ghi thử lại';
        $('quick').disabled = false;
        showError(r.peak < 0.02 ? 'Bản ghi gần như im lặng. Kiểm tra lại micro hoặc nói to hơn.' : '');
      }, 1000);
    });
    $('go').addEventListener('click', () => go('loading'));
  }

  function promptSources() {
    const srcs = [];
    state.forms.speaking.steps.forEach((st) => {
      if (st.context_audio) srcs.push(st.context_audio);
      st.questions.forEach((q) => { if (q.audio) srcs.push(q.audio); });
    });
    return srcs.filter((s, i) => srcs.indexOf(s) === i);
  }

  // Makes sure the mic is on and every prompt is decoded in memory. Must run from a tap after a reload.
  async function ensureAudio(onProgress) {
    await HA_REC.init();
    const srcs = promptSources();
    let n = 0;
    for (const src of srcs) {
      if (!buffers[src]) buffers[src] = await HA_REC.load(src);
      n++;
      if (onProgress) onProgress(n, srcs.length);
    }
  }

  function renderLoading() {
    app.innerHTML = `
      <section class="card">
        <div class="eyebrow">Speaking</div>
        <h1>Đang chuẩn bị đề</h1>
        <p>Hệ thống tải trước toàn bộ âm thanh của đề để bài thi không bị gián đoạn.</p>
        <div class="progress"><div id="bar" style="width:0%"></div></div>
        <p class="muted" id="count"></p>
        <button id="go" class="btn" type="button" hidden>Tiếp tục</button>
        <div id="msg" class="status is-error" role="alert" hidden></div>
      </section>`;
    const $ = (id) => document.getElementById(id);
    const run = async () => {
      $('go').hidden = true;
      $('msg').hidden = true;
      try {
        await ensureAudio((n, total) => {
          $('bar').style.width = Math.round(100 * n / total) + '%';
          $('count').textContent = 'Đã tải ' + n + '/' + total;
        });
        go('directions');
      } catch (e) {
        $('msg').hidden = false;
        $('msg').textContent = e.message;
        $('go').hidden = false;
        $('go').textContent = 'Thử lại';
      }
    };
    $('go').addEventListener('click', run);
    // After a reload the audio system needs a tap before it may start.
    if (HA_REC.ready) run();
    else { $('go').hidden = false; $('count').textContent = 'Bấm Tiếp tục để bật lại micro.'; }
  }

  // ---------- Speaking: timed questions ----------

  // The fixed sequence of a Speaking step: play prompts, prepare, record.
  function speakingPhases(st) {
    const ph = [];
    if (st.read_sec) ph.push({ kind: 'wait', label: 'Reading time', sec: st.read_sec, q: 0 });
    if (st.context_audio) ph.push({ kind: 'play', src: st.context_audio, q: 0, context: true });
    st.questions.forEach((q, i) => {
      for (let k = 0; k < (q.play_times || (q.audio ? 1 : 0)); k++) ph.push({ kind: 'play', src: q.audio, q: i });
      ph.push({ kind: 'wait', label: 'Preparation time', sec: q.prep_sec, q: i, beepAfter: true });
      ph.push({ kind: 'record', label: 'Response time', sec: q.resp_sec, q: i });
    });
    return ph;
  }

  let phaseToken = 0;   // invalidates callbacks of a phase that was left

  function renderSpeak() {
    clearInterval(tickTimer);
    tickTimer = null;
    const st = step();
    const phases = speakingPhases(st);
    const sp = state.sp || (state.sp = { phase: 0, deadline: null });
    if (sp.phase >= phases.length) return endSpeakingStep();

    // After a reload: the mic must be re-enabled by a tap; a recording in progress is lost.
    if (!HA_REC.ready || promptSources().some((s) => !buffers[s])) return renderSpeakResume(st, phases);

    const ph = phases[sp.phase];
    const q = st.questions[ph.q];
    const token = ++phaseToken;
    app.innerHTML = `
      <div class="testbar">
        <span>Question ${esc(qNumber(q.id))} of ${totalQuestions()}</span>
        <span class="timer" id="timer" role="timer" aria-live="off"></span>
      </div>
      <section class="card">
        <div class="phase ${ph.kind === 'record' ? 'is-rec' : ''}" id="phase">${esc(phaseText(ph))}</div>
        ${ph.kind === 'record' ? '<div class="meter" aria-hidden="true"><div id="level"></div></div>' : ''}
        ${speakBody(st, q, ph)}
      </section>`;
    HA_REC.onLevel = (x) => { const l = document.getElementById('level'); if (l) l.style.width = Math.round(x * 100) + '%'; };
    const timerEl = document.getElementById('timer');

    if (ph.kind === 'play') {
      timerEl.textContent = '';
      HA_REC.play(buffers[ph.src]).then(() => { if (token === phaseToken) nextPhase(); });
      return;
    }
    if (!sp.deadline) {
      sp.deadline = Date.now() + ph.sec * 1000;
      save();
    }
    if (ph.kind === 'record') HA_REC.start();
    const tick = () => {
      const left = sp.deadline - Date.now();
      timerEl.textContent = fmtTime(left);
      timerEl.classList.toggle('is-low', ph.kind === 'record' && left < 5000);
      if (left > 0) return;
      clearInterval(tickTimer);
      tickTimer = null;
      if (ph.kind === 'record') {
        saveRecording(q, HA_REC.stop());
        nextPhase();
      } else if (ph.beepAfter) {
        HA_REC.beep().then(() => { if (token === phaseToken) nextPhase(); });
      } else {
        nextPhase();
      }
    };
    tick();
    if (tickTimer === null && sp.deadline - Date.now() > 0) tickTimer = setInterval(tick, 200);
  }

  function phaseText(ph) {
    if (ph.kind === 'play') return ph.context ? 'Listen.' : 'Listen to the question.';
    if (ph.kind === 'record') return 'Response time — recording';
    return ph.label;
  }

  function speakBody(st, q, ph) {
    if (st.type === 'read_aloud') return `<p class="read-text">${esc(q.text)}</p>`;
    if (st.type === 'describe_picture') return `<figure class="picture"><img src="${esc(q.image)}" alt="Picture for question ${esc(qNumber(q.id))}"></figure>`;
    if (st.type === 'respond_questions') {
      const showQ = !ph.context;
      return `<p class="context">${esc(st.context_text || '')}</p>${showQ && q.text ? `<p class="directions prompt">${esc(q.text)}</p>` : ''}`;
    }
    if (st.type === 'respond_info') {
      const i = st.info;
      return `<article class="info">
        <h3>${esc(i.title)}</h3>${i.subtitle ? `<p class="muted">${esc(i.subtitle)}</p>` : ''}
        <table>${i.lines.map((l) => `<tr><td>${esc(l[0])}</td><td>${esc(l[1])}</td></tr>`).join('')}</table>
        ${(i.notes || []).map((n) => `<p class="small">${esc(n)}</p>`).join('')}
      </article>`;
    }
    if (st.type === 'opinion') return `<p class="directions prompt">${esc(q.text)}</p>`;
    return '';
  }

  function nextPhase() {
    state.sp.phase++;
    state.sp.deadline = null;
    save();
    renderSpeak();
  }

  function endSpeakingStep() {
    state.sp = null;
    state.stepIdx++;
    if (state.stepIdx < form().steps.length) go('directions');
    else endSection();
  }

  function renderSpeakResume(st, phases) {
    const ph = phases[state.sp.phase];
    const q = st.questions[ph.q];
    app.innerHTML = `
      <section class="card">
        <div class="eyebrow">Speaking · Question ${esc(qNumber(q.id))}</div>
        <h1>Tiếp tục phần Speaking</h1>
        <p>Trang vừa được tải lại. Bấm nút bên dưới để bật lại micro và làm tiếp.${ph.kind === 'record'
          ? ' Câu đang ghi âm dở đã bị mất, bài sẽ tiếp tục từ câu sau.' : ''}</p>
        <button id="go" class="btn" type="button">Tiếp tục</button>
        <div id="msg" class="status is-error" role="alert" hidden></div>
      </section>`;
    document.getElementById('go').addEventListener('click', async () => {
      try {
        await ensureAudio();
      } catch (e) {
        const msg = document.getElementById('msg');
        msg.hidden = false;
        msg.textContent = e.message;
        return;
      }
      if (ph.kind === 'record') {
        markLost(q);
        let i = state.sp.phase + 1;
        while (i < phases.length && phases[i].q === ph.q) i++;
        state.sp.phase = i;
      }
      state.sp.deadline = null;   // restart the interrupted wait/play from its beginning
      save();
      renderSpeak();
    });
  }

  // Stores the recording on the device and queues its upload; the test never waits for the network.
  function saveRecording(q, r) {
    const key = 'sp-' + String(state.session_id).slice(0, 8) + '-' + q.id;
    const payload = { question_id: q.id, duration_ms: r.durationMs, peak: Math.round(r.peak * 100) / 100 };
    HA_AUDIO_STORE.put(key, r.blob)
      .then(() => HA_QUEUE.add('speak:' + q.id, 'submitSpeaking', payload, state.session_id, { audioKey: key }))
      .catch(() => {
        // No IndexedDB (e.g. some private modes): send straight away instead.
        HA_AUDIO_STORE.toBase64(r.blob)
          .then((b64) => HA_API.call('submitSpeaking', Object.assign({ audio_b64: b64 }, payload), state.session_id))
          .catch((e) => console.warn('[speak] direct upload failed', e));
      });
  }

  function markLost(q) {
    HA_QUEUE.add('speak:' + q.id, 'submitSpeaking', { question_id: q.id, duration_ms: 0 }, state.session_id);
  }

  // ---------- finish and report ----------

  let finishing = false;

  function renderFinishing() {
    const c = HA_QUEUE.counts();
    const total = c.pending + c.done + c.failed;
    const failed = HA_QUEUE.items().filter((it) => it.status === 'failed');
    const names = state.sections.map((s) => SECTION_NAME[s]).join(' và ');
    app.innerHTML = `
      <section class="card">
        <h1>Đang chấm bài</h1>
        <p>Bạn đã hoàn thành phần ${esc(names)}. Hệ thống đang gửi và chấm từng câu, thường mất 1–3 phút. Vui lòng không đóng trang.</p>
        <div class="progress"><div style="width:${total ? Math.round(100 * c.done / total) : 0}%"></div></div>
        <p class="muted">Đã xử lý ${c.done}/${total} câu.</p>
        ${failed.length ? `<div class="status is-error">Chưa xử lý được ${failed.length} câu (${esc(failed[0].error && failed[0].error.message)}).</div>
          <button class="btn" type="button" id="retry">Thử lại</button>` : ''}
        <div id="msg" class="status is-error" hidden></div>
      </section>`;
    const retry = document.getElementById('retry');
    if (retry) retry.addEventListener('click', () => HA_QUEUE.retryFailed());
    if (c.pending === 0 && c.failed === 0 && !finishing) finish();
  }

  async function finish() {
    finishing = true;
    try {
      for (const sec of state.sections) {
        if (!state.reports[sec]) {
          state.reports[sec] = await HA_API.call('finishTest', { section: sec }, state.session_id);
          save();
        }
      }
      go('report');
    } catch (e) {
      const msg = document.getElementById('msg');
      if (msg) {
        msg.hidden = false;
        msg.innerHTML = esc(e.message) + ' <button class="btn btn-ghost btn-sm" type="button" id="again">Thử lại</button>';
        document.getElementById('again').addEventListener('click', () => { msg.hidden = true; finish(); });
      }
    } finally {
      finishing = false;
    }
  }

  function renderReport() {
    const blocks = state.sections.map((sec) => reportBlock(sec, state.reports[sec])).join('');
    app.innerHTML = `
      <section class="card">
        <h1>Kết quả</h1>
        <p class="muted small">Điểm ước tính dựa trên bài thi mô phỏng, không phải điểm chính thức của ETS. Tư vấn viên của Harry Academy sẽ liên hệ để giải thích kết quả.</p>
        ${blocks}
        <button class="btn btn-ghost" type="button" id="new">Làm bài mới</button>
      </section>`;
    document.getElementById('new').addEventListener('click', restart);
  }

  function reportBlock(sec, r) {
    if (!r) return '';
    const name = SECTION_NAME[sec];
    const items = r.items.map((it) => {
      const errs = (it.errors || []).map((e) =>
        `<li><s>${esc(e.quote)}</s> → <strong>${esc(e.correction)}</strong><br><span class="muted">${esc(e.explanation_vi)}</span></li>`).join('');
      let score;
      if (!it.missing) score = esc(String(it.ai_score).replace('.', ',')) + ' / ' + esc(it.max_score);
      else if (sec === 'speaking') score = it.audio_link ? 'Đã ghi âm · chưa chấm' : 'Không có bản ghi';
      else score = 'Chưa có điểm';
      return `
        <article class="result">
          <header><h3>Question ${esc(qNumber(it.question_id))}</h3><span class="score">${score}</span></header>
          ${it.transcript ? `<p class="transcript">“${esc(it.transcript)}”</p>` : ''}
          ${it.feedback_vi ? `<p>${esc(it.feedback_vi)}</p>` : ''}
          ${errs ? `<details><summary>Lỗi cần sửa (${(it.errors || []).length})</summary><ul class="errs">${errs}</ul></details>` : ''}
          ${it.review_flag && !it.missing ? '<p class="flag">Câu này sẽ được giáo viên xem lại.</p>' : ''}
        </article>`;
    }).join('');
    const num = (x) => String(x).replace('.', ',');
    const groupRows = (r.groups || []).map((g) => {
      const label = g.label.replace(/^Q/, 'Câu ').replace('-', '–');
      const shown = g.scores.map((x) => (x === null ? '–' : num(x)));
      const value = g.scores.length > 2
        ? (g.avg === null ? '–' : 'Trung bình ' + num(g.avg)) + ' / ' + g.max
        : shown.join(' và ') + ' / ' + g.max;
      return `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`;
    }).join('');
    const est = r.estimate;
    const estBlock = est ? `
        <div class="estimate">
          <div class="estimate-label">Điểm ${name} ước tính</div>
          <div class="estimate-range">${esc(est.low)}–${esc(est.high)}<span>/ 200</span></div>
          ${est.level ? `<div class="estimate-level">Level ${esc(est.level)}</div>` : ''}
        </div>` : '';
    return `
      <h2 class="section-title">${name}</h2>
      ${estBlock}
      <table class="plan summary">${groupRows}</table>
      ${items}`;
  }

  function renderExpired() {
    app.innerHTML = `
      <section class="card">
        <h1>Phiên làm bài đã hết hạn</h1>
        <p>Vui lòng liên hệ Harry Academy để nhận mã truy cập mới.</p>
        <button class="btn" type="button" id="new">Bắt đầu lại</button>
      </section>`;
    document.getElementById('new').addEventListener('click', restart);
  }

  async function restart() {
    if (state.screen === 'report' && !(await confirmBox('Kết quả trên trang này sẽ bị xóa khỏi trình duyệt.', 'Làm bài mới'))) return;
    HA_QUEUE.clear();
    state = fresh();
    go('consent');
  }

  // ---------- wiring ----------

  HA_QUEUE.onChange(() => {
    if (state.screen === 'finishing') renderFinishing();
  });

  window.addEventListener('beforeunload', (e) => {
    if (state.screen === 'step' || state.screen === 'speak') {
      save();
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.addEventListener('pagehide', save);

  document.getElementById('version').textContent = 'Phiên bản ' + HA_CONFIG.VERSION + (PREVIEW ? ' · xem trước Speaking' : '');
  render();
  HA_QUEUE.kick();
})();
