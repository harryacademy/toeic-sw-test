// Microphone recorder: captures raw audio with the Web Audio API and encodes 16 kHz mono 16-bit WAV
// in the browser (no codec differences between Chrome, Safari and in-app browsers).
// Usage: await HA_REC.init(); HA_REC.onLevel = fn(0..1); HA_REC.start(); const r = HA_REC.stop();
//   r = { blob: Blob(audio/wav), durationMs, peak }
// init() must be called from a user gesture (tap/click), which iOS requires for audio.
(function () {
  'use strict';

  const TARGET_RATE = 16000;
  let ctx = null;
  let stream = null;
  let chunks = [];
  let recording = false;
  let startedAt = 0;

  // Maps getUserMedia failures to Vietnamese messages for the student.
  function explain(err) {
    const inApp = /Zalo|FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent);
    const openOutside = inApp
      ? ' Trình duyệt trong ứng dụng (Zalo, Facebook, …) có thể chặn micro: hãy mở link bằng Chrome hoặc Safari.'
      : '';
    const name = err && err.name;
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return 'Trình duyệt chưa được phép dùng micro. Hãy cho phép micro trong cài đặt trình duyệt rồi thử lại.' + openOutside;
    }
    if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'Không tìm thấy micro trên thiết bị này.';
    if (name === 'NotReadableError') return 'Micro đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó rồi thử lại.';
    return 'Không mở được micro (' + (name || err) + ').' + openOutside;
  }

  function supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && (window.AudioContext || window.webkitAudioContext));
  }

  // opts.stream: use this MediaStream instead of the microphone (for automated tests).
  async function init(opts) {
    if (ctx) {
      if (ctx.state === 'suspended') await ctx.resume();
      return;
    }
    if (!supported()) {
      throw new Error(explain({ name: 'Unsupported' }).replace('(Unsupported)', '(trình duyệt không hỗ trợ ghi âm)'));
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    try {
      stream = (opts && opts.stream) || await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (err) {
      ctx.close();
      ctx = null;
      throw new Error(explain(err));
    }
    if (ctx.state === 'suspended') await ctx.resume();
    const source = ctx.createMediaStreamSource(stream);
    let node;
    if (ctx.audioWorklet && window.AudioWorkletNode) {
      const code = "class P extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('ha-rec',P);";
      const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
      await ctx.audioWorklet.addModule(url);
      node = new AudioWorkletNode(ctx, 'ha-rec');
      node.port.onmessage = (e) => handle(e.data);
    } else {
      node = ctx.createScriptProcessor(4096, 1, 1);
      node.onaudioprocess = (e) => handle(new Float32Array(e.inputBuffer.getChannelData(0)));
    }
    source.connect(node);
    // Some browsers only process nodes that reach the output; route through a muted gain.
    const mute = ctx.createGain();
    mute.gain.value = 0;
    node.connect(mute);
    mute.connect(ctx.destination);
  }

  function handle(buf) {
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    if (api.onLevel) api.onLevel(Math.min(1, Math.sqrt(sum / buf.length) * 4));
    if (recording) chunks.push(buf);
  }

  function start() {
    if (!ctx) throw new Error('Micro chưa được bật.');
    chunks = [];
    recording = true;
    startedAt = performance.now();
  }

  function stop() {
    recording = false;
    const durationMs = Math.round(performance.now() - startedAt);
    const input = merge(chunks);
    chunks = [];
    const pcm = downsample(input, ctx.sampleRate, TARGET_RATE);
    let peak = 0;
    for (let i = 0; i < pcm.length; i++) peak = Math.max(peak, Math.abs(pcm[i]));
    return { blob: encodeWav(pcm, TARGET_RATE), durationMs, peak };
  }

  function merge(list) {
    let n = 0;
    list.forEach((c) => { n += c.length; });
    const out = new Float32Array(n);
    let o = 0;
    list.forEach((c) => { out.set(c, o); o += c.length; });
    return out;
  }

  // Averages each block of input samples into one output sample (a simple low-pass + decimate).
  function downsample(input, fromRate, toRate) {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const out = new Float32Array(Math.floor(input.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const a = Math.floor(i * ratio);
      const b = Math.min(input.length, Math.floor((i + 1) * ratio));
      let s = 0;
      for (let j = a; j < b; j++) s += input[j];
      out[i] = b > a ? s / (b - a) : 0;
    }
    return out;
  }

  function encodeWav(samples, rate) {
    const buf = new ArrayBuffer(44 + samples.length * 2);
    const v = new DataView(buf);
    const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    str(0, 'RIFF');
    v.setUint32(4, 36 + samples.length * 2, true);
    str(8, 'WAVE');
    str(12, 'fmt ');
    v.setUint32(16, 16, true);
    v.setUint16(20, 1, true);           // PCM
    v.setUint16(22, 1, true);           // mono
    v.setUint32(24, rate, true);
    v.setUint32(28, rate * 2, true);    // byte rate
    v.setUint16(32, 2, true);           // block align
    v.setUint16(34, 16, true);          // bits per sample
    str(36, 'data');
    v.setUint32(40, samples.length * 2, true);
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return new Blob([buf], { type: 'audio/wav' });
  }

  const api = {
    init, start, stop, supported, onLevel: null,
    get ready() { return !!ctx; },
    get inputRate() { return ctx ? ctx.sampleRate : null; },
    get isRecording() { return recording; }
  };
  window.HA_REC = api;
})();
