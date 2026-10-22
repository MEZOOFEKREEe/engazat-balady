(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };

  var ui = {
    screens: {
      start: $('screen-start'),
      about: $('screen-about'),
      designer: $('screen-designer'),
      quiz: $('screen-quiz'),
      result: $('screen-result')
    },
    quizTitle: $('quiz-title'),
    quizSubtitle: $('quiz-subtitle'),
    siteHeaderTitle: $('site-header-title'),
    loadError: $('load-error'),
    btnStart: $('btn-start'),
    btnNext: $('btn-next'),
    btnRestart: $('btn-restart'),
    btnSound: $('btn-sound'),
    btnAbout: $('btn-about'),
    btnAboutBack: $('btn-about-back'),
    btnDesigner: $('btn-designer'),
    btnDesignerBack: $('btn-designer-back'),
    aboutTitle: $('about-title'),
    aboutYt: $('about-yt'),
    videoNote: $('video-note'),
    designerTitle: $('designer-title'),
    designerText: $('designer-text'),
    counter: $('counter'),
    progress: $('progress'),
    progressBar: $('progress-bar'),
    questionCard: $('question-card'),
    qText: $('q-text'),
    options: $('options'),
    retryNote: $('retry-note'),
    feedback: $('feedback'),
    feedbackText: $('feedback-text'),
    nextLabel: $('next-label'),
    resultText: $('result-text'),
    resultIcon: $('result-icon'),
    scoreCorrect: $('score-correct'),
    scoreWrong: $('score-wrong'),
    credits: $('credits')
  };

  var Sound = (function () {
    var ctx = null, master = null, sfxBus = null, musicBus = null;
    var musicTimer = null, nextTime = 0, step = 0;
    var on = true;

    var BEAT = 1.25;
    var STEPS = 16;
    var CHORDS = [
      [60, 64, 67],
      [57, 60, 64],
      [53, 57, 60],
      [55, 59, 62]
    ];
    var MELODY = { 0: 72, 2: 76, 4: 69, 6: 72, 8: 77, 10: 72, 12: 74, 14: 71 };

    function m2f(m) { return 440 * Math.pow(2, (m - 69) / 12); }

    function init() {
      if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = on ? 1 : 0;
      master.connect(ctx.destination);

      sfxBus = ctx.createGain();
      sfxBus.gain.value = 0.9;
      sfxBus.connect(master);

      musicBus = ctx.createGain();
      musicBus.gain.value = 0.10;
      var soft = ctx.createBiquadFilter();
      soft.type = 'lowpass';
      soft.frequency.value = 1500;
      soft.Q.value = 0.6;
      musicBus.connect(soft);
      soft.connect(master);

      if (ctx.state === 'suspended') ctx.resume();
    }

    function tone(freq, at, dur, opts) {
      if (!ctx) return;
      opts = opts || {};
      var type = opts.type || 'sine';
      var peak = opts.peak || 0.22;
      var attack = opts.attack == null ? 0.012 : opts.attack;
      var bus = opts.bus || sfxBus;
      var t0 = at == null ? ctx.currentTime : at;

      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g);
      g.connect(bus);
      o.start(t0);
      o.stop(t0 + dur + 0.06);
    }

    function bell(freq, at, peak, dur) {
      tone(freq, at, dur, { type: 'sine', peak: peak, attack: 0.006, bus: musicBus });
      tone(freq * 2, at, (dur || 0.5) * 0.5, { type: 'sine', peak: (peak || 0.1) * 0.35, attack: 0.006, bus: musicBus });
    }

    function pad(freq, at, dur) {
      tone(freq, at, dur, { type: 'triangle', peak: 0.15, attack: 0.9, bus: musicBus });
      tone(freq * 2.001, at, dur, { type: 'sine', peak: 0.06, attack: 1.0, bus: musicBus });
    }

    function success() {
      if (!ctx) return;
      var t = ctx.currentTime + 0.01;
      [72, 76, 79].forEach(function (m, i) {
        tone(m2f(m), t + i * 0.085, 0.26, { type: 'triangle', peak: 0.26 });
        tone(m2f(m) * 2, t + i * 0.085, 0.14, { type: 'sine', peak: 0.09 });
      });
      bell(m2f(84), t + 0.28, 0.14, 0.55);
    }

    function wrong() {
      if (!ctx) return;
      var t = ctx.currentTime + 0.01;
      tone(m2f(58), t, 0.2, { type: 'sine', peak: 0.2, attack: 0.02 });
      tone(m2f(53), t + 0.15, 0.26, { type: 'sine', peak: 0.18, attack: 0.02 });
    }

    function finish(perfect) {
      if (!ctx) return;
      var t = ctx.currentTime + 0.02;
      var notes = perfect ? [60, 64, 67, 72, 76, 79, 84] : [60, 64, 67, 72];
      notes.forEach(function (m, i) {
        bell(m2f(m), t + i * 0.1, 0.16, 0.6);
        tone(m2f(m), t + i * 0.1, 0.3, { type: 'triangle', peak: 0.16 });
      });
    }

    function playStep(i, at) {
      if (i % 4 === 0) {
        var chord = CHORDS[(i / 4) | 0];
        for (var k = 0; k < chord.length; k++) pad(m2f(chord[k]), at, BEAT * 3.6);
      }
      if (MELODY[i] != null) bell(m2f(MELODY[i]), at + 0.03, 0.12, 0.5);
    }

    function schedule() {
      if (!ctx) return;
      while (nextTime < ctx.currentTime + 0.5) {
        playStep(step, nextTime);
        nextTime += BEAT;
        step = (step + 1) % STEPS;
      }
    }

    function startMusic() {
      if (!ctx || musicTimer) return;
      nextTime = ctx.currentTime + 0.15;
      step = 0;
      schedule();
      musicTimer = setInterval(schedule, 60);
    }

    function stopMusic() {
      if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    }

    function toggle() {
      on = !on;
      if (master) master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, 0.05);
      try { localStorage.setItem('quiz.sound', on ? '1' : '0'); } catch (e) {}
      return on;
    }

    document.addEventListener('visibilitychange', function () {
      if (!ctx) return;
      if (document.hidden) { stopMusic(); if (ctx.state === 'running') ctx.suspend(); }
      else { if (ctx.state === 'suspended') ctx.resume(); if (on) startMusic(); }
    });

    try { if (localStorage.getItem('quiz.sound') === '0') { on = false; } } catch (e) {}

    return {
      init: init,
      success: success,
      wrong: wrong,
      finish: finish,
      startMusic: startMusic,
      stopMusic: stopMusic,
      toggle: toggle,
      isOn: function () { return on; }
    };
  })();

  var LETTERS = ['أ', 'ب', 'ج', 'د', 'هـ'];
  var State = {
    data: null,
    order: [],
    opts: [],
    i: 0,
    correct: 0,
    wrong: 0,
    solved: false
  };

  function total() { return State.order.length; }
  function current() { return State.data.questions[State.order[State.i]]; }

  function shuffle(arr) {
    var a = arr.slice();
    for (var k = a.length - 1; k > 0; k--) {
      var r = Math.floor(Math.random() * (k + 1));
      var tmp = a[k]; a[k] = a[r]; a[r] = tmp;
    }
    return a;
  }

  function buildOptions(q) {
    var idxs = q.options.map(function (_, i) { return i; });
    return shuffle(idxs).map(function (orig) {
      return { text: q.options[orig], correct: orig + 1 === Number(q.answer) };
    });
  }

  function showScreen(name) {
    if (name !== 'about') stopAboutVideo();
    Object.keys(ui.screens).forEach(function (key) {
      var s = ui.screens[key];
      if (key === name) {
        s.hidden = false;
        s.classList.add('is-active');
      } else {
        s.hidden = true;
        s.classList.remove('is-active');
      }
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function renderMeta() {
    var m = State.data.meta || {};
    ui.quizTitle.textContent = m.title || 'اختبار تفاعلي';
    ui.quizSubtitle.textContent = m.subtitle || '';
    if (ui.siteHeaderTitle) ui.siteHeaderTitle.textContent = m.title || 'اختبار تفاعلي';
    document.title = m.title || 'اختبار تفاعلي';

    ui.credits.innerHTML = '';
    var credits = m.credits || [];
    if (credits.length) {
      ui.credits.hidden = false;
      credits.forEach(function (line) {
        var p = document.createElement('p');
        p.textContent = line;
        ui.credits.appendChild(p);
      });
    } else {
      ui.credits.hidden = true;
    }

    ui.aboutTitle.textContent = m.aboutTitle || 'فيديو';

    ui.designerTitle.textContent = m.designerTitle || 'بيانات المصمم';
    ui.designerText.innerHTML = '';
    var designer = m.designer;
    var dLines = Array.isArray(designer) ? designer : (designer ? [designer] : []);
    if (!dLines.length) dLines = ['اكتب بيانات المصمم هنا من ملف questions.js.'];
    dLines.forEach(function (line) {
      var row = document.createElement('div');
      row.className = 'info-row';

      var parts = String(line).match(/^\s*([^:\uFF1A]+?)\s*[:\uFF1A]\s*(.+?)\s*$/);
      if (parts) {
        var key = document.createElement('span');
        key.className = 'info-key';
        key.textContent = parts[1];
        var val = document.createElement('span');
        val.className = 'info-val';
        val.textContent = parts[2];
        row.appendChild(key);
        row.appendChild(val);
      } else {
        row.className = 'info-row info-row-plain';
        var only = document.createElement('span');
        only.className = 'info-val';
        only.textContent = line;
        row.appendChild(only);
      }
      ui.designerText.appendChild(row);
    });
  }

  function startQuiz() {
    Sound.init();
    Sound.startMusic();
    State.i = 0;
    State.correct = 0;
    State.wrong = 0;
    State.order = shuffle(State.order);
    showScreen('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    var q = current();
    State.solved = false;

    ui.qText.textContent = q.question;
    ui.options.innerHTML = '';
    ui.feedback.hidden = true;
    ui.retryNote.hidden = true;

    State.opts = buildOptions(q);
    State.opts.forEach(function (opt, pos) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'option';
      btn.setAttribute('data-index', String(pos));

      var letter = document.createElement('span');
      letter.className = 'opt-letter';
      letter.textContent = LETTERS[pos] || String(pos + 1);

      var label = document.createElement('span');
      label.className = 'opt-text';
      label.textContent = opt.text;

      btn.appendChild(letter);
      btn.appendChild(label);
      btn.addEventListener('click', onPick);
      ui.options.appendChild(btn);
    });

    var n = State.i + 1;
    ui.counter.textContent = 'السؤال ' + n + ' من ' + total();
    var pct = Math.round((State.i / total()) * 100);
    ui.progressBar.style.width = pct + '%';
    ui.progress.setAttribute('aria-valuenow', String(pct));
    ui.nextLabel.textContent = (State.i === total() - 1) ? 'عرض النتيجة' : 'السؤال التالي';
  }

  function onPick(e) {
    if (State.solved) return;
    var btn = e.currentTarget;
    var idx = parseInt(btn.getAttribute('data-index'), 10);
    var q = current();
    var opt = State.opts[idx];

    if (opt && opt.correct) {
      State.solved = true;
      State.correct++;

      var btns = ui.options.querySelectorAll('.option');
      Array.prototype.forEach.call(btns, function (b) { b.disabled = true; });
      btn.classList.remove('is-wrong', 'is-dim');
      btn.classList.add('is-correct');
      addShine(btn);
      confetti(ui.questionCard);

      ui.retryNote.hidden = true;
      ui.feedbackText.textContent = q.explanation || '';
      ui.feedback.hidden = false;
      ui.nextLabel.textContent = (State.i === total() - 1) ? 'عرض النتيجة' : 'السؤال التالي';

      Sound.success();
      ui.btnNext.focus();
    } else {
      State.wrong++;
      btn.classList.add('is-wrong');
      btn.disabled = true;
      btn.addEventListener('animationend', function () { btn.classList.add('is-dim'); }, { once: true });
      ui.retryNote.hidden = false;
      Sound.wrong();
    }
  }

  function addShine(btn) {
    var s = document.createElement('span');
    s.className = 'shine';
    s.setAttribute('aria-hidden', 'true');
    btn.appendChild(s);
    setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 1700);
  }

  function confetti(btn) {
    var layer = document.createElement('div');
    layer.className = 'fx-layer';
    layer.setAttribute('aria-hidden', 'true');
    var colors = ['#16a34a', '#f59e0b', '#14b8a6', '#6c63ff', '#38bdf8'];

    for (var n = 0; n < 28; n++) {
      var p = document.createElement('i');
      p.style.setProperty('--x', (Math.round(Math.random() * 300) - 150) + 'px');
      p.style.setProperty('--y', (Math.round(Math.random() * 190) - 190) + 'px');
      p.style.setProperty('--r', Math.round(Math.random() * 540 - 270) + 'deg');
      p.style.setProperty('--d', Math.round(Math.random() * 140) + 'ms');
      p.style.background = colors[n % colors.length];
      if (n % 3 === 0) { p.style.borderRadius = '50%'; p.style.width = '7px'; p.style.height = '7px'; }
      layer.appendChild(p);
    }
    btn.appendChild(layer);
    setTimeout(function () { if (layer.parentNode) layer.parentNode.removeChild(layer); }, 1500);
  }

  function nextQuestion() {
    if (!State.solved) return;
    if (State.i < total() - 1) {
      State.i++;
      renderQuestion();
    } else {
      showResult();
    }
  }

  function showResult() {
    var m = State.data.meta || {};
    var perfect = State.wrong === 0;

    ui.scoreCorrect.textContent = String(State.correct);
    ui.scoreWrong.textContent = String(State.wrong);
    ui.resultText.textContent = m.resultText || (perfect ? 'ممتاز، أجبت عن كل الأسئلة من أول مرة' : 'أحسنت، راجع الأخطاء لترفع مستواك');
    ui.resultIcon.classList.add('result-pop');

    showScreen('result');
    Sound.finish(perfect);
    confetti(ui.resultIcon);
    ui.btnRestart.focus();
  }

  function validate(data) {
    if (!data || typeof data !== 'object') throw new Error('الملف لا يحتوي على بيانات صحيحة.');
    if (!Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error('لا توجد أسئلة — تأكد من وضعها داخل questions');
    }
    data.questions.forEach(function (q, idx) {
      var n = idx + 1;
      if (!q || typeof q.question !== 'string' || !q.question.trim()) {
        throw new Error('السؤال رقم ' + n + ' بدون نص.');
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        throw new Error('السؤال رقم ' + n + ' يحتاج اختيارين على الأقل.');
      }
      var a = Number(q.answer);
      if (!(a >= 1 && a <= q.options.length)) {
        throw new Error('رقم الإجابة الصحيحة في السؤال ' + n + ' يجب أن يكون بين 1 و ' + q.options.length + '.');
      }
    });
  }

  function fail(msg) {
    ui.btnStart.disabled = true;
    ui.btnStart.style.opacity = '.6';
    ui.loadError.hidden = false;
    ui.loadError.textContent = msg;
  }

  function load() {
    var data = window.QUESTIONS;
    try {
      validate(data);
    } catch (err) {
      fail(err.message + ' — تأكد من وجود ملف questions.js بجانب index.html');
      return;
    }
    State.data = data;
    State.order = data.questions.map(function (_, i) { return i; });
    renderMeta();
    ui.btnStart.disabled = false;
  }

  ui.btnStart.addEventListener('click', function () {
    if (!State.data) return;
    startQuiz();
  });
  ui.btnNext.addEventListener('click', nextQuestion);
  ui.btnRestart.addEventListener('click', function () {
    ui.resultIcon.classList.remove('result-pop');
    startQuiz();
  });
  ui.btnSound.addEventListener('click', function () {
    Sound.init();
    var on = Sound.toggle();
    ui.btnSound.setAttribute('aria-pressed', on ? 'false' : 'true');
    ui.btnSound.setAttribute('aria-label', on ? 'إيقاف الصوت' : 'تشغيل الصوت');
    if (on) Sound.startMusic();
  });

  function playAboutVideo() {
    var iframe = ui.aboutYt;
    if (!iframe) return;
    var id = iframe.getAttribute('data-video-id') || '';
    if (!id) return;
    var src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3';
    if (iframe.src !== src) {
      iframe.src = src;
    }
    ui.videoNote.hidden = true;
    var triedFallback = false;
    iframe.onerror = function () {
      if (triedFallback) return;
      triedFallback = true;
      iframe.src = 'https://www.youtube.com/embed/' + encodeURIComponent(id) + '?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3';
    };
  }

  function stopAboutVideo() {
    var iframe = ui.aboutYt;
    if (!iframe) return;
    iframe.src = 'about:blank';
  }

  ui.btnAbout.addEventListener('click', function () {
    Sound.stopMusic();
    showScreen('about');
    playAboutVideo();
    ui.btnAboutBack.focus();
  });
  ui.btnAboutBack.addEventListener('click', function () {
    stopAboutVideo();
    showScreen('start');
    ui.btnAbout.focus();
  });

  ui.btnDesigner.addEventListener('click', function () {
    Sound.stopMusic();
    showScreen('designer');
    ui.btnDesignerBack.focus();
  });
  ui.btnDesignerBack.addEventListener('click', function () {
    showScreen('start');
    ui.btnDesigner.focus();
  });

  document.addEventListener('keydown', function (e) {
    if (ui.screens.quiz.hidden) return;
    if (e.key === '1' || e.key === '2') {
      var b = ui.options.querySelector('.option[data-index="' + (Number(e.key) - 1) + '"]');
      if (b && !b.disabled) b.click();
    } else if (e.key === 'Enter' && State.solved) {
      nextQuestion();
    }
  });

  load();
})();