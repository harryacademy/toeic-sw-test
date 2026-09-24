// Test flow: consent → overview → [directions → timed step] × N → grading wait → report.
// All progress is kept in localStorage, so a reload resumes where the student was, timers included.
(function () {
  'use strict';

  const KEY = 'ha_sw_state';
  const app = document.getElementById('app');
  let state = load();
  let tickTimer = null;
  let saveTimer = null;

  // ---------- state ----------

  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY));
      if (s && s.v === 1) return s;
    } catch (e) { /* ignore */ }
    return fresh();
  }

  function fresh() {
    return { v: 1, screen: 'consent', session_id: null, expires_at: null, form: null, name: '',
      stepIdx: 0, deadline: null, current: 0, answers: {}, report: null };
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

  function totalQuestions() {
    return state.form.steps.reduce((n, st) => n + st.questions.length, 0);
  }

  function step() {
    return state.form.steps[state.stepIdx];
  }

  function stepLabel(st) {
    const a = qNumber(st.questions[0].id);
    const b = qNumber(st.questions[st.questions.length - 1].id);
    return a === b ? 'Question ' + a : 'Questions ' + a + '–' + b;
  }

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
    const screens = { consent: renderConsent, overview: renderOverview, directions: renderDirections,
      step: renderStep, finishing: renderFinishing, report: renderReport, expired: renderExpired };
    (screens[state.screen] || renderConsent)();
    window.scrollTo(0, 0);
  }

  function renderConsent() {
    app.innerHTML = `
      <section class="card">
        <h1>Thi thử TOEIC Writing</h1>
        <p class="muted">Bài thi mô phỏng gồm 8 câu, khoảng 60 phút. Kết quả là điểm ước tính do AI chấm, không phải điểm chính thức của ETS.</p>
        <form id="f" class="form" novalidate>
          <label>Họ và tên<input name="full_name" autocomplete="name" required maxlength="80"></label>
          <label>Số điện thoại<input name="phone" type="tel" inputmode="tel" autocomplete="tel" required maxlength="15"></label>
          <label>Mã truy cập<input name="access_code" autocomplete="off" autocapitalize="characters" required maxlength="40"></label>
          <div class="notice">
            <strong>Thông báo thu thập thông tin</strong>
            <p>Harry Academy lưu họ tên, số điện thoại và bài làm của bạn để chấm điểm và tư vấn lộ trình học. Thông tin chỉ dùng nội bộ, không chia sẻ cho bên thứ ba. Bài làm được gửi đến dịch vụ AI của Google (Gemini) để chấm.</p>
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
      let err = '';
      if (String(d.full_name || '').trim().length < 2) err = 'Vui lòng nhập họ và tên.';
      else if (!/^(0|\+84)\d{9,10}$/.test(phone)) err = 'Số điện thoại chưa đúng định dạng.';
      else if (!String(d.access_code || '').trim()) err = 'Vui lòng nhập mã truy cập.';
      else if (!d.consent) err = 'Bạn cần đồng ý với thông báo thu thập thông tin.';
      if (err) {
        msg.hidden = false;
        msg.textContent = err;
        return;
      }
      const btn = f.querySelector('button');
      btn.disabled = true;
      btn.textContent = 'Đang kết nối...';
      msg.hidden = true;
      try {
        const r = await HA_API.call('startSession', {
          full_name: d.full_name, phone, access_code: d.access_code, consent: true
        });
        HA_QUEUE.clear();
        state = fresh();
        Object.assign(state, { session_id: r.session_id, expires_at: r.expires_at, form: r.form, name: String(d.full_name).trim() });
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
    const rows = state.form.steps.map((st) =>
      `<tr><td>${esc(stepLabel(st))}</td><td>${Math.round(st.time_sec / 60)} phút</td></tr>`).join('');
    app.innerHTML = `
      <section class="card">
        <h1>Chào ${esc(state.name)}</h1>
        <p>Phần Writing gồm ${totalQuestions()} câu:</p>
        <table class="plan">${rows}</table>
        <ul class="rules">
          <li>Mỗi phần có đồng hồ đếm ngược. Hết giờ, bài được nộp tự động.</li>
          <li>Đã nộp phần nào thì không quay lại phần đó được (câu 1–5 được chuyển qua lại trong 8 phút).</li>
          <li>Hướng dẫn trong bài bằng tiếng Anh, giống bài thi thật.</li>
          <li>Nếu lỡ tải lại trang, bài làm vẫn được giữ, nhưng đồng hồ vẫn chạy.</li>
        </ul>
        <button class="btn" type="button" id="go">Tôi đã sẵn sàng</button>
      </section>`;
    document.getElementById('go').addEventListener('click', () => go('directions'));
  }

  function renderDirections() {
    const st = step();
    app.innerHTML = `
      <section class="card">
        <div class="eyebrow">${esc(stepLabel(st))} · ${Math.round(st.time_sec / 60)} minutes</div>
        <h1>Directions</h1>
        <p class="directions">${esc(st.directions_en)}</p>
        <p class="muted">Đồng hồ bắt đầu khi bạn bấm nút bên dưới.</p>
        <button class="btn" type="button" id="go">Bắt đầu làm bài</button>
      </section>`;
    document.getElementById('go').addEventListener('click', () => {
      state.deadline = Date.now() + st.time_sec * 1000;
      state.current = 0;
      go('step');
    });
  }

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
          <dl><dt>From:</dt><dd>${esc(m.from)}</dd><dt>To:</dt><dd>${esc(m.to)}</dd><dt>Subject:</dt><dd>${esc(m.subject)}</dd></dl>
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
    go(state.stepIdx < state.form.steps.length ? 'directions' : 'finishing');
  }

  let finishing = false;

  function renderFinishing() {
    const c = HA_QUEUE.counts();
    const total = c.pending + c.done + c.failed;
    const failed = HA_QUEUE.items().filter((it) => it.status === 'failed');
    app.innerHTML = `
      <section class="card">
        <h1>Đang chấm bài</h1>
        <p>Bạn đã hoàn thành phần Writing. Hệ thống đang chấm từng câu, thường mất 1–3 phút. Vui lòng không đóng trang.</p>
        <div class="progress"><div style="width:${total ? Math.round(100 * c.done / total) : 0}%"></div></div>
        <p class="muted">Đã chấm ${c.done}/${total} câu.</p>
        ${failed.length ? `<div class="status is-error">Chưa chấm được ${failed.length} câu (${esc(failed[0].error && failed[0].error.message)}).</div>
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
      state.report = await HA_API.call('finishTest', {}, state.session_id);
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
    const r = state.report;
    const items = r.items.map((it) => {
      const errs = (it.errors || []).map((e) =>
        `<li><s>${esc(e.quote)}</s> → <strong>${esc(e.correction)}</strong><br><span class="muted">${esc(e.explanation_vi)}</span></li>`).join('');
      return `
        <article class="result">
          <header><h3>Question ${esc(qNumber(it.question_id))}</h3>
            <span class="score">${it.missing ? 'Chưa có điểm' : esc(it.ai_score) + ' / ' + esc(it.max_score)}</span></header>
          ${it.feedback_vi ? `<p>${esc(it.feedback_vi)}</p>` : ''}
          ${errs ? `<details><summary>Lỗi cần sửa (${(it.errors || []).length})</summary><ul class="errs">${errs}</ul></details>` : ''}
          ${it.review_flag ? '<p class="flag">Câu này sẽ được giáo viên xem lại.</p>' : ''}
        </article>`;
    }).join('');
    app.innerHTML = `
      <section class="card">
        <h1>Kết quả phần Writing</h1>
        <p class="total">Tổng điểm thô: <strong>${esc(r.raw)} / ${esc(r.max)}</strong></p>
        <p class="muted small">Điểm ước tính dựa trên bài thi mô phỏng, không phải điểm chính thức của ETS. Tư vấn viên của Harry Academy sẽ liên hệ để giải thích kết quả.</p>
        ${items}
        <button class="btn btn-ghost" type="button" id="new">Làm bài mới</button>
      </section>`;
    document.getElementById('new').addEventListener('click', restart);
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
    if (state.screen === 'step') {
      save();
      e.preventDefault();
      e.returnValue = '';
    }
  });
  window.addEventListener('pagehide', save);

  document.getElementById('version').textContent = 'Phiên bản ' + HA_CONFIG.VERSION;
  render();
  HA_QUEUE.kick();
})();
