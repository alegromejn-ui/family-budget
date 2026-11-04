/* Інтерактивний шар поверх ui.js. Нічого не змінює в даних і в логіці: лише дивиться на готову розмітку
   й додає анімації та жести. Якщо цей файл не завантажиться, додаток працює як раніше. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var app = $('#app'), tabs = $('#tabs'), sheetRoot = $('#sheet-root');
  if (!app || !tabs) return;
  var EASE = 'cubic-bezier(.22,.8,.2,1)';
  var nf = {};
  function fmt(v, dec) { var k = dec; nf[k] = nf[k] || new Intl.NumberFormat('uk-UA', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return nf[k].format(v); }
  function buzz(ms) { if (reduce) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { /* не підтримується */ } }
  function anim(el, frames, opts) { if (reduce || !el.animate) return null; try { return el.animate(frames, opts); } catch (e) { return null; } }

  /* ---------- Приховування сум ---------- */
  var HIDE_KEY = 'fb_fx_hide';
  function hidden() { try { return localStorage.getItem(HIDE_KEY) === '1'; } catch (e) { return false; } }
  function applyHide() { document.body.classList.toggle('fx-hide', hidden()); $$('.fx-eye').forEach(eyeState); }
  function eyeState(b) { var h = hidden(); b.setAttribute('aria-pressed', String(h)); b.setAttribute('aria-label', h ? 'Показати суми' : 'Приховати суми'); }
  var EYE = '<svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>' +
    '<svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.6 6.6C3.7 8.4 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';

  /* ---------- Числа, що «набігають», і смужки, що заповнюються ----------
     Після зміни даних додаток малює екран двічі поспіль (одразу й у наступному кадрі). Щоб друге малювання
     не обривало рух, кожну анімацію веде власний «годинник» tl: нова розмітка підхоплює з поточного значення. */
  var prevNum = {}, prevW = {}, tl = {}, tok = {};
  function easeOut(k) { return 1 - Math.pow(1 - k, 4); }
  function ongoing(key, now) { var a = tl[key]; return a && now < a.t0 + a.delay + a.dur ? a : null; }
  function shownValue(a, now) { var k = (now - a.t0 - a.delay) / a.dur; return k <= 0 ? a.from : k >= 1 ? a.to : a.from + (a.to - a.from) * easeOut(k); }
  function splitMoney(txt) {
    var m = txt.match(/^([^\d]*)([\d\s\u00a0\u202f]+(?:,\d+)?)(.*)$/);
    if (!m) return null;
    var digits = m[2].replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
    var dec = (m[2].split(',')[1] || '').length;
    return { pre: m[1], num: parseFloat(digits), dec: dec, suf: m[3].trim(), shown: m[2].trim() };
  }
  function countUp(el, key, first) {
    var p = splitMoney(el.textContent); if (!p || !isFinite(p.num)) return;
    var isHero = el.classList.contains('amt'), now = performance.now();
    var sig = (p.pre.indexOf('-') >= 0 || p.pre.indexOf('\u2212') >= 0 ? -1 : 1) * p.num;
    var run = ongoing(key, now); var before = run ? shownValue(run, now) : prevNum[key]; prevNum[key] = sig;
    if (isHero) { // знак валюти робимо меншим
      el.innerHTML = '';
      var n = document.createElement('span'); n.className = 'fx-n'; n.textContent = p.pre + p.shown; el.appendChild(n);
      if (p.suf) { var c = document.createElement('span'); c.className = 'cur-sym'; c.textContent = p.suf; el.appendChild(c); }
      el = n;
    } else if (p.suf) { el.textContent = p.pre + p.shown + ' ' + p.suf; }
    var from = null;
    if (before == null) { if (first) from = 0; } else if (Math.abs(before - sig) > 1e-9) from = before;
    var my = (tok[key] = (tok[key] || 0) + 1);
    if (from == null || reduce) { delete tl[key]; return; }
    var dur = before == null ? 1100 : 700;
    if (run && run.to === sig) dur = Math.max(200, run.t0 + run.delay + run.dur - now); // той самий кінець: просто дорухатися
    tl[key] = { from: from, to: sig, t0: now, dur: dur, delay: 0 };
    var finalText = el.textContent, tail = isHero ? '' : (p.suf ? ' ' + p.suf : '');
    var live = el.closest('[aria-live]'); var liveVal = live && live.getAttribute('aria-live'); if (live) live.setAttribute('aria-live', 'off');
    function step(t) {
      if (tok[key] !== my || !el.isConnected) return;
      var k = Math.min(1, (t - now) / dur); var v = from + (sig - from) * easeOut(k);
      el.textContent = k < 1 ? p.pre + fmt(Math.abs(v), p.dec) + tail : finalText;
      if (k < 1) requestAnimationFrame(step); else if (live && liveVal) live.setAttribute('aria-live', liveVal);
    }
    requestAnimationFrame(step);
  }

  function fillBars(entering, first) {
    var now = performance.now();
    ['.hero-meter i', '.meter i', '.hbar .track i'].forEach(function (sel, gi) {
      $$(sel, app).forEach(function (el, i) {
        var w = parseFloat(el.style.width); if (!isFinite(w)) return;
        var key = currentView + ':' + gi + ':' + i; var run = ongoing(key, now);
        var was = run ? shownValue(run, now) : prevW[key]; prevW[key] = w;
        var from = null; if (was == null) { if (entering || first) from = 0; } else if (Math.abs(was - w) > .01) from = was;
        if (from == null) { delete tl[key]; return; }
        var delay = run ? 0 : Math.min(i, 8) * 45, dur = run && run.to === w ? Math.max(200, run.t0 + run.delay + run.dur - now) : 850;
        tl[key] = { from: from, to: w, t0: now, dur: dur, delay: delay };
        anim(el, [{ width: from + '%' }, { width: w + '%' }], { duration: dur, delay: delay, easing: EASE, fill: 'backwards' });
      });
    });
  }

  /* ---------- Поява сторінки (однократна: offset підхоплює її, якщо екран перемалювали посеред руху) ---------- */
  var slideDir = 0, slideTimer = null;
  function play(el, frames, opts, offset) { var a = anim(el, frames, opts); if (a && offset) { try { a.currentTime = offset; } catch (e) { /* не критично */ } } }
  function growBars(offset) {
    $$('.strip svg rect:not(.hit), .cols svg rect.col', app).forEach(function (r, i) {
      r.style.transformBox = 'fill-box'; r.style.transformOrigin = '50% 100%';
      play(r, [{ transform: 'scaleY(0)', opacity: .2 }, { transform: 'scaleY(1)', opacity: 1 }], { duration: 650, delay: 120 + Math.min(i, 31) * 16, easing: 'cubic-bezier(.34,1.3,.64,1)', fill: 'backwards' }, offset);
    });
  }
  function reveal(offset) {
    var kids = Array.prototype.slice.call(app.children).filter(function (c) { return !c.classList.contains('top'); });
    if (slideDir) {
      kids.forEach(function (c) { anim(c, [{ transform: 'translateX(' + slideDir * 34 + 'px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 380, easing: EASE, fill: 'backwards' }); });
      slideDir = 0; clearTimeout(slideTimer); return false;
    }
    kids.forEach(function (c, i) {
      var hero = c.classList.contains('hero-card');
      play(c, [{ transform: hero ? 'translateY(14px) scale(.965)' : 'translateY(12px)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: hero ? 650 : 420, delay: Math.min(i, 6) * 55, easing: EASE, fill: 'backwards' }, offset);
    });
    return true;
  }

  /* ---------- Головна картка: приховати, нахил, стрічка днів ---------- */
  function heroTools() {
    var card = $('.hero-card', app); if (!card) return;
    if (!$('.fx-eye', card)) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'fx-eye'; b.innerHTML = EYE; eyeState(b); card.appendChild(b);
    }
    card.addEventListener('pointerleave', function () { resetTilt(card); });
    var st = $('.strip', card); if (st) bindStrip(st);
  }
  function resetTilt(card) { card.classList.remove('touch'); card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); card.style.setProperty('--mx', '78%'); card.style.setProperty('--my', '8%'); }
  document.addEventListener('pointermove', function (e) {
    if (reduce) return;
    var card = e.target.closest && e.target.closest('.hero-card'); if (!card) return;
    var r = card.getBoundingClientRect(); var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    card.classList.toggle('touch', e.pointerType !== 'mouse');
    card.style.setProperty('--mx', (px * 100).toFixed(1) + '%'); card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    card.style.setProperty('--ry', ((px - .5) * 7).toFixed(2) + 'deg'); card.style.setProperty('--rx', (-(py - .5) * 5).toFixed(2) + 'deg');
  }, { passive: true });
  ['pointerup', 'pointercancel'].forEach(function (n) { document.addEventListener(n, function () { $$('.hero-card').forEach(resetTilt); }); });

  function bindStrip(st) {
    var svg = $('svg', st); if (!svg) return;
    var hits = $$('rect.hit', svg), bars = $$('rect:not(.hit)', svg), n = hits.length; if (!n) return;
    var tip = document.createElement('div'); tip.className = 'fx-tip'; tip.setAttribute('aria-hidden', 'true'); st.appendChild(tip);
    var last = -1, down = false, hideT = null;
    function pick(e) {
      var r = svg.getBoundingClientRect(); var i = Math.max(0, Math.min(n - 1, Math.floor((e.clientX - r.left) / r.width * n)));
      if (i === last) return; last = i; buzz(4);
      hits[i].dispatchEvent(new MouseEvent('click', { bubbles: true })); // ui.js сам оновить підпис під стрічкою
      bars.forEach(function (b) { b.classList.remove('pick'); }); bars[i].classList.add('pick');
      var read = $('#strip-read'); var txt = read ? read.textContent : ''; var amt = txt.indexOf(': ') > 0 ? txt.slice(txt.indexOf(': ') + 2) : '';
      tip.textContent = amt === 'витрат немає' ? 'без витрат' : amt;
      var s = st.getBoundingClientRect(); tip.style.left = Math.max(44, Math.min(s.width - 44, r.left - s.left + (i + .5) / n * r.width)) + 'px';
      tip.classList.add('on'); clearTimeout(hideT); hideT = setTimeout(function () { tip.classList.remove('on'); }, 2200);
    }
    svg.addEventListener('pointerdown', function (e) { down = true; last = -1; try { svg.setPointerCapture(e.pointerId); } catch (x) { /* не критично */ } pick(e); });
    svg.addEventListener('pointermove', function (e) { if (down || e.pointerType === 'mouse') pick(e); });
    ['pointerup', 'pointercancel'].forEach(function (nm) { svg.addEventListener(nm, function () { down = false; }); });
    svg.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { tip.classList.remove('on'); } });
  }

  document.addEventListener('click', function (e) {
    var eye = e.target.closest && e.target.closest('.fx-eye'); if (!eye) return;
    try { localStorage.setItem(HIDE_KEY, hidden() ? '0' : '1'); } catch (x) { /* пам’ять недоступна */ }
    buzz(10); applyHide();
  });

  /* ---------- Нижня панель: рухомий індикатор ---------- */
  var ind = document.createElement('i'); ind.className = 'fx-ind snap'; $('.in-row', tabs).appendChild(ind);
  var indPlaced = false;
  function placeInd() {
    var a = $('.tab[aria-current="page"]', tabs); var row = $('.in-row', tabs);
    if (!a || !row) { ind.classList.remove('ready'); return; }
    var icon = $('.ic', a); var r = icon.getBoundingClientRect(), rr = row.getBoundingClientRect();
    if (!r.width) return;
    var x = r.left + r.width / 2 - rr.left - 26, y = r.top + r.height / 2 - rr.top - 14;
    ind.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    if (!indPlaced) { indPlaced = true; requestAnimationFrame(function () { ind.classList.add('ready'); requestAnimationFrame(function () { ind.classList.remove('snap'); }); }); }
  }
  new MutationObserver(placeInd).observe(tabs, { attributes: true, subtree: true, attributeFilter: ['aria-current'] });
  window.addEventListener('resize', function () { ind.classList.add('snap'); placeInd(); requestAnimationFrame(function () { ind.classList.remove('snap'); }); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { ind.classList.add('snap'); placeInd(); requestAnimationFrame(function () { ind.classList.remove('snap'); }); });

  /* ---------- Один головний цикл після кожного малювання ---------- */
  var currentView = null, first = true, popText = null, enterAt = null;
  function viewNow() { var a = $('.tab[aria-current="page"]', tabs); return a ? a.getAttribute('data-tab') : 'home'; }
  function enhance() {
    var now = performance.now(), v = viewNow(); var entering = v !== currentView; currentView = v;
    if (entering) enterAt = now;
    var offset = !entering && enterAt != null && now - enterAt < 1400 ? now - enterAt : 0; // екран перемалювали посеред появи
    $$('.hero-line .amt', app).forEach(function (el) { countUp(el, v + ':hero', first); });
    $$('.kpi.big > b', app).forEach(function (el, i) { countUp(el, v + ':kpi' + i, first); });
    heroTools(); fillBars(entering, first);
    if (entering || offset || slideDir) { if (reveal(offset)) growBars(offset); }
    if (popText != null) {
      var it = $$('.buy-item', app).filter(function (x) { return x.textContent.trim() === popText; })[0];
      if (it && it.classList.contains('done')) { var bx = $('.buy-box', it); if (bx) bx.classList.add('fx-pop'); }
      popText = null;
    }
    placeInd(); applyHide(); first = false;
  }
  new MutationObserver(function () { enhance(); }).observe(app, { childList: true });
  document.addEventListener('click', function (e) { var it = e.target.closest && e.target.closest('.buy-item'); if (it) popText = it.textContent.trim(); }, true);

  /* ---------- Жести: гортання місяців ---------- */
  var sw = null; // дотики (touch), а не pointer: pointer-події браузер скасовує, щойно сторінка починає гортатися
  app.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1 || !$('.month-nav', app)) { sw = null; return; }
    if (e.target.closest('.chips, .quick, .strip, .cols, input, textarea, select, .seg, button.chip')) { sw = null; return; }
    sw = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
  }, { passive: true });
  app.addEventListener('touchend', function (e) {
    if (!sw || !e.changedTouches.length) return;
    var dx = e.changedTouches[0].clientX - sw.x, dy = e.changedTouches[0].clientY - sw.y, dt = Date.now() - sw.t; sw = null;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8 || dt > 650) return;
    var btn = $('.month-nav .arrow[data-d="' + (dx < 0 ? '1' : '-1') + '"]', app);
    if (!btn || btn.disabled) { buzz(12); return; }
    slideDir = dx < 0 ? 1 : -1; clearTimeout(slideTimer); slideTimer = setTimeout(function () { slideDir = 0; }, 700);
    buzz(8); btn.click();
  }, { passive: true });
  app.addEventListener('touchcancel', function () { sw = null; }, { passive: true });

  /* ---------- Аркуші: ручка й закриття свайпом вниз ---------- */
  function prepSheet(still) {
    var back = $('.back', sheetRoot); if (!back) return;
    if (still) back.classList.add('fx-still');
    var sh = $('.sheet', back); if (sh && !$('.fx-grab', sh) && $('.x', sh)) { var g = document.createElement('div'); g.className = 'fx-grab'; g.setAttribute('aria-hidden', 'true'); sh.insertBefore(g, sh.firstChild); }
  }
  new MutationObserver(function (list) {
    var replaced = list.some(function (m) { return m.removedNodes.length && m.addedNodes.length; });
    prepSheet(replaced);
  }).observe(sheetRoot, { childList: true });

  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    var h = e.target.closest && e.target.closest('.fx-grab, .sheet-top'); if (!h || (e.target.closest('button'))) return;
    var sh = h.closest('.sheet'); if (!sh) return;
    drag = { sh: sh, back: sh.parentNode, y0: e.clientY, t0: performance.now(), dy: 0, id: e.pointerId, h: h };
    try { h.setPointerCapture(e.pointerId); } catch (x) { /* не критично */ }
    sh.classList.remove('settle'); sh.classList.add('dragging');
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = e.clientY - drag.y0; dy = dy > 0 ? dy : dy / 6; drag.dy = dy;
    drag.sh.style.transform = 'translateY(' + dy.toFixed(1) + 'px)';
    drag.back.style.backgroundColor = 'rgba(5,12,10,' + (.42 * (1 - Math.min(1, Math.max(0, dy) / 420))).toFixed(3) + ')';
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag; drag = null; var v = d.dy / Math.max(1, performance.now() - d.t0);
    d.sh.classList.remove('dragging'); d.sh.classList.add('settle');
    function springBack() { d.sh.style.transform = ''; d.back.style.backgroundColor = ''; setTimeout(function () { d.sh.classList.remove('settle'); }, 450); }
    if (e.type === 'pointerup' && (d.dy > 120 || (v > .6 && d.dy > 40))) {
      d.sh.style.transform = 'translateY(110%)'; d.back.style.backgroundColor = 'rgba(5,12,10,0)'; buzz(8);
      setTimeout(function () { d.back.dispatchEvent(new MouseEvent('click', { bubbles: true })); setTimeout(function () { if (document.body.contains(d.back)) springBack(); }, 40); }, 230);
    } else springBack();
  }
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);

  /* ---------- Дрібниці: вібрація, шапка, замок ---------- */
  document.addEventListener('pointerdown', function (e) {
    if (e.target.closest && e.target.closest('.tab, .fab, .chip, .catgrid label, .seg button, .buy-item, .keypad button')) buzz(6);
  }, true);
  var scrolled = false;
  window.addEventListener('scroll', function () { var s = window.scrollY > 10; if (s !== scrolled) { scrolled = s; document.body.classList.toggle('fx-scrolled', s); } }, { passive: true });

  function watchLock(lock) {
    new MutationObserver(function () {
      var bad = $('.note.bad', lock); if (bad && /Невірний/.test(bad.textContent)) { var d = $('.dots', lock); if (d) { d.classList.add('fx-shake'); buzz([30, 40, 30]); } }
    }).observe(lock, { childList: true });
  }
  new MutationObserver(function (list) {
    list.forEach(function (m) { Array.prototype.forEach.call(m.addedNodes, function (n) { if (n.id === 'lock') watchLock(n); }); });
  }).observe(document.body, { childList: true });
  var lk = $('#lock'); if (lk) watchLock(lk);

  applyHide(); enhance();
})();
