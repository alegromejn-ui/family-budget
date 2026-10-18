/* Сімейний бюджет: інтерфейс. Уся логіка даних живе в core.js. */
(function () {
  'use strict';
  var F = FB.init();
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function ic(name, cls) { return '<svg class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>'; }
  function attr(el, n) { return el.getAttribute('data-' + n); }

  // ---------- Формати ----------
  var nf0 = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat('uk-UA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function cur() { return F.state.cfg.currency; }
  function money(n, noCur) {
    var v = F.round2(n); var s = (Number.isInteger(v) ? nf0 : nf2).format(v);
    return noCur ? s : s + ' ' + cur();
  }
  function short(n) {
    if (Math.abs(n) >= 1000) { var k = Math.round(n / 100) / 10; return String(k).replace('.', ',') + 'к'; }
    return String(Math.round(n));
  }
  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }
  function monthName(ym) { var d = F.dateFromStr(ym + '-01'); return new Intl.DateTimeFormat('uk-UA', { month: 'long' }).format(d); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function dayLabel(date) {
    var today = F.todayStr(); var y = new Date(F.dateFromStr(today).getTime() - 86400000); var yest = F.ymd(y);
    var d = F.dateFromStr(date);
    var dm = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(d);
    if (date === today) return 'Сьогодні, ' + dm;
    if (date === yest) return 'Вчора, ' + dm;
    return cap(new Intl.DateTimeFormat('uk-UA', { weekday: 'long' }).format(d)) + ', ' + dm;
  }
  function dayMonthShort(date) { return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(F.dateFromStr(date)); }
  function dotCls(c) { return c.colorIdx >= 0 ? ' c' + c.colorIdx : c.colorIdx === -4 ? ' card' : c.colorIdx === -2 ? ' inc' : c.colorIdx === -3 ? ' sav' : ''; }
  function catDot(c) { return '<i class="dot' + dotCls(c) + '" aria-hidden="true"></i>'; }
  function whole(n) { return money(Math.floor(n + 1e-9)); }
  function wholeUp(n) { return money(Math.ceil(n - 1e-9)); }
  function monthGen(m) { return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long' }).format(F.dateFromStr(m + '-01')).replace(/^\d+\s*/, '') + ' ' + m.slice(0, 4); }
  function monthYear(m) { return monthName(m) + ' ' + m.slice(0, 4); }
  function signedMoney(n) { return (n > 0 ? '+' : '') + money(n); }
  function daysText(n) { return n + ' ' + plural(n, 'день', 'дні', 'днів'); }

  // ---------- Стан інтерфейсу ----------
  var view = 'home';
  var curYm = F.todayStr().slice(0, 7);
  var ym = curYm;
  var catFilter = 'all';
  var repMode = 'chart';

  // ---------- Верх сторінки та статус синхронізації ----------
  function pill() {
    var st = F.sync; var dirty = F.dirtyCount();
    if (!F.isConnected()) return '<button class="pill" data-act="open-connect">' + ic('users', 'sm') + '<span>Тільки на цьому телефоні</span></button>';
    if (st.status === 'syncing') return '<span class="pill">' + ic('sync', 'sm') + '<span>Синхронізація…</span></span>';
    if (st.status === 'error') return '<button class="pill bad" data-act="tab" data-tab="more">' + ic('alert', 'sm') + '<span>Помилка синхронізації</span></button>';
    if (st.status === 'offline') return '<button class="pill bad" data-act="sync">' + ic('cloud-off', 'sm') + '<span>Не надіслано: ' + dirty + '</span></button>';
    if (dirty > 0) return '<span class="pill">' + ic('sync', 'sm') + '<span>Надсилання: ' + dirty + '</span></span>';
    return '<span class="pill">' + ic('check', 'sm') + '<span>Синхронізовано</span></span>';
  }
  function top(title) { return '<header class="top"><h1>' + esc(title) + '</h1>' + pill() + '</header>'; }

  // ---------- Огляд ----------
  function liveCount() { return Object.keys(F.state.txs).filter(function (k) { return !F.state.txs[k].deleted; }).length; }
  function hero(o) {
    if (!liveCount()) {
      return '<p class="hero-line">Запишіть першу витрату</p><p class="hero-sub">Сума, категорія, готово. Чек можна сфотографувати, і сума підставиться сама.</p><button class="btn-text" data-act="add">' + ic('plus', 'sm') + 'Додати витрату</button>';
    }
    if (o.budget) {
      if (o.over) {
        return '<p class="hero-line bad">' + ic('alert') + 'Бюджет місяця перевищено на <span class="amt">' + money(-o.remaining) + '</span></p><p class="hero-sub">Витрачено ' + money(o.spent) + ' із ' + money(o.budget) + '. До кінця місяця ' + daysText(o.daysLeft) + '.</p>';
      }
      if (o.leftToday < 0) {
        return '<p class="hero-line bad">' + ic('alert') + 'Денну норму перевищено на <span class="amt">' + wholeUp(-o.leftToday) + '</span></p><p class="hero-sub">Сьогодні витрачено ' + money(o.spentToday) + ' при нормі ' + whole(o.allowToday) + '. Залишок на місяць ' + money(o.remaining) + '.</p>';
      }
      return '<p class="hero-line">Сьогодні ще можна витратити <span class="amt">' + whole(o.leftToday) + '</span></p><p class="hero-sub">Денна норма ' + whole(o.allowToday) + '. До кінця місяця ' + daysText(o.daysLeft) + ', залишок бюджету ' + money(o.remaining) + '.</p>';
    }
    var cmp = o.prevSame > 0 ? 'Минулого місяця на цей день було ' + money(o.prevSame) + '.' : 'Задайте місячний бюджет, і тут з’явиться денна норма.';
    return '<p class="hero-line">За ' + esc(monthName(o.ym)) + ' витрачено <span class="amt">' + money(o.spent) + '</span></p><p class="hero-sub">' + cmp + '</p><button class="btn-text" data-act="budget">' + ic('sliders', 'sm') + 'Задати бюджет</button>';
  }

  function stripHtml() {
    var arr = F.dailySeries(curYm); var n = arr.length; var max = Math.max.apply(null, arr.concat([1]));
    var today = Number(F.todayStr().slice(8, 10)); var out = '';
    for (var i = 0; i < n; i++) {
      var v = arr[i]; var h = v > 0 ? Math.max(5, v / max * 44) : 3; var cls = (i + 1 === today) ? 'today' : v > 0 ? 'bar' : 'zero';
      out += '<rect class="' + cls + '" x="' + (i * 10 + 1) + '" y="' + (50 - h) + '" width="8" height="' + h + '" rx="2.5"/>';
      out += '<rect class="hit" data-act="strip" data-d="' + (i + 1) + '" x="' + (i * 10) + '" y="0" width="10" height="56"/>';
    }
    return '<div class="strip"><svg viewBox="0 0 ' + (n * 10) + ' 56" preserveAspectRatio="none" role="img" aria-label="Витрати за днями поточного місяця">' + out + '</svg><p class="read" id="strip-read" aria-live="polite">Витрати за днями. Торкніться стовпчика.</p></div>';
  }

  function budgetRows(o) {
    var spent = F.spentByCategory(curYm);
    var rows = F.categories().filter(function (c) { return spent[c.id] > 0 || c.limit; }).sort(function (a, b) { return (spent[b.id] || 0) - (spent[a.id] || 0); });
    if (!rows.length) return '<p class="hint">Тут з’являться категорії, щойно буде перша витрата.</p>';
    return '<ul class="ledger">' + rows.map(function (c) {
      var s = spent[c.id] || 0; var lim = c.limit;
      var val = '<span class="val num">' + money(s, !!lim) + (lim ? ' <small>із ' + money(lim) + '</small>' : '') + '</span>';
      var extra = '';
      if (lim) {
        var over = s > lim; var pct = Math.min(100, Math.round(s / lim * 100));
        extra = '<span class="meter' + (over ? ' over' : '') + '" role="img" aria-label="Витрачено ' + pct + '% ліміту"><i style="width:' + pct + '%"></i></span>' +
          (over ? '<span class="status bad">' + ic('alert', 'sm') + 'Перевищено на ' + money(s - lim) + '</span>' : '<span class="status">Лишилось ' + money(lim - s) + '</span>');
      }
      return '<li><button class="catlink" data-act="open-cat" data-c="' + esc(c.id) + '"><span class="lrow"><span class="name">' + catDot(c) + '<b>' + esc(c.name) + '</b></span><span class="lead"></span>' + val + ic('right', 'sm chev') + '</span>' + extra + '</button></li>';
    }).join('') + '</ul>';
  }

  function txRowHtml(t) {
    var c = F.catInfo(t); var sb = F.subOf(t); var cname = c.name + (sb ? ' · ' + sb.name : ''); var title = t.note || cname;
    var sub = (t.note ? cname + ', ' : '') + (t.member || '');
    var amt = c.kind === 'income' ? signedMoney(t.amount) : c.kind === 'saving' ? (t.amount < 0 ? 'зняття ' + money(-t.amount) : signedMoney(t.amount)) : c.kind === 'card' ? (t.amount < 0 ? 'погасили ' + money(-t.amount) : 'взяли ' + money(t.amount)) : money(t.amount);
    return '<button class="txrow" data-act="edit" data-id="' + esc(t.id) + '">' + catDot(c) + '<span class="main"><b>' + esc(title) + '</b><span>' + esc(sub) + '</span></span><span class="amt num">' + esc(amt) + '</span></button>';
  }

  // ---------- Нові блоки головного екрана ----------
  function flowSection() {
    var f = F.monthFlow(curYm); if (!(f.income > 0 || f.saved !== 0)) return '';
    var src = F.incomeBySource(curYm);
    var incomeParts = src.length > 1 ? src.map(function (x) { return '<li class="subli"><span class="lrow sub"><span class="name">' + esc(x.name) + (x.count > 1 ? ' · ' + x.count + ' надходж.' : '') + '</span><span class="lead"></span><span class="val num">' + signedMoney(x.total) + '</span></span></li>'; }).join('') : '';
    var row = function (name, val, cls) { return '<li><span class="lrow"><span class="name"><b>' + name + '</b></span><span class="lead"></span><span class="val num' + (cls || '') + '">' + val + '</span></span></li>'; };
    return '<section class="sec"><div class="sec-h"><h2>Баланс місяця</h2><button class="btn-text" data-act="list-kind" data-k="income">Доходи</button></div><div class="panel"><ul class="ledger">' +
      row('Доходи', signedMoney(f.income)) + incomeParts + row('Витрати', money(f.spent)) + (f.saved !== 0 ? row('Відкладено', money(f.saved)) : '') +
      '<li><span class="lrow"><span class="name"><b>Залишок</b></span><span class="lead"></span><span class="val num' + (f.balance < 0 ? ' badtxt' : '') + '">' + money(f.balance) + '</span></span>' + (f.balance < 0 ? '<span class="status bad">' + ic('alert', 'sm') + 'Витрати та накопичення перевищили доходи</span>' : '') + '</li></ul></div></section>';
  }
  function limitsSection() {
    var lim = F.state.cfg.memberLimits; var names = Object.keys(lim); if (!names.length) return '';
    var spent = {}; F.byMember(curYm).forEach(function (m) { spent[m.name] = m.total; });
    return '<section class="sec"><div class="sec-h"><h2>Ліміти на людину</h2><button class="btn-text" data-act="budget">Змінити</button></div><div class="panel"><ul class="ledger">' + names.map(function (n) {
      var s = spent[n] || 0; var l = lim[n]; var over = s > l; var pct = Math.min(100, Math.round(s / l * 100));
      return '<li><span class="lrow"><span class="name"><b>' + esc(n) + '</b></span><span class="lead"></span><span class="val num">' + money(s, true) + ' <small>із ' + money(l) + '</small></span></span><span class="meter' + (over ? ' over' : '') + '" role="img" aria-label="Витрачено ' + pct + '% ліміту"><i style="width:' + pct + '%"></i></span>' + (over ? '<span class="status bad">' + ic('alert', 'sm') + 'Перевищено на ' + money(s - l) + '</span>' : '<span class="status">Лишилось ' + money(l - s) + '</span>') + '</li>';
    }).join('') + '</ul></div></section>';
  }
  function goalStatus(i) {
    if (i.done) return '<span class="status">' + ic('check', 'sm') + 'Ціль досягнуто</span>';
    if (i.overdue) return '<span class="status bad">' + ic('alert', 'sm') + 'Термін минув, не вистачає ' + money(i.left) + '</span>';
    if (i.perMonth != null) return '<span class="status">Відкладайте по ' + wholeUp(i.perMonth) + ' на місяць до ' + esc(monthGen(i.deadline)) + '</span>';
    return '<span class="status">Лишилось ' + money(i.left) + '</span>';
  }
  function goalRows(max) {
    var today = F.todayStr();
    return '<ul class="ledger">' + F.state.cfg.goals.slice(0, max || 99).map(function (g) {
      var i = F.goalInfo(g, today);
      return '<li><button class="catlink" data-act="goals"><span class="lrow"><span class="name"><i class="dot sav" aria-hidden="true"></i><b>' + esc(g.name) + '</b></span><span class="lead"></span><span class="val num">' + money(i.saved, true) + ' <small>із ' + money(g.target) + '</small></span>' + ic('right', 'sm chev') + '</span><span class="meter" role="img" aria-label="Зібрано ' + i.pct + '%"><i style="width:' + i.pct + '%"></i></span>' + goalStatus(i) + '</button></li>';
    }).join('') + '</ul>';
  }
  function goalsSection() {
    if (!F.state.cfg.goals.length) return '';
    return '<section class="sec"><div class="sec-h"><h2>Цілі накопичень</h2><button class="btn-text" data-act="goals">Керувати</button></div><div class="panel">' + goalRows(3) + '</div></section>';
  }
  function loanStatus(i) {
    if (i.balanceNow <= 0) return '<span class="status">' + ic('check', 'sm') + 'Виплачено</span>';
    if (i.noPlan) return '<span class="status">Додайте щомісячний платіж, щоб побачити дату закінчення</span>';
    if (i.never) return '<span class="status bad">' + ic('alert', 'sm') + 'Платіж не покриває відсотки: борг не зменшується</span>';
    return '<span class="status">Остання виплата: ' + esc(monthYear(i.payoffYm)) + ', ще ' + i.monthsLeft + ' ' + plural(i.monthsLeft, 'платіж', 'платежі', 'платежів') + (i.interestLeft > 0 ? ', відсотки близько ' + money(Math.round(i.interestLeft)) : '') + '</span>';
  }
  function loanRows() {
    var sm = F.loansSummary(F.todayStr());
    return '<ul class="ledger">' + sm.items.map(function (x) {
      var l = x.loan, i = x.info; var paid = l.start > 0 ? Math.max(0, Math.min(100, Math.round((l.start - i.balanceNow) / l.start * 100))) : 0;
      return '<li><button class="catlink" data-act="loans"><span class="lrow"><span class="name">' + catDot(F.catById(l.kind === 'card' ? 'cards' : 'loans')) + '<b>' + esc(l.name) + '</b></span><span class="lead"></span><span class="val num">' + money(i.balanceNow) + '</span>' + ic('right', 'sm chev') + '</span><span class="meter" role="img" aria-label="Виплачено ' + paid + '%"><i style="width:' + paid + '%"></i></span>' + loanStatus(i) + '</button></li>';
    }).join('') + '</ul>';
  }
  function loansSection() {
    if (!F.state.cfg.loans.length) return '';
    var sm = F.loansSummary(F.todayStr());
    return '<section class="sec"><div class="sec-h"><h2>Кредити та картки</h2><button class="btn-text" data-act="loans">Керувати</button></div><div class="panel"><p class="lrow" style="padding:12px 0 2px"><span class="name"><b>Усього боргу</b></span><span class="lead"></span><span class="val num">' + money(sm.total) + '</span></p>' + loanRows() + '</div></section>';
  }

  // --- Кредитки ---
  function cardStatus(x) {
    var parts = [];
    if (x.debt > 0.005) parts.push(x.card.limit != null ? 'Доступно ' + money(Math.max(0, x.free)) + ' з ' + money(x.card.limit) : 'Ліміт не вказано');
    else if (x.debt < -0.005) parts.push('Переплата ' + money(-x.debt));
    else parts.push(x.card.limit != null ? 'Боргу немає, ліміт ' + money(x.card.limit) : 'Боргу немає');
    if (x.last) parts.push((x.last.amount < 0 ? 'погасили ' : 'взяли ') + esc(dayMonthShort(x.last.date)));
    return '<span class="status">' + parts.join(', ') + '</span>';
  }
  function cardMeter(x) {
    if (x.card.limit == null || !(x.card.limit > 0)) return '';
    var pct = Math.max(0, Math.min(100, Math.round(Math.max(0, x.debt) / x.card.limit * 100)));
    return '<span class="meter' + (pct >= 90 ? ' over' : '') + '" role="img" aria-label="Використано ' + pct + '% ліміту"><i style="width:' + pct + '%"></i></span>';
  }
  function cardsSection() {
    var sm = F.cardsSummary(); if (!sm.items.length) return '';
    return '<section class="sec cards-sec"><div class="sec-h"><h2>Кредитки</h2><button class="btn-text" data-act="cards">Історія</button></div><div class="panel">' +
      '<p class="lrow" style="padding:12px 0 2px"><span class="name"><b>Треба погасити</b></span><span class="lead"></span><span class="val num' + (sm.total > 0 ? ' badtxt' : '') + '">' + money(sm.total) + '</span></p><ul class="ledger">' +
      sm.items.map(function (x) {
        return '<li><div class="lrow"><span class="name"><i class="dot card" aria-hidden="true"></i><b>' + esc(x.card.name) + '</b></span><span class="lead"></span><span class="val num">' + money(Math.max(0, x.debt)) + '</span></div>' + cardMeter(x) + cardStatus(x) +
          '<div class="acts"><button class="btn alt sm" data-act="card-move" data-id="' + esc(x.card.id) + '" data-s="1">' + ic('plus', 'sm') + 'Взяли</button>' +
          (x.debt > 0.005 ? '<button class="btn alt sm" data-act="card-move" data-id="' + esc(x.card.id) + '" data-s="-1">' + ic('check', 'sm') + 'Погасили</button>' : '') + '</div></li>';
      }).join('') + '</ul></div></section>';
  }
  function cardHistory(id) {
    var list = F.cardTxs(id).slice(0, 8); if (!list.length) return '<p class="note">Записів ще немає.</p>';
    return '<ul class="ledger cardhist">' + list.map(function (t) {
      return '<li><div class="lrow"><span class="name"><span class="hd">' + esc(dayMonthShort(t.date)) + '</span><b>' + esc(t.note || (t.amount < 0 ? 'Погасили' : 'Взяли')) + '</b></span><span class="lead"></span><span class="val num">' + (t.amount < 0 ? '−' : '+') + money(Math.abs(t.amount)) + '</span>' +
        '<button class="iconbtn" data-act="card-tx-del" data-id="' + esc(t.id) + '" aria-label="Видалити запис від ' + esc(dayMonthShort(t.date)) + '">' + ic('trash', 'sm') + '</button></div>' + (t.member ? '<span class="status">' + esc(t.member) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function openCards(editId, keep) {
    var sm = F.cardsSummary(); var e = editId ? F.cardById(editId) : null;
    var html = sheetTop('Кредитки', 'Коли берете гроші з кредитки, натисніть «Взяли». Коли гасите із зарплати, натисніть «Погасили». Це не витрати й не доходи: змінюється лише борг, тому бюджет не рахується двічі.') +
      (sm.items.length ? '<p class="lrow" style="padding:14px 0 0"><span class="name"><b>Треба погасити</b></span><span class="lead"></span><span class="val num">' + money(sm.total) + '</span></p>' + sm.items.map(function (x) {
        return '<div class="rec-row"><div class="lrow"><span class="name"><i class="dot card" aria-hidden="true"></i><b>' + esc(x.card.name) + '</b></span><span class="lead"></span><span class="val num">' + money(Math.max(0, x.debt)) + '</span></div>' + cardMeter(x) + cardStatus(x) +
          '<div class="acts wrap"><button class="btn alt sm" data-act="card-move" data-id="' + esc(x.card.id) + '" data-s="1">' + ic('plus', 'sm') + 'Взяли</button><button class="btn alt sm" data-act="card-move" data-id="' + esc(x.card.id) + '" data-s="-1">' + ic('check', 'sm') + 'Погасили</button><button class="btn alt sm" data-act="card-debt" data-id="' + esc(x.card.id) + '">Уточнити борг</button><button class="btn alt sm" data-act="card-edit" data-id="' + esc(x.card.id) + '">Змінити</button></div>' +
          cardHistory(x.card.id) + '</div>';
      }).join('') : '<p class="hint">Кредиток ще немає.</p>') +
      '<form data-form="card" data-id="' + esc(editId || '') + '" novalidate><h3 style="margin-top:22px;font-size:16px">' + (e ? 'Змінити кредитку' : 'Додати кредитку') + '</h3>' +
      '<div class="row2"><label class="field"><span>Чия або назва</span><input class="in" id="cc-name" maxlength="30" placeholder="Наприклад, Максим" value="' + esc(e ? e.name : '') + '"></label>' +
      '<label class="field"><span>Кредитний ліміт, ' + esc(cur()) + '</span><input class="in" id="cc-limit" inputmode="decimal" placeholder="Необов’язково" value="' + (e && e.limit != null ? esc(String(e.limit).replace('.', ',')) : '') + '"></label></div>' +
      '<p class="note bad" id="cc-err" role="alert" hidden></p>' +
      '<button class="btn" type="submit">' + (e ? 'Зберегти зміни' : 'Додати кредитку') + '</button>' + (e ? '<button type="button" class="btn alt" data-act="card-cancel">Скасувати зміни</button><button type="button" class="btn danger" data-act="card-del" data-id="' + esc(e.id) + '">' + ic('trash', 'sm') + 'Видалити кредитку</button>' : '') + '</form>';
    openSheet(html, { keepScroll: keep });
  }
  function openCardMove(id, sign) {
    var cd = F.cardById(id); if (!cd) return; var debt = F.cardDebt(id);
    var html = '<form data-form="card-move" data-id="' + esc(id) + '" data-s="' + sign + '" novalidate>' + sheetTop(sign > 0 ? 'Взяли з кредитки: ' + cd.name : 'Погасили кредитку: ' + cd.name, sign > 0 ? 'Борг зросте на цю суму. На що витратили, записуйте як звичайні витрати.' : 'Борг зменшиться. Це не витрата: гроші пішли на погашення.') +
      '<div class="amount-wrap"><input class="amount-in" id="cm-amount" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Сума"><span class="cur">' + esc(cur()) + '</span></div>' +
      (sign < 0 && debt > 0.005 ? '<p class="note"><button type="button" class="btn-text" data-act="card-all" data-v="' + esc(String(debt).replace('.', ',')) + '">Увесь борг: ' + money(debt) + '</button></p>' : '') +
      '<p class="note bad" id="cm-err" role="alert" hidden></p>' +
      '<div class="row2"><label class="field"><span>Дата</span><input class="in" type="date" id="cm-date" value="' + esc(F.todayStr()) + '"></label><label class="field"><span>Нотатка</span><input class="in" id="cm-note" maxlength="200" placeholder="За бажанням"></label></div>' +
      '<button class="btn" type="submit">' + (sign > 0 ? 'Записати: взяли' : 'Записати: погасили') + '</button></form>';
    openSheet(html, { focus: '#cm-amount' });
  }
  function openCardDebt(id) {
    var cd = F.cardById(id); if (!cd) return;
    var html = '<form data-form="card-debt" data-id="' + esc(id) + '" novalidate>' + sheetTop('Уточнити борг: ' + cd.name, 'Введіть борг за випискою банку. Додаток запише різницю, щоб сума збіглася.') +
      '<label class="field"><span>Борг зараз, ' + esc(cur()) + '</span><input class="in" id="cd-val" inputmode="decimal" value="' + esc(String(Math.max(0, F.cardDebt(id))).replace('.', ',')) + '"></label>' +
      '<p class="note bad" id="cd-err" role="alert" hidden></p><button class="btn" type="submit">Зберегти</button></form>';
    openSheet(html, { focus: '#cd-val' });
  }

  function viewHome() {
    var today = F.todayStr(); var o = F.overview(today);
    var upcoming = F.upcomingRecurring(today).slice(0, 3);
    var recent = F.monthTxs(curYm).slice(0, 5);
    var h = top(cap(monthName(curYm))) + '<section class="hero" aria-live="polite">' + hero(o) + '</section>' + stripHtml();
    h += flowSection();
    h += '<section class="sec"><div class="sec-h"><h2>Категорії</h2><button class="btn-text" data-act="budget">Бюджет</button></div><div class="panel">' + budgetRows(o) + '</div></section>';
    h += limitsSection() + cardsSection();
    if (upcoming.length) {
      h += '<section class="sec"><div class="sec-h"><h2>Найближчі платежі</h2><button class="btn-text" data-act="recurring">Керувати</button></div><div class="panel"><ul class="ledger">' + upcoming.map(function (u) {
        return '<li><div class="lrow"><span class="name">' + catDot(F.catById(u.rec.category)) + '<b>' + esc(u.rec.name) + '</b></span><span class="lead"></span><span class="val num">' + money(u.rec.amount) + '</span></div><p class="status">' + esc(dayMonthShort(u.date)) + '</p></li>';
      }).join('') + '</ul></div></section>';
    }
    h += goalsSection() + loansSection();
    if (recent.length) {
      h += '<section class="sec"><div class="sec-h"><h2>Останні витрати</h2><button class="btn-text" data-act="tab" data-tab="list">Усі витрати</button></div><div class="panel">' + recent.map(txRowHtml).join('') + '</div></section>';
    }
    return h;
  }

  // ---------- Витрати ----------
  function monthNav(totalOverride) {
    var total = totalOverride === undefined ? F.sum(F.monthTxs(ym)) : totalOverride; var isCur = ym >= curYm;
    return '<div class="month-nav"><button class="arrow" data-act="month" data-d="-1" aria-label="Попередній місяць">' + ic('left') + '</button>' +
      '<div class="label"><b>' + esc(monthName(ym)) + '</b><span>' + ym.slice(0, 4) + ', усього ' + money(total) + '</span></div>' +
      '<button class="arrow" data-act="month" data-d="1" aria-label="Наступний місяць"' + (isCur ? ' disabled' : '') + '>' + ic('right') + '</button></div>';
  }
  var listKind = 'expense', query = '', shopSel = null, shopKind = 'shops';
  var KIND_TITLE = { expense: 'витрат', income: 'доходів', saving: 'накопичень' };
  function listKindSeg() {
    return '<div class="seg full" role="group" aria-label="Що показати">' + [['expense', 'Витрати'], ['income', 'Доходи'], ['saving', 'Відкладено']].map(function (k) {
      return '<button data-act="list-kind" data-k="' + k[0] + '" aria-pressed="' + (listKind === k[0]) + '">' + k[1] + '</button>';
    }).join('') + '</div>';
  }
  function viewList() {
    return top('Витрати') + listKindSeg() + '<label class="sr" for="q">Пошук</label><input class="in search" id="q" type="search" enterkeyhint="search" autocomplete="off" placeholder="Пошук по нотатках і категоріях" value="' + esc(query) + '"><div id="list-body">' + listBody() + '</div>';
  }
  function listBody() {
    var kind = listKind; var searching = query.trim().length >= 2;
    if (searching) {
      var res = F.search(query, kind);
      if (!res.length) return '<div class="empty"><b>Нічого не знайдено</b>Спробуйте інше слово. Шукаємо в нотатках і назвах категорій за всі місяці.</div>';
      return '<div class="found"><span>Знайдено ' + res.length + (res.length === 300 ? '+' : '') + ', разом <b class="num">' + money(F.sum(res)) + '</b></span>' + (kind === 'expense' ? '<button class="btn-text" data-act="bulk">Змінити категорію</button>' : '') + '</div>' + daysHtml(res);
    }
    var list = kind === 'expense' ? F.monthTxs(ym) : F.monthKind(ym, kind);
    if (shopSel && kind === 'expense') list = list.filter(function (t) { return F.tagOf(t, shopKind) === shopSel; });
    var h = monthNav(F.sum(list));
    if (shopSel && kind === 'expense') h += '<div class="found"><span>' + (shopKind === 'clubs' ? 'Гурток' : 'Магазин') + ': <b>' + esc(shopSel) + '</b></span><button class="btn-text" data-act="shop-clear">Показати всі</button></div>';
    if (kind === 'expense' && !shopSel) {
      h += '<div class="chips" role="group" aria-label="Фільтр за категорією"><button class="chip" data-act="filter" data-c="all" aria-pressed="' + (catFilter === 'all') + '">Усі</button>' +
        F.categories().map(function (c) { return '<button class="chip" data-act="filter" data-c="' + esc(c.id) + '" aria-pressed="' + (catFilter === c.id) + '">' + catDot(c) + esc(c.name) + '</button>'; }).join('') + '</div>';
      list = list.filter(function (t) { return catFilter === 'all' || F.catById(t.category, t.cn).id === catFilter; });
    }
    if (!list.length) {
      var msg = kind === 'expense' ? (shopSel ? 'За цим записом цього місяця витрат немає' : catFilter === 'all' ? 'Витрат за цей місяць немає' : 'У цій категорії порожньо') : kind === 'income' ? 'Доходів за цей місяць немає' : 'Внесків у цілі за цей місяць немає';
      var hint = kind === 'saving' ? 'Створіть ціль і додавайте внески в «Ще».' : kind === 'income' ? 'Натисніть «+» і виберіть «Дохід».' : ym === curYm ? 'Натисніть «+», щоб додати першу витрату.' : 'Спробуйте інший місяць.';
      return h + '<div class="empty"><b>' + msg + '</b>' + hint + '</div>';
    }
    return h + daysHtml(list);
  }
  function daysHtml(list) {
    var groups = []; var byDate = {}; var h = '';
    list.forEach(function (t) { if (!byDate[t.date]) { byDate[t.date] = []; groups.push(t.date); } byDate[t.date].push(t); });
    groups.forEach(function (d) {
      h += '<div class="day-h"><b>' + esc(dayLabel(d)) + '</b><span class="num">' + money(F.sum(byDate[d])) + '</span></div><div class="panel">' + byDate[d].map(txRowHtml).join('') + '</div>';
    });
    return h;
  }

  // ---------- Звіти ----------
  function seg() {
    return '<div class="seg" role="group" aria-label="Вигляд"><button data-act="repmode" data-m="chart" aria-pressed="' + (repMode === 'chart') + '">Діаграма</button><button data-act="repmode" data-m="table" aria-pressed="' + (repMode === 'table') + '">Таблиця</button></div>';
  }
  function barRows(items, total) {
    // items: [{name, value, cls, dot}] ; довжина смуги = частка від загальної суми
    return items.map(function (it) {
      var pct = total > 0 ? it.value / total * 100 : 0;
      var link = !!(it.id || it.shop);
      var open = it.id ? '<button class="hbar catlink" data-act="open-cat" data-c="' + esc(it.id) + '">' : it.shop ? '<button class="hbar catlink" data-act="shop-find" data-k="' + esc(it.tk || 'shops') + '" data-s="' + esc(it.shop) + '">' : '<div class="hbar">';
      return open + '<span class="lrow"><span class="name">' + it.dot + '<b>' + esc(it.name) + '</b></span><span class="lead"></span><span class="val num">' + money(it.value) + ' <small>' + Math.round(pct) + '%</small></span>' + (link ? ic('right', 'sm chev') : '') + '</span><span class="track"><i class="' + it.cls + '" style="width:' + Math.max(pct, 0.5).toFixed(1) + '%"></i></span>' + (link ? '</button>' : '</div>');
    }).join('');
  }
  function colsSvg(series, budget, label) {
    var n = series.length; var W = 340, H = 170; var left = 8, bw = 36; var gap = (W - left * 2 - bw * n) / (n - 1);
    var max = Math.max.apply(null, series.map(function (s) { return s.total; }).concat([budget || 0, 1]));
    var base = 138; var scale = 100 / max; var out = '';
    series.forEach(function (s, i) {
      var h = s.total > 0 ? Math.max(3, s.total * scale) : 2; var x = left + i * (bw + gap);
      out += '<rect class="col' + (s.ym === ym ? ' sel' : '') + '" x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + bw + '" height="' + h.toFixed(1) + '" rx="4"/>';
      out += '<text class="val" x="' + (x + bw / 2).toFixed(1) + '" y="' + (base - h - 6).toFixed(1) + '">' + (s.total > 0 ? short(s.total) : '0') + '</text>';
      out += '<text class="mon" x="' + (x + bw / 2).toFixed(1) + '" y="158">' + esc(monthName(s.ym).slice(0, 3)) + '</text>';
      out += '<rect class="hit" data-act="pickmonth" data-ym="' + s.ym + '" x="' + (x - gap / 2).toFixed(1) + '" y="0" width="' + (bw + gap).toFixed(1) + '" height="165"/>';
    });
    if (budget) {
      var by = base - budget * scale;
      out += '<line class="bline" x1="0" x2="' + W + '" y1="' + by.toFixed(1) + '" y2="' + by.toFixed(1) + '"/><text class="btxt" x="' + W + '" y="' + (by - 5).toFixed(1) + '" text-anchor="end">' + (label || 'бюджет') + ' ' + short(budget) + '</text>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Витрати за останні шість місяців">' + out + '</svg>';
  }
  function summaryHtml() {
    var m = F.monthSummary(ym); if (!m) return '';
    var L = [];
    L.push('Витрачено <b>' + money(m.total) + '</b>' + (m.diff === null ? '' : m.diff === 0 ? ', стільки ж, як місяць тому' : ', на ' + money(Math.abs(m.diff)) + (m.diff > 0 ? ' більше' : ' менше') + ', ніж місяць тому') + '.');
    if (m.top) L.push('Найбільша категорія: <b>' + esc(m.top.cat.name) + '</b>, ' + money(m.top.amount) + ' (' + m.top.share + '%).');
    if (m.up) L.push('Найбільше зросла: <b>' + esc(m.up.cat.name) + '</b>, на ' + money(m.up.delta) + '.');
    if (m.down) L.push('Найбільше скоротилась: <b>' + esc(m.down.cat.name) + '</b>, на ' + money(-m.down.delta) + '.');
    if (m.biggest) L.push('Найбільша покупка: <b>' + esc(m.biggest.note || F.catInfo(m.biggest).name) + '</b>, ' + money(m.biggest.amount) + ', ' + esc(dayMonthShort(m.biggest.date)) + '.');
    L.push('У середньому <b>' + whole(m.perDay) + '</b> на день' + (m.avg3 ? '. Три попередні місяці в середньому: ' + whole(m.avg3) : '') + '.');
    if (m.budgetPct !== null) L.push(m.budgetPct > 100 ? '<span class="badtxt">' + ic('alert', 'sm') + 'Бюджет перевищено: використано <b>' + m.budgetPct + '%</b> (' + money(m.budget) + ').</span>' : 'Використано <b>' + m.budgetPct + '%</b> бюджету ' + money(m.budget) + '.');
    if (m.hasFlow) L.push('Доходи ' + money(m.flow.income) + ', відкладено ' + money(m.flow.saved) + ', залишок <b>' + money(m.flow.balance) + '</b>.');
    return '<section class="sec"><div class="sec-h"><h2>Підсумок місяця</h2></div><div class="panel"><ul class="ledger sumlist">' + L.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div></section>';
  }
  function tagReport(kind, title, otherLabel, total, hint) {
    var sh = F.byTag(ym, kind); if (!sh.items.length) return '';
    var h = '<section class="sec"><div class="sec-h"><h2>' + title + '</h2></div><div class="panel">';
    if (repMode === 'table') {
      h += '<table class="t"><thead><tr><th>' + (kind === 'clubs' ? 'Гурток' : 'Магазин') + '</th><th>Сума</th><th>Платежів</th></tr></thead><tbody>' + sh.items.map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td class="num">' + money(x.total) + '</td><td class="num">' + x.count + '</td></tr>'; }).join('') + (sh.other.count ? '<tr><td>' + otherLabel + '</td><td class="num">' + money(sh.other.total) + '</td><td class="num">' + sh.other.count + '</td></tr>' : '') + '</tbody></table>';
    } else {
      var rows = sh.items.map(function (x, i) { var k = i % F.MAX_COLORED; return { shop: x.name, tk: kind, name: x.name, value: x.total, cls: 'c' + k, dot: '<i class="dot c' + k + '" aria-hidden="true"></i>' }; });
      if (sh.other.count) rows.push({ name: otherLabel, value: sh.other.total, cls: '', dot: '<i class="dot" aria-hidden="true"></i>' });
      h += barRows(rows, total);
    }
    return h + '<p class="note" style="margin-top:10px">' + hint + '</p></div></section>';
  }
  // «<Категорія> за видами»: показуємо, лише якщо в місяці є витрати з уточненим видом
  function typesReport(c, withNote) {
    var ft = F.subTotals(ym, c.id); if (!ft.items.length) return '';
    var total = ft.total;
    var h = '<section class="sec"><div class="sec-h"><h2>' + esc(c.name) + ' за видами</h2></div><div class="panel">';
    if (repMode === 'table') {
      h += '<table class="t"><thead><tr><th>Вид</th><th>Сума</th><th>Частка</th></tr></thead><tbody>' + ft.items.concat(ft.none.count ? [{ name: 'Вид не вказано', total: ft.none.total }] : []).map(function (x) { return '<tr><td>' + esc(x.name) + '</td><td class="num">' + money(x.total) + '</td><td class="num">' + Math.round(x.total / total * 100) + '%</td></tr>'; }).join('') + '</tbody></table>';
    } else {
      var rows = ft.items.map(function (x, i) { var k = i % F.MAX_COLORED; return { name: x.name, value: x.total, cls: 'c' + k, dot: '<i class="dot c' + k + '" aria-hidden="true"></i>' }; });
      if (ft.none.count) rows.push({ name: 'Вид не вказано', value: ft.none.total, cls: '', dot: '<i class="dot" aria-hidden="true"></i>' });
      h += barRows(rows, total);
    }
    return h + (withNote ? '<p class="note" style="margin-top:10px">Вид обирається у формі витрати. Скан чека визначає його сам. Перелік видів можна змінити в «Бюджет і категорії».</p>' : '') + '</div></section>';
  }
  function viewReports() {
    var h = top('Звіти') + monthNav() + seg();
    var total = F.sum(F.monthTxs(ym));
    if (!total) return h + '<div class="empty"><b>Немає даних за ' + esc(monthName(ym)) + '</b>Додайте витрати або виберіть інший місяць.</div>';
    var spent = F.spentByCategory(ym);
    var cats = F.categories().filter(function (c) { return spent[c.id] > 0; }).sort(function (a, b) { return spent[b.id] - spent[a.id]; });
    var mem = F.byMember(ym);
    var series = F.monthsSeries(ym, 6); var budget = F.monthBudget().total;
    var prev = series[series.length - 2] ? series[series.length - 2].total : 0;
    var diff = prev > 0 ? total - prev : null;
    var read = '<b>' + esc(cap(monthName(ym))) + ':</b> ' + money(total) + (diff === null ? '' : diff === 0 ? ', стільки ж, як місяць тому' : ', на ' + money(Math.abs(diff)) + (diff > 0 ? ' більше' : ' менше') + ', ніж місяць тому');
    h += summaryHtml();
    h += '<button type="button" class="btn alt" data-act="ai" style="margin-top:12px">' + ic('sparkle') + ' ШІ-аналіз місяця</button>';
    h += '<section class="sec"><div class="sec-h"><h2>Куди пішли гроші</h2></div><div class="panel">';
    if (repMode === 'table') {
      h += '<table class="t"><thead><tr><th>Категорія</th><th>Сума</th><th>Частка</th></tr></thead><tbody>' + cats.map(function (c) { return '<tr><td>' + esc(c.name) + '</td><td class="num">' + money(spent[c.id]) + '</td><td class="num">' + Math.round(spent[c.id] / total * 100) + '%</td></tr>'; }).join('') + '<tr><td><b>Разом</b></td><td class="num"><b>' + money(total) + '</b></td><td></td></tr></tbody></table>';
    } else {
      h += barRows(cats.map(function (c) { return { id: c.id, name: c.name, value: spent[c.id], cls: c.colorIdx >= 0 ? 'c' + c.colorIdx : '', dot: catDot(c) }; }), total);
    }
    h += '</div></section>';
    if (mem.length > 1) {
      h += '<section class="sec"><div class="sec-h"><h2>Хто скільки витратив</h2></div><div class="panel">';
      if (repMode === 'table') {
        h += '<table class="t"><thead><tr><th>Хто</th><th>Сума</th><th>Частка</th></tr></thead><tbody>' + mem.map(function (m) { return '<tr><td>' + esc(m.name) + '</td><td class="num">' + money(m.total) + '</td><td class="num">' + Math.round(m.total / total * 100) + '%</td></tr>'; }).join('') + '</tbody></table>';
      } else {
        h += barRows(mem.map(function (m, i) { var idx = i % F.MAX_COLORED; return { name: m.name, value: m.total, cls: 'c' + idx, dot: '<i class="dot c' + idx + '" aria-hidden="true"></i>' }; }), total);
      }
      h += '</div></section>';
    }
    var shownTypes = 0; cats.forEach(function (c) { if (shownTypes >= 3) return; var x = typesReport(c, shownTypes === 0); if (x) { h += x; shownTypes++; } });
    h += tagReport('shops', 'По магазинах', 'Інші покупки', total, 'Магазин береться з початку нотатки. Додайте його у формі витрати.');
    h += tagReport('clubs', 'По гуртках', 'Решта витрат', total, 'Гурток береться з початку нотатки. Додайте його у формі витрати.');
    h += '<section class="sec"><div class="sec-h"><h2>Останні шість місяців</h2></div><div class="panel">';
    if (repMode === 'table') {
      h += '<table class="t"><thead><tr><th>Місяць</th><th>Витрати</th>' + (budget ? '<th>Бюджет</th>' : '') + '</tr></thead><tbody>' + series.slice().reverse().map(function (s) { return '<tr><td>' + esc(cap(monthName(s.ym))) + ' ' + s.ym.slice(0, 4) + '</td><td class="num">' + money(s.total) + '</td>' + (budget ? '<td class="num">' + money(budget) + '</td>' : '') + '</tr>'; }).join('') + '</tbody></table>';
    } else {
      h += '<div class="cols">' + colsSvg(series, budget) + '</div><p class="readout" aria-live="polite">' + read + '</p>';
    }
    h += '</div></section>';
    return h;
  }

  // ---------- Категорія зсередини ----------
  var catId = null, catFrom = 'home', scrollBack = 0;
  function viewCat() {
    var c = F.catById(catId); var list = F.catMonthTxs(ym, c.id); var total = F.sum(list); var monthTotal = F.sum(F.monthTxs(ym));
    var series = F.catSeries(c.id, ym, 6); var prev = series[4].total; var diff = prev > 0 ? total - prev : null;
    var h = '<header class="top"><button class="iconbtn" data-act="cat-back" aria-label="Назад">' + ic('left') + '</button><h1>' + catDot(c) + esc(c.name) + '</h1></header>' + monthNav(total);
    h += '<section class="hero"><p class="hero-line">Витрачено <span class="amt">' + money(total) + '</span></p>';
    var sub = [];
    if (monthTotal > 0 && total > 0) sub.push(Math.round(total / monthTotal * 100) + '% від усіх витрат місяця');
    if (diff !== null && total > 0) sub.push(diff === 0 ? 'стільки ж, як місяць тому' : 'на ' + money(Math.abs(diff)) + (diff > 0 ? ' більше' : ' менше') + ', ніж місяць тому');
    if (sub.length) h += '<p class="hero-sub">' + esc(sub.join(', ')) + '.</p>';
    if (c.limit) {
      var over = total > c.limit; var pct = Math.min(100, Math.round(total / c.limit * 100));
      h += '<span class="meter' + (over ? ' over' : '') + '" role="img" aria-label="Витрачено ' + pct + '% ліміту" style="margin-top:14px"><i style="width:' + pct + '%"></i></span>' +
        (over ? '<span class="status bad">' + ic('alert', 'sm') + 'Перевищено на ' + money(total - c.limit) + ' (ліміт ' + money(c.limit) + ')</span>' : '<span class="status">Лишилось ' + money(c.limit - total) + ' із ' + money(c.limit) + '</span>');
    } else if (c.id !== 'other') {
      h += '<button class="btn-text" data-act="budget">' + ic('sliders', 'sm') + 'Задати ліміт</button>';
    }
    h += '</section>';
    if (!list.length) {
      h += '<div class="empty"><b>У цій категорії за ' + esc(monthName(ym)) + ' витрат немає</b>' + (series.some(function (s) { return s.total > 0; }) ? 'Подивіться динаміку нижче або виберіть інший місяць.' : 'Додайте першу витрату.') + '</div>';
    }
    if (series.some(function (s) { return s.total > 0; })) {
      h += '<section class="sec"><div class="sec-h"><h2>Динаміка</h2></div><div class="panel"><div class="cols">' + colsSvg(series, c.limit, 'ліміт') + '</div></div></section>';
    }
    if (list.length) {
      h += typesReport(c, true);
      var groups = F.groupByNote(list);
      if (groups.length > 1 || (groups[0] && groups[0].name)) {
        h += '<section class="sec"><div class="sec-h"><h2>На що пішло</h2></div><div class="panel"><ul class="ledger">' + groups.map(function (g) {
          return '<li><span class="lrow"><span class="name"><b>' + esc(g.name || 'Без нотатки') + '</b></span><span class="lead"></span><span class="val num">' + money(g.total) + '</span></span><span class="status">' + g.count + ' ' + plural(g.count, 'покупка', 'покупки', 'покупок') + (total > 0 ? ', ' + Math.round(g.total / total * 100) + '%' : '') + '</span></li>';
        }).join('') + '</ul></div></section>';
      }
      var mem = {}; list.forEach(function (t) { var k = t.member || 'Без імені'; mem[k] = F.round2((mem[k] || 0) + t.amount); });
      var mems = Object.keys(mem).map(function (k) { return { name: k, value: mem[k] }; }).sort(function (a, b) { return b.value - a.value; });
      if (mems.length > 1) {
        h += '<section class="sec"><div class="sec-h"><h2>Хто витратив</h2></div><div class="panel">' + barRows(mems.map(function (m, i) { return { name: m.name, value: m.value, cls: 'c' + (i % F.MAX_COLORED), dot: '<i class="dot c' + (i % F.MAX_COLORED) + '" aria-hidden="true"></i>' }; }), total) + '</div></section>';
      }
      h += '<section class="sec"><div class="sec-h"><h2>Усі витрати</h2></div>' + daysHtml(list).replace('class="day-h"', 'class="day-h" style="padding-top:4px"') + '</section>';
    }
    h += '<button class="btn alt" data-act="add-cat" data-c="' + esc(c.id) + '">' + ic('plus', 'sm') + 'Додати витрату в «' + esc(c.name) + '»</button>';
    return h;
  }

  // ---------- Ще ----------
  function ago(ts) {
    if (!ts) return 'ще не було';
    var m = Math.round((F.now() - ts) / 60000);
    if (m < 1) return 'щойно'; if (m < 60) return m + ' хв тому';
    var hrs = Math.round(m / 60); if (hrs < 24) return hrs + ' год тому';
    return F.ymd(new Date(ts));
  }
  function viewMore() {
    var S = F.state; var h = top('Ще');
    h += '<section class="sec" style="margin-top:6px"><div class="sec-h"><h2>Сім’я</h2></div><div class="panel">';
    h += '<label class="field" style="margin-top:10px"><span>Ваше ім’я у списку витрат</span><input class="in" id="me-name" maxlength="40" autocomplete="given-name" value="' + esc(S.me.name) + '" data-change="name"></label>';
    if (F.isConnected()) {
      h += '<p class="note' + (F.sync.status === 'error' || F.sync.status === 'offline' ? ' bad' : '') + '">' + esc(F.sync.error || ('Підключено до спільної таблиці. Остання синхронізація: ' + ago(S.me.lastSync) + '.')) + '</p>';
      h += '<ul class="menu" style="margin-top:6px"><li><button data-act="sync"><span class="ico">' + ic('sync') + '</span><span class="grow"><span class="t1">Синхронізувати зараз</span><span class="t2">' + (F.dirtyCount() ? 'Чекає на надсилання: ' + F.dirtyCount() : 'Усе надіслано') + '</span></span></button></li>' +
        '<li><button data-act="invite"><span class="ico">' + ic('share') + '</span><span class="grow"><span class="t1">Запросити родину</span><span class="t2">Посилання для підключення</span></span></button></li>' +
        '<li><button data-act="disconnect"><span class="ico">' + ic('x') + '</span><span class="grow"><span class="t1">Відключити від таблиці</span><span class="t2">Дані лишаться на телефоні</span></span></button></li></ul>';
    } else {
      h += '<p class="note">Зараз витрати зберігаються лише на цьому телефоні. Підключіть спільну таблицю, щоб бачити витрати всієї родини.</p><button class="btn" data-act="open-connect">' + ic('users') + 'Підключити сім’ю</button>';
    }
    h += '</div></section>';
    h += '<section class="sec"><div class="sec-h"><h2>Налаштування</h2></div><div class="panel"><ul class="menu">' +
      '<li><button data-act="budget"><span class="ico">' + ic('sliders') + '</span><span class="grow"><span class="t1">Бюджет і категорії</span><span class="t2">' + (F.monthBudget().total ? 'Бюджет ' + money(F.monthBudget().total) + ' на місяць' : 'Бюджет не задано') + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="recurring"><span class="ico">' + ic('repeat') + '</span><span class="grow"><span class="t1">Регулярні платежі</span><span class="t2">' + (S.cfg.recurring.length ? S.cfg.recurring.length + ' ' + plural(S.cfg.recurring.length, 'платіж', 'платежі', 'платежів') : 'Оренда, інтернет, підписки') + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="shops"><span class="ico">' + ic('list') + '</span><span class="grow"><span class="t1">Магазини</span><span class="t2">' + (S.cfg.shops.length ? S.cfg.shops.length + ' ' + plural(S.cfg.shops.length, 'магазин', 'магазини', 'магазинів') + ' для швидкого вибору' : 'Додайте свої магазини') + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="clubs"><span class="ico">' + ic('users') + '</span><span class="grow"><span class="t1">Гуртки дитини</span><span class="t2">' + (S.cfg.clubs.length ? S.cfg.clubs.length + ' ' + plural(S.cfg.clubs.length, 'гурток', 'гуртки', 'гуртків') + ' для швидкого вибору' : 'Футбол, англійська, танці…') + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="goals"><span class="ico">' + ic('check') + '</span><span class="grow"><span class="t1">Цілі накопичень</span><span class="t2">' + (S.cfg.goals.length ? S.cfg.goals.length + ' ' + plural(S.cfg.goals.length, 'ціль', 'цілі', 'цілей') : 'Відпустка, резерв, велика покупка') + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="loans"><span class="ico">' + ic('repeat') + '</span><span class="grow"><span class="t1">Кредити та картки</span><span class="t2">' + (S.cfg.loans.length ? 'Борг ' + money(F.loansSummary(F.todayStr()).total) : 'Залишок, дата закінчення, переплата') + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="cards"><span class="ico">' + ic('card') + '</span><span class="grow"><span class="t1">Кредитки</span><span class="t2">' + (F.cards().length ? (F.cardsSummary().total > 0 ? 'Треба погасити ' + money(F.cardsSummary().total) : 'Боргу немає') : 'Взяли з кредитки й погасили') + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="ai"><span class="ico">' + ic('sparkle') + '</span><span class="grow"><span class="t1">ШІ-аналіз</span><span class="t2">Питання про ваші витрати</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="key"><span class="ico">' + ic('sparkle') + '</span><span class="grow"><span class="t1">Розпізнавання чеків</span><span class="t2">' + ({ own: 'Ключ Gemini додано', nutriplan: 'Використовується ключ з NutriPlan', none: 'Потрібен ключ Gemini' }[F.keySource()]) + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '<li><button data-act="pin"><span class="ico">' + ic('users') + '</span><span class="grow"><span class="t1">PIN-код</span><span class="t2">' + (F.hasPin() ? 'Увімкнено на цьому телефоні' : 'Закрити додаток від сторонніх') + '</span></span><span class="chev">' + ic('right', 'sm') + '</span></button></li>' +
      '</ul><label class="field"><span>Валюта</span><select class="in" id="cur" data-change="currency">' + F.CURRENCIES.map(function (c) { return '<option value="' + esc(c) + '"' + (c === cur() ? ' selected' : '') + '>' + esc(c + ' ' + ({ '₴': 'гривня', '$': 'долар', '€': 'євро', 'zł': 'злотий', '£': 'фунт' }[c])) + '</option>'; }).join('') + '</select></label><div style="height:14px"></div></div></section>';
    h += '<section class="sec"><div class="sec-h"><h2>Копія даних</h2></div><div class="panel"><ul class="menu">' +
      '<li><button data-act="export-json"><span class="ico">' + ic('download') + '</span><span class="grow"><span class="t1">Зберегти копію</span><span class="t2">' + (S.meta.lastBackup ? 'Остання копія: ' + ago(S.meta.lastBackup) : 'Копії ще не було') + '</span></span></button></li>' +
      '<li><button data-act="import-json"><span class="ico">' + ic('upload') + '</span><span class="grow"><span class="t1">Відновити з копії</span><span class="t2">Додасть записи, яких тут немає</span></span></button></li>' +
      '<li><button data-act="export-csv"><span class="ico">' + ic('list') + '</span><span class="grow"><span class="t1">Таблиця для Excel</span><span class="t2">Файл CSV з усіма витратами</span></span></button></li></ul></div></section>';
    if (F.saveFailed) h += '<p class="note bad">Телефон не дає зберегти дані: закінчилося місце. Збережіть копію й звільніть пам’ять.</p>';
    h += '<p class="note" style="text-align:center">Версія додатка: ' + esc(F.VERSION) + '</p>';
    h += '<input type="file" id="import-file" accept="application/json,.json" hidden>';
    return h;
  }

  var VIEWS = { home: viewHome, list: viewList, reports: viewReports, more: viewMore, cat: viewCat };
  function render() {
    $('#app').innerHTML = VIEWS[view]();
    $$('#tabs .tab').forEach(function (b) { if (attr(b, 'tab') === (view === 'cat' ? catFrom : view)) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  }
  var rq = false;
  function renderSoon() {
    if (rq) return; rq = true;
    requestAnimationFrame(function () {
      rq = false;
      var a = document.activeElement;
      if (a && a.closest && a.closest('#app') && /INPUT|SELECT|TEXTAREA/.test(a.tagName)) return; // не збиваємо введення
      render();
    });
  }
  function setView(v) { view = v; if (v === 'list' || v === 'reports') { /* місяць зберігається */ } render(); window.scrollTo(0, 0); }

  // ---------- Повідомлення ----------
  var toastTimer = null;
  function toast(msg, label, fn, ms) {
    var box = $('#toast'); clearTimeout(toastTimer);
    box.innerHTML = '<div class="toast"><span>' + esc(msg) + '</span>' + (label ? '<button id="toast-act">' + esc(label) + '</button>' : '') + '</div>';
    if (label) $('#toast-act').addEventListener('click', function () { box.innerHTML = ''; fn(); });
    toastTimer = setTimeout(function () { box.innerHTML = ''; }, ms || 5500);
  }

  // ---------- Аркуші ----------
  var sheetLocked = false;
  function openSheet(html, opts) {
    opts = opts || {}; sheetLocked = !!opts.lock;
    var root = $('#sheet-root'); var prev = $('.sheet', root); var keep = prev ? prev.scrollTop : 0;
    root.innerHTML = '<div class="back" data-act="backdrop"><div class="sheet" role="dialog" aria-modal="true">' + html + '</div></div>';
    document.body.classList.add('lock');
    var sh = $('.sheet', root); if (opts.keepScroll) sh.scrollTop = keep;
    if (opts.focus) { var f = $(opts.focus, root); if (f) setTimeout(function () { f.focus(); }, 30); }
    return sh;
  }
  function closeSheet() { $('#sheet-root').innerHTML = ''; document.body.classList.remove('lock'); sheetLocked = false; }
  function sheetTop(title, sub, closable) {
    return '<div class="sheet-top"><h2>' + esc(title) + '</h2>' + (closable === false ? '' : '<button type="button" class="x" data-act="close" aria-label="Закрити">' + ic('x') + '</button>') + '</div>' + (sub ? '<p class="lead-p">' + sub + '</p>' : '');
  }
  function showErr(id, msg) { var e = $('#' + id); if (!e) return; e.textContent = msg; e.hidden = !msg; if (msg) e.classList.add('bad'); }

  // --- Витрата ---
  var CUR_MAP = { UAH: '₴', USD: '$', EUR: '€', PLN: 'zł', GBP: '£', '₴': '₴', '$': '$', '€': '€' };
  var quickList = [];
  var TAG_ROW = { shops: ['Магазин', 'tx-shops'], clubs: ['Гурток', 'tx-clubs'] };
  function tagRows(kind, t) {
    return ['shops', 'clubs'].map(function (k) {
      var names = F.state.cfg[k]; if (!names.length) return '';
      return '<div class="tagrow" id="' + TAG_ROW[k][1] + '"' + (kind === 'expense' ? '' : ' hidden') + '><p class="lbl">' + TAG_ROW[k][0] + '</p><div class="quick" role="group" aria-label="' + TAG_ROW[k][0] + '">' + names.map(function (n) {
        return '<button type="button" class="chip" data-act="shop" data-k="' + k + '" data-s="' + esc(n) + '" aria-pressed="' + (!!t && F.tagOf(t, k) === n) + '">' + esc(n) + '</button>';
      }).join('') + '</div></div>';
    }).join('');
  }
  function syncShops() {
    var n = $('#tx-note'); if (!n) return;
    $$('[data-act=shop]').forEach(function (b) { b.setAttribute('aria-pressed', String(attr(b, 's') === F.tagOf({ note: n.value }, attr(b, 'k')))); });
  }
  // Рядок видів є в категорій із видами, у «Інше» та у власних категоріях (там можна вписати свій вид)
  function hasSubRow(catId) { return F.subsOf(catId).length > 0 || catId === 'other' || /^c_/.test(catId); }
  function subChipsHtml(catId, cur) {
    return [{ id: '', name: 'Без виду' }].concat(F.subsOf(catId)).map(function (x) { return '<button type="button" class="chip" data-act="sub" data-s="' + esc(x.id) + '" aria-pressed="' + (x.id === cur) + '">' + esc(x.name) + '</button>'; }).join('');
  }
  function subRowHtml(kind, selId, t) {
    var cur = t && F.subOf(t) ? F.subOf(t).id : ''; var show = kind === 'expense' && hasSubRow(selId);
    return '<div class="subrow" id="tx-sub" data-cat="' + esc(selId) + '"' + (show ? '' : ' hidden') + '><p class="lbl">Вид</p><div class="quick" id="tx-sub-chips" role="group" aria-label="Вид витрати">' + subChipsHtml(selId, cur) + '</div>' +
      '<label class="sr" for="tx-sub-own">Свій вид</label><input class="in" id="tx-sub-own" maxlength="30" autocomplete="off" placeholder="Свій вид: що саме це було" style="margin-top:8px"></div>';
  }
  function setSub(id) { var own = $('#tx-sub-own'); if (own && id) own.value = ''; $$('[data-act=sub]').forEach(function (b) { b.setAttribute('aria-pressed', String(attr(b, 's') === id)); }); }
  function subValue() { var w = $('#tx-sub'); if (!w || w.hidden) return ''; var b = $('[data-act=sub][aria-pressed=true]', w); return b ? attr(b, 's') : ''; }
  // Після зміни категорії показуємо її власні види (або ховаємо рядок, якщо їх немає)
  function syncSub() {
    var w = $('#tx-sub'); if (!w) return; var r = $('input[name=cat]:checked', w.closest('form') || document); var id = r ? r.value : '';
    var form = w.closest('form'); var expense = !form || attr(form, 'kind') !== 'saving' && attr(form, 'kind') !== 'income';
    var has = expense && hasSubRow(id);
    if (w.getAttribute('data-cat') !== id) { w.setAttribute('data-cat', id); $('#tx-sub-chips').innerHTML = subChipsHtml(id, ''); var ow = $('#tx-sub-own'); if (ow) ow.value = ''; }
    w.hidden = !has; if (!has) { setSub(''); var o2 = $('#tx-sub-own'); if (o2) o2.value = ''; }
  }
  function catGridHtml(kind, selId, t) {
    var items;
    if (kind === 'income') items = F.INCOME_CATS.map(function (c) { return { id: c.id, name: c.name, dot: '<i class="dot inc" aria-hidden="true"></i>' }; });
    else if (kind === 'saving') {
      items = F.state.cfg.goals.map(function (g) { return { id: 'sv_' + g.id, name: g.name, dot: '<i class="dot sav" aria-hidden="true"></i>' }; });
      if (t && !items.some(function (c) { return c.id === t.category; })) items.push({ id: t.category, name: t.cn || 'Видалена ціль', dot: '<i class="dot sav" aria-hidden="true"></i>' });
    } else items = F.categories().map(function (c) { return { id: c.id, name: c.name, dot: catDot(c) }; });
    if (!items.length) return '<p class="hint">Спершу створіть ціль у «Ще».</p>';
    if (!items.some(function (c) { return c.id === selId; })) selId = kind === 'expense' ? 'other' : items[0].id;
    return items.map(function (c) { return '<input type="radio" name="cat" id="cat-' + esc(c.id) + '" value="' + esc(c.id) + '"' + (c.id === selId ? ' checked' : '') + '><label for="cat-' + esc(c.id) + '">' + c.dot + esc(c.name) + '</label>'; }).join('');
  }
  var TX_TITLE = { expense: ['Нова витрата', 'Редагувати витрату'], income: ['Новий дохід', 'Редагувати дохід'], saving: ['Новий внесок', 'Редагувати внесок'] };
  function openTx(id, preCat) {
    var t = id ? F.state.txs[id] : null; if (id && !t) return;
    var kind = t ? F.kindOf(t) : (preCat ? F.resolveCat(preCat).kind : 'expense');
    var selId = t ? F.catInfo(t).id : (preCat || F.state.meta.lastCat);
    quickList = t ? [] : F.frequent(5);
    var amountVal = t ? String(t.amount).replace('.', ',') : '';
    var html = '<form data-form="tx" data-id="' + esc(id || '') + '" data-kind="' + kind + '" novalidate>' + '<div class="sheet-top"><h2 id="tx-title">' + TX_TITLE[kind][t ? 1 : 0] + '</h2><button type="button" class="x" data-act="close" aria-label="Закрити">' + ic('x') + '</button></div>' +
      (!t && kind !== 'saving' ? '<div class="seg full" role="group" aria-label="Тип запису"><button type="button" data-act="tx-kind" data-k="expense" aria-pressed="' + (kind === 'expense') + '">Витрата</button><button type="button" data-act="tx-kind" data-k="income" aria-pressed="' + (kind === 'income') + '">Дохід</button></div>' : '') +
      '<div class="amount-wrap"><input class="amount-in" id="tx-amount" inputmode="' + (kind === 'saving' ? 'text' : 'decimal') + '" autocomplete="off" placeholder="0" aria-label="Сума" value="' + esc(amountVal) + '"><span class="cur">' + esc(cur()) + '</span></div>' +
      '<p class="note" id="tx-sign"' + (kind === 'saving' ? '' : ' hidden') + '>Мінус означає зняття з цілі, наприклад -500.</p>' +
      '<p class="note bad" id="tx-err" role="alert" hidden></p>' +
      (quickList.length ? '<div class="quick" id="tx-quick" role="group" aria-label="Часті витрати"' + (kind === 'expense' ? '' : ' hidden') + '>' + quickList.map(function (q, n) {
        var c = F.catById(q.category); return '<button type="button" class="chip" data-act="quick" data-i="' + n + '">' + catDot(c) + esc((q.note || c.name) + ' ' + money(q.amount)) + '</button>';
      }).join('') + '</div>' : '') +
      '<div class="catgrid" id="tx-cats" role="radiogroup" aria-label="Категорія">' + catGridHtml(kind, selId, t) + '</div>' +
      subRowHtml(kind, selId, t) +
      tagRows(kind, t) +
      '<div class="row2"><label class="field"><span>Дата</span><input class="in" type="date" id="tx-date" value="' + esc(t ? t.date : F.todayStr()) + '"></label>' +
      '<label class="field"><span>Нотатка</span><input class="in" id="tx-note" maxlength="200" list="note-list" autocomplete="off" placeholder="За бажанням" value="' + esc(t ? t.note : '') + '"></label></div>' +
      '<datalist id="note-list">' + F.noteSuggestions().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<div id="tx-scan-wrap"' + (kind === 'expense' ? '' : ' hidden') + '><button type="button" class="scan" id="tx-scan" data-act="scan">' + ic('camera') + 'Сфотографувати чек</button><input type="file" id="tx-file" accept="image/*" hidden>' +
      '<p class="note" id="tx-scan-note">Фото чека або скриншот замовлення з інтернет-магазину надсилається в Google Gemini для розпізнавання, на сервері родини воно не зберігається.</p></div>' +
      '<button class="btn" type="submit">Зберегти</button>' + (t ? '<button type="button" class="btn alt" data-act="repeat-tx" data-id="' + esc(id) + '">' + ic('repeat', 'sm') + 'Повторити сьогодні</button><button type="button" class="btn danger" data-act="del-tx" data-id="' + esc(id) + '">' + ic('trash', 'sm') + 'Видалити</button>' : '') + '</form>';
    openSheet(html, { focus: t ? null : '#tx-amount' });
  }
  function submitTx(form) {
    var id = attr(form, 'id'); var kind = attr(form, 'kind'); var cat = $('input[name=cat]:checked', form);
    if (!cat) return showErr('tx-err', kind === 'saving' ? 'Спершу створіть ціль у «Ще».' : 'Оберіть категорію.');
    var sub = subValue(); var own = $('#tx-sub-own'); var ownTxt = own && !$('#tx-sub').hidden ? own.value.trim() : '';
    if (ownTxt) { var es = F.ensureSub(cat.value, ownTxt); if (es.error) return showErr('tx-err', es.error); sub = es.sub.id; }
    var p = { amount: $('#tx-amount').value, category: cat.value, sub: sub, date: $('#tx-date').value, note: $('#tx-note').value };
    var label = function (tx) { var c = F.catInfo(tx); return c.kind === 'income' ? 'Дохід додано: ' + c.name + ', ' + signedMoney(tx.amount) : c.kind === 'saving' ? 'Внесок записано: ' + c.name + ', ' + signedMoney(tx.amount) : 'Додано: ' + c.name + ', ' + money(tx.amount); };
    if (id) {
      var r = F.updateTx(id, p); if (r.error) return showErr('tx-err', r.error);
      closeSheet(); render(); refreshList(); toast('Зміни збережено', 'Скасувати', function () { F.restoreSnapshot(r.before); render(); });
    } else {
      var a = F.addTx(p); if (a.error) return showErr('tx-err', a.error);
      closeSheet(); render();
      var debt = F.cardsSummary().total;
      if ((a.tx.category === 'in_salary' || a.tx.category === 'in_advance') && debt > 0.005) toast(label(a.tx) + '. На кредитках борг ' + money(debt), 'Погасити', function () { openCards(); }, 9000);
      else toast(label(a.tx), 'Скасувати', function () { F.setDeleted(a.tx.id, true); render(); });
    }
  }
  // ---------- Чек по позиціях ----------
  var splitCtx = null;
  function shouldSplit(r) {
    if (!(r && r.total && r.items && r.items.length >= 2)) return false;
    var seen = {}; r.items.forEach(function (x) { seen[x.category + '|' + (x.sub || '')] = 1; }); return Object.keys(seen).length >= 2;
  }
  function catOptions(sel) { return F.categories().map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === sel ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join(''); }
  function subOptions(catId, sel) { return [{ id: '', name: 'Вид не вказано' }].concat(F.subsOf(catId)).map(function (x) { return '<option value="' + esc(x.id) + '"' + (x.id === (sel || '') ? ' selected' : '') + '>' + esc(x.name) + '</option>'; }).join(''); }
  function splitRowHtml(name, amount, cat, sub) {
    return '<div class="split-row"><span class="sname">' + esc(name) + '</span><input class="in" inputmode="decimal" autocomplete="off" aria-label="Сума: ' + esc(name) + '" value="' + esc(String(amount).replace('.', ',')) + '">' +
      '<span class="selwrap"><select class="in cat" aria-label="Категорія: ' + esc(name) + '">' + catOptions(cat) + '</select><select class="in sub" data-cat="' + esc(cat) + '" aria-label="Вид: ' + esc(name) + '"' + (F.subsOf(cat).length ? '' : ' hidden') + '>' + subOptions(cat, sub) + '</select></span><button type="button" class="ibtn" data-act="split-del" aria-label="Прибрати: ' + esc(name) + '">' + ic('x') + '</button></div>';
  }
  function openSplit(r, formDate) {
    splitCtx = { total: r.total, currency: r.currency, items: r.items, itemsSum: r.itemsSum, merchant: r.merchant };
    var rows = r.items.map(function (x) { return splitRowHtml(x.name || 'Позиція', x.amount, x.category, x.sub); });
    var rest = F.round2(r.total - r.itemsSum);
    if (rest > 0.009) rows.push(splitRowHtml('Решта чека (знижки, нерозпізнане)', rest, 'other'));
    var c = r.currency ? (CUR_MAP[r.currency.toUpperCase()] || r.currency) : ''; var curWarn = c && c !== cur() ? ' На чеку валюта ' + c + ', а в додатку ' + cur() + ': перевірте суми.' : '';
    var html = '<form data-form="split" novalidate>' + sheetTop('Чек по категоріях', 'Покупки з чека розкладено по категоріях. Перевірте суми й за потреби змініть категорію. Для кожної категорії (і виду) буде записано окрему витрату.' + esc(curWarn)) +
      '<div class="row2"><label class="field"><span>Дата</span><input class="in" type="date" id="sp-date" value="' + esc(r.date || formDate || F.todayStr()) + '"></label>' +
      '<label class="field"><span>Магазин</span><input class="in" id="sp-note" maxlength="200" list="note-list" autocomplete="off" placeholder="За бажанням" value="' + esc(r.merchant) + '"></label></div>' +
      '<datalist id="note-list">' + F.noteSuggestions().map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist>' +
      '<div class="split-list" id="split-list">' + rows.join('') + '</div>' +
      '<div class="split-sum" id="split-sum" aria-live="polite"></div><p class="note bad" id="split-err" role="alert" hidden></p>' +
      '<button class="btn" type="submit" id="split-save">Записати</button><button type="button" class="btn alt" data-act="split-one">Записати одним платежем</button></form>';
    openSheet(html); updateSplit();
  }
  function splitRows() {
    return $$('#split-list .split-row').map(function (row) {
      var i = $('input', row), s = $('select.cat', row), sb = $('select.sub', row);
      if (sb.getAttribute('data-cat') !== s.value) { sb.setAttribute('data-cat', s.value); sb.innerHTML = subOptions(s.value, ''); }
      sb.hidden = !F.subsOf(s.value).length; if (sb.hidden) sb.value = '';
      return { raw: i.value, amount: F.parseAmount(i.value), category: s.value, sub: sb.value, name: $('.sname', row).textContent };
    });
  }
  function updateSplit() {
    var box = $('#split-sum'); if (!box || !splitCtx) return; var rows = splitRows();
    var bad = rows.some(function (x) { return x.amount == null; }); var by = {}, order = [], total = 0;
    rows.forEach(function (x) { if (x.amount == null) return; total += x.amount; var k = x.category + '|' + x.sub; if (!(k in by)) { by[k] = 0; order.push(k); } by[k] += x.amount; });
    total = F.round2(total);
    var h = order.length ? '<ul class="ledger">' + order.map(function (k) { var pr = k.split('|'); var c = F.catById(pr[0]); var sb = F.subsOf(pr[0]).filter(function (x) { return x.id === pr[1]; })[0]; return '<li><span class="lrow"><span class="name">' + catDot(c) + '<b>' + esc(c.name + (sb ? ' · ' + sb.name : '')) + '</b></span><span class="lead"></span><span class="val num">' + money(F.round2(by[k])) + '</span></span></li>'; }).join('') + '</ul>' : '<p class="hint">Усі позиції прибрано.</p>';
    h += '<p class="lrow" style="padding-top:8px"><span class="name"><b>Разом</b></span><span class="lead"></span><span class="val num">' + money(total) + '</span></p>';
    if (bad) h += '<p class="status bad">' + ic('alert', 'sm') + 'У деяких рядках сума не число більше нуля.</p>';
    else if (Math.abs(total - splitCtx.total) > 0.009) h += '<p class="status' + (total > splitCtx.total ? ' bad' : '') + '">' + (total > splitCtx.total ? ic('alert', 'sm') : '') + 'На чеку ' + money(splitCtx.total) + (total > splitCtx.total ? '. Можливо, не враховано знижку.' : '.') + '</p>';
    box.innerHTML = h;
    var n = order.length; var b = $('#split-save'); if (b) { b.textContent = n ? 'Записати ' + n + ' ' + plural(n, 'витрату', 'витрати', 'витрат') : 'Записати'; b.disabled = !n; }
  }
  function submitSplit() {
    var rows = splitRows(); var res = F.addSplit({ date: $('#sp-date').value, note: $('#sp-note').value, rows: rows.map(function (x) { return { category: x.category, sub: x.sub, amount: x.raw }; }) });
    if (res.error) return showErr('split-err', res.error);
    var sum = F.round2(res.txs.reduce(function (t, x) { return t + x.amount; }, 0)); var n = res.txs.length; splitCtx = null;
    closeSheet(); render(); toast('Записано ' + n + ' ' + plural(n, 'витрату', 'витрати', 'витрат') + ' на ' + money(sum), 'Скасувати', function () { res.txs.forEach(function (t) { F.setDeleted(t.id, true); }); render(); }, 7000);
  }
  async function doScan(file) {
    var btn = $('#tx-scan'); var note = $('#tx-scan-note'); if (!btn || !file) return;
    btn.disabled = true; btn.lastChild.textContent = 'Читаю чек…'; note.className = 'note'; note.textContent = 'Це триває кілька секунд.';
    try {
      var formDate = $('#tx-date') ? $('#tx-date').value : ''; var r = await F.scanReceipt(file); var parts = [];
      if (shouldSplit(r)) { openSplit(r, formDate); return; }
      if (r.total) { $('#tx-amount').value = String(r.total).replace('.', ','); parts.push('суму'); }
      if (r.date) { $('#tx-date').value = r.date; parts.push('дату'); }
      var radio = $('#cat-' + r.category); if (radio) { radio.checked = true; syncSub(); parts.push('категорію'); }
      if (r.merchant && !$('#tx-note').value.trim()) { $('#tx-note').value = r.merchant; parts.push('магазин'); }
      if (!r.total) { note.className = 'note bad'; note.textContent = 'Суму на чеку не видно. Введіть її вручну або сфотографуйте ще раз.'; }
      else {
        var c = CUR_MAP[r.currency.toUpperCase()] || r.currency; var warn = c && c !== cur() ? ' На чеку валюта ' + c + ', а в додатку ' + cur() + ': перевірте суму.' : '';
        note.className = 'note' + (warn ? ' bad' : ''); note.textContent = 'Підставлено: ' + parts.join(', ') + '. Перевірте суму перед збереженням.' + warn;
      }
    } catch (e) {
      note.className = 'note bad'; note.textContent = F.describeGeminiError(e);
      if (e && e.code === 'NO_KEY') { note.innerHTML = esc(F.describeGeminiError(e)) + ' <button type="button" class="btn-text" data-act="key" style="min-height:32px">Додати ключ</button>'; }
    } finally { btn.disabled = false; btn.lastChild.textContent = 'Сфотографувати чек'; var fi = $('#tx-file'); if (fi) fi.value = ''; }
  }

  // --- Бюджет і категорії ---
  function openBudget(keep) {
    var S = F.state; var cats = S.cfg.categories;
    var html = sheetTop('Бюджет і категорії', 'Зміни зберігаються одразу й з’являються в усієї родини.') +
      '<label class="field"><span>Бюджет на місяць, ' + esc(cur()) + '</span><input class="in" id="bud-total" inputmode="decimal" placeholder="Наприклад, 30000" value="' + (S.cfg.budget ? esc(String(S.cfg.budget).replace('.', ',')) : '') + '" data-change="budget"></label>' +
      '<p class="note">Без загального бюджету ми візьмемо суму лімітів нижче.</p>' +
      '<label class="field"><span>Бюджет на ' + esc(monthName(curYm)) + ', якщо він інший</span><input class="in" id="bud-month" inputmode="decimal" placeholder="Такий самий, як звичайний" value="' + (S.cfg.budgets[curYm] ? esc(String(S.cfg.budgets[curYm]).replace('.', ',')) : '') + '" data-change="month-budget"></label>' +
      '<p class="note">Для місяців із відпусткою чи святами. Інші місяці лишаються зі звичайним бюджетом.</p>' +
      '<h3 style="margin-top:20px;font-size:16px">Категорії та ліміти на місяць</h3>' +
      cats.map(function (c) {
        return '<div class="edit-row">' + '<label class="sr" for="cn-' + esc(c.id) + '">Назва</label><input class="in" id="cn-' + esc(c.id) + '" maxlength="30" value="' + esc(c.name) + '" data-change="cat-name" data-id="' + esc(c.id) + '">' +
          '<label class="sr" for="cl-' + esc(c.id) + '">Ліміт</label><input class="in" id="cl-' + esc(c.id) + '" inputmode="decimal" placeholder="Ліміт" value="' + (c.limit ? esc(String(c.limit).replace('.', ',')) : '') + '" data-change="cat-limit" data-id="' + esc(c.id) + '">' +
          '<button class="ibtn" data-act="cat-del" data-id="' + esc(c.id) + '" aria-label="Видалити категорію ' + esc(c.name) + '">' + ic('trash') + '</button>' +
          '<button type="button" class="subline" data-act="subs" data-id="' + esc(c.id) + '" data-from="budget" aria-label="Види категорії ' + esc(c.name) + '"><span>' + (c.subs && c.subs.length ? 'Види: ' + c.subs.length + '. ' + esc(c.subs.map(function (x) { return x.name; }).join(', ')) : 'Додати види') + '</span>' + ic('right', 'sm') + '</button></div>';
      }).join('') +
      '<p class="note">Ще є «Інше»: вона завжди залишається. У ній можна вести власні види, щоб бачити, що саме це було.</p>' +
      '<div class="edit-row" style="grid-template-columns:1fr"><button type="button" class="subline" data-act="subs" data-id="other" data-from="budget" aria-label="Види категорії Інше"><span>' + (F.subsOf('other').length ? 'Інше. Види: ' + F.subsOf('other').length + '. ' + esc(F.subsOf('other').map(function (x) { return x.name; }).join(', ')) : 'Інше. Додати види') + '</span>' + ic('right', 'sm') + '</button></div>' +
      '<h3 style="margin-top:20px;font-size:16px">Ліміти на людину на місяць</h3><p class="note" style="margin-top:2px">Наприклад, кишенькові гроші. Порожнє поле означає без ліміту.</p>' +
      F.members().map(function (n, k) { return '<label class="field" style="margin-top:10px"><span>' + esc(n) + '</span><input class="in" inputmode="decimal" placeholder="Без ліміту" value="' + (S.cfg.memberLimits[n] ? esc(String(S.cfg.memberLimits[n]).replace('.', ',')) : '') + '" data-change="member-limit" data-name="' + esc(n) + '"></label>'; }).join('') +
      (cats.length < F.MAX_COLORED ? '<form data-form="cat-add" class="edit-row" style="grid-template-columns:1fr auto"><label class="sr" for="cat-new">Нова категорія</label><input class="in" id="cat-new" maxlength="30" placeholder="Нова категорія"><button class="btn sm" type="submit">Додати</button></form>' : '<p class="note">Досягнуто межі в ' + F.MAX_COLORED + ' категорій.</p>') +
      '<button class="btn" data-act="close">Готово</button>';
    openSheet(html, { keepScroll: keep });
  }

  // --- Види категорії ---
  function openSubs(catId, from, keep) {
    var c = catId === 'other' ? { id: 'other', name: 'Інше', subs: F.subsOf('other') } : F.state.cfg.categories.filter(function (x) { return x.id === catId; })[0]; if (!c) return;
    var subs = c.subs || [];
    var html = sheetTop('Види: ' + c.name, 'Допомагають бачити, на що саме йдуть гроші в категорії. Зміни зберігаються одразу й з’являються в усієї родини.') +
      (subs.length ? subs.map(function (x) {
        return '<div class="edit-row sub-edit"><label class="sr" for="sn-' + esc(x.id) + '">Назва виду</label><input class="in" id="sn-' + esc(x.id) + '" maxlength="30" value="' + esc(x.name) + '" data-change="sub-name" data-id="' + esc(c.id) + '" data-s="' + esc(x.id) + '">' +
          '<button class="ibtn" data-act="sub-del" data-id="' + esc(c.id) + '" data-s="' + esc(x.id) + '" data-from="' + esc(from || '') + '" aria-label="Видалити вид ' + esc(x.name) + '">' + ic('trash') + '</button></div>';
      }).join('') : '<p class="hint">Видів ще немає. Додайте перший, і він з’явиться у формі витрати.</p>') +
      '<p class="note">Видалений вид не стирає записи: вони лишаються в категорії без уточнення виду.</p>' +
      (subs.length < F.MAX_SUBS ? '<form data-form="sub-add" data-id="' + esc(c.id) + '" data-from="' + esc(from || '') + '" class="edit-row sub-edit"><label class="sr" for="sub-new">Новий вид</label><input class="in" id="sub-new" maxlength="30" autocomplete="off" placeholder="Новий вид"><button class="btn sm" type="submit">Додати</button></form>' : '<p class="note">Досягнуто ліміт: ' + F.MAX_SUBS + ' видів у категорії.</p>') +
      '<button class="btn" data-act="subs-done" data-from="' + esc(from || '') + '">Готово</button>';
    openSheet(html, { keepScroll: keep });
  }

  // --- Регулярні платежі ---
  function recText(r) {
    return money(r.amount) + ' щомісяця, ' + r.day + '-го числа, ' + F.catById(r.category).name;
  }
  function openRecurring(editId, keep) {
    var S = F.state; var e = editId ? S.cfg.recurring.filter(function (r) { return r.id === editId; })[0] : null;
    var html = sheetTop('Регулярні платежі', 'Оренда, інтернет, підписки: витрата з’являється сама в день платежу.') +
      (S.cfg.recurring.length ? S.cfg.recurring.map(function (r) {
        return '<div class="rec-row"><div class="lrow"><span class="name">' + catDot(F.catById(r.category)) + '<b>' + esc(r.name) + '</b></span></div><p class="note" style="margin-top:2px">' + esc(recText(r)) + (r.active ? '' : '. Вимкнено') + '</p><div class="acts"><button class="btn alt sm" data-act="rec-edit" data-id="' + esc(r.id) + '">Змінити</button><button class="btn alt sm" data-act="rec-toggle" data-id="' + esc(r.id) + '">' + (r.active ? 'Вимкнути' : 'Увімкнути') + '</button><button class="btn alt sm" data-act="rec-del" data-id="' + esc(r.id) + '" aria-label="Видалити платіж ' + esc(r.name) + '">' + ic('trash', 'sm') + '</button></div></div>';
      }).join('') : '<p class="hint">Платежів ще немає.</p>') +
      '<form data-form="rec" data-id="' + esc(editId || '') + '" novalidate><h3 style="margin-top:22px;font-size:16px">' + (e ? 'Змінити платіж' : 'Новий платіж') + '</h3>' +
      '<label class="field"><span>Назва</span><input class="in" id="rec-name" maxlength="40" placeholder="Наприклад, Інтернет" value="' + esc(e ? e.name : '') + '"></label>' +
      '<div class="row2"><label class="field"><span>Сума, ' + esc(cur()) + '</span><input class="in" id="rec-amount" inputmode="decimal" value="' + (e ? esc(String(e.amount).replace('.', ',')) : '') + '"></label>' +
      '<label class="field"><span>День місяця</span><input class="in" id="rec-day" inputmode="numeric" maxlength="2" placeholder="1-31" value="' + (e ? e.day : '') + '"></label></div>' +
      '<label class="field"><span>Категорія</span><select class="in" id="rec-cat">' + F.categories().map(function (c) { return '<option value="' + esc(c.id) + '"' + ((e ? e.category : 'home') === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select></label>' +
      '<p class="note bad" id="rec-err" role="alert" hidden></p>' +
      '<p class="note">' + (e ? 'Зміни діють з наступних платежів, уже записані місяці не змінюються.' : 'Якщо день більший, ніж у місяці днів (наприклад, 31 у квітні), платіж піде в останній день місяця.') + '</p>' +
      '<button class="btn" type="submit">' + (e ? 'Зберегти зміни' : 'Додати платіж') + '</button>' + (e ? '<button type="button" class="btn alt" data-act="rec-cancel">Скасувати зміни</button>' : '') + '</form>';
    openSheet(html, { keepScroll: keep });
  }

  // --- Підключення ---
  // --- Цілі накопичень ---
  function openGoals(editId, keep) {
    var cfg = F.state.cfg; var e = editId ? F.goalById(editId) : null; var today = F.todayStr();
    var html = sheetTop('Цілі накопичень', 'Відкладайте гроші на відпустку, резерв чи велику покупку. Внески бачить уся родина.') +
      (cfg.goals.length ? cfg.goals.map(function (g) {
        var i = F.goalInfo(g, today);
        return '<div class="rec-row"><div class="lrow"><span class="name"><i class="dot sav" aria-hidden="true"></i><b>' + esc(g.name) + '</b></span><span class="lead"></span><span class="val num">' + money(i.saved, true) + ' <small>із ' + money(g.target) + '</small></span></div><span class="meter" role="img" aria-label="Зібрано ' + i.pct + '%" style="margin-top:8px"><i style="width:' + i.pct + '%"></i></span>' + goalStatus(i) +
          '<div class="acts"><button class="btn alt sm" data-act="goal-move" data-id="' + esc(g.id) + '" data-s="1">' + ic('plus', 'sm') + 'Внесок</button><button class="btn alt sm" data-act="goal-move" data-id="' + esc(g.id) + '" data-s="-1">Зняти</button><button class="btn alt sm" data-act="goal-edit" data-id="' + esc(g.id) + '">Змінити</button></div></div>';
      }).join('') : '<p class="hint">Цілей ще немає.</p>') +
      '<form data-form="goal" data-id="' + esc(editId || '') + '" novalidate><h3 style="margin-top:22px;font-size:16px">' + (e ? 'Змінити ціль' : 'Нова ціль') + '</h3>' +
      '<label class="field"><span>Назва</span><input class="in" id="g-name" maxlength="40" placeholder="Наприклад, Відпустка" value="' + esc(e ? e.name : '') + '"></label>' +
      '<div class="row2"><label class="field"><span>Скільки потрібно, ' + esc(cur()) + '</span><input class="in" id="g-target" inputmode="decimal" value="' + (e ? esc(String(e.target).replace('.', ',')) : '') + '"></label>' +
      '<label class="field"><span>До якого місяця</span><input class="in" type="month" id="g-deadline" value="' + esc(e ? e.deadline : '') + '"></label></div>' +
      '<p class="note bad" id="g-err" role="alert" hidden></p><p class="note">Термін необов’язковий. З ним додаток підкаже, скільки відкладати щомісяця.</p>' +
      '<button class="btn" type="submit">' + (e ? 'Зберегти зміни' : 'Додати ціль') + '</button>' + (e ? '<button type="button" class="btn alt" data-act="goal-cancel">Скасувати зміни</button><button type="button" class="btn danger" data-act="goal-del" data-id="' + esc(e.id) + '">' + ic('trash', 'sm') + 'Видалити ціль</button>' : '') + '</form>';
    openSheet(html, { keepScroll: keep });
  }
  function openGoalMove(id, sign) {
    var g = F.goalById(id); if (!g) return;
    var html = '<form data-form="goal-move" data-id="' + esc(id) + '" data-s="' + sign + '" novalidate>' + sheetTop(sign > 0 ? 'Внесок: ' + g.name : 'Зняти з цілі: ' + g.name) +
      '<div class="amount-wrap"><input class="amount-in" id="gm-amount" inputmode="decimal" autocomplete="off" placeholder="0" aria-label="Сума"><span class="cur">' + esc(cur()) + '</span></div><p class="note bad" id="gm-err" role="alert" hidden></p>' +
      '<div class="row2"><label class="field"><span>Дата</span><input class="in" type="date" id="gm-date" value="' + esc(F.todayStr()) + '"></label><label class="field"><span>Нотатка</span><input class="in" id="gm-note" maxlength="200" placeholder="За бажанням"></label></div>' +
      '<button class="btn" type="submit">' + (sign > 0 ? 'Додати внесок' : 'Зняти') + '</button></form>';
    openSheet(html, { focus: '#gm-amount' });
  }

  // --- Кредити та картки ---
  function openLoans(editId, keep) {
    var e = editId ? F.loanById(editId) : null; var sm = F.loansSummary(F.todayStr());
    var html = sheetTop('Кредити та картки', 'Скільки ще лишилось виплатити, коли це закінчиться і скільки піде на відсотки. Розрахунок орієнтовний: відсотки нараховуються щомісяця на залишок.') +
      (sm.items.length ? '<p class="lrow" style="padding:14px 0 0"><span class="name"><b>Усього боргу</b></span><span class="lead"></span><span class="val num">' + money(sm.total) + '</span></p>' + sm.items.map(function (x) {
        var l = x.loan, i = x.info; var paid = l.start > 0 ? Math.max(0, Math.min(100, Math.round((l.start - i.balanceNow) / l.start * 100))) : 0;
        return '<div class="rec-row"><div class="lrow"><span class="name">' + catDot(F.catById(l.kind === 'card' ? 'cards' : 'loans')) + '<b>' + esc(l.name) + '</b></span><span class="lead"></span><span class="val num">' + money(i.balanceNow) + '</span></div><span class="meter" role="img" aria-label="Виплачено ' + paid + '%" style="margin-top:8px"><i style="width:' + paid + '%"></i></span>' + loanStatus(i) +
          '<p class="note" style="margin-top:4px">' + (l.payment > 0 ? 'Платіж ' + money(l.payment) + ' щомісяця, ' + l.day + '-го числа' : 'Платіж не вказано') + (l.rate > 0 ? ', ' + String(l.rate).replace('.', ',') + '% річних' : '') + (l.recId ? '. Записується автоматично' : '') + '</p>' +
          '<div class="acts"><button class="btn alt sm" data-act="loan-bal" data-id="' + esc(l.id) + '">Оновити залишок</button><button class="btn alt sm" data-act="loan-edit" data-id="' + esc(l.id) + '">Змінити</button></div></div>';
      }).join('') : '<p class="hint">Кредитів ще немає.</p>') +
      '<form data-form="loan" data-id="' + esc(editId || '') + '" novalidate><h3 style="margin-top:22px;font-size:16px">' + (e ? 'Змінити' : 'Додати кредит або картку') + '</h3>' +
      '<label class="field"><span>Назва</span><input class="in" id="l-name" maxlength="40" placeholder="Наприклад, Іпотека або Картка Моно" value="' + esc(e ? e.name : '') + '"></label>' +
      '<label class="field"><span>Що це</span><select class="in" id="l-kind"><option value="loan"' + (e && e.kind === 'card' ? '' : ' selected') + '>Кредит</option><option value="card"' + (e && e.kind === 'card' ? ' selected' : '') + '>Кредит на картці</option></select></label>' +
      '<div class="row2"><label class="field"><span>Лишилось виплатити, ' + esc(cur()) + '</span><input class="in" id="l-balance" inputmode="decimal" value="' + (e ? esc(String(F.loanInfo(e, F.todayStr()).balanceNow).replace('.', ',')) : '') + '"></label>' +
      '<label class="field"><span>Відсотки річних</span><input class="in" id="l-rate" inputmode="decimal" placeholder="Необов’язково" value="' + (e && e.rate ? esc(String(e.rate).replace('.', ',')) : '') + '"></label></div>' +
      '<div class="row2"><label class="field"><span>Платіж на місяць</span><input class="in" id="l-pay" inputmode="decimal" value="' + (e && e.payment ? esc(String(e.payment).replace('.', ',')) : '') + '"></label>' +
      '<label class="field"><span>День платежу</span><input class="in" id="l-day" inputmode="numeric" maxlength="2" placeholder="1-31" value="' + (e ? e.day : '') + '"></label></div>' +
      (e ? '' : '<label class="switch"><input type="checkbox" id="l-auto" checked><span>Записувати платіж автоматично кожного місяця</span></label>') +
      '<p class="note bad" id="l-err" role="alert" hidden></p>' +
      '<button class="btn" type="submit">' + (e ? 'Зберегти зміни' : 'Додати') + '</button>' + (e ? '<button type="button" class="btn alt" data-act="loan-cancel">Скасувати зміни</button><button type="button" class="btn danger" data-act="loan-del" data-id="' + esc(e.id) + '">' + ic('trash', 'sm') + 'Видалити</button>' : '') + '</form>';
    openSheet(html, { keepScroll: keep });
  }
  function openLoanBalance(id) {
    var l = F.loanById(id); if (!l) return;
    var html = '<form data-form="loan-bal" data-id="' + esc(id) + '" novalidate>' + sheetTop('Оновити залишок: ' + l.name, 'Введіть, скільки лишилось виплатити за останньою випискою. Розрахунок піде від сьогодні.') +
      '<label class="field"><span>Лишилось виплатити, ' + esc(cur()) + '</span><input class="in" id="lb-val" inputmode="decimal" value="' + esc(String(F.loanInfo(l, F.todayStr()).balanceNow).replace('.', ',')) + '"></label>' +
      '<p class="note bad" id="lb-err" role="alert" hidden></p><button class="btn" type="submit">Зберегти</button></form>';
    openSheet(html, { focus: '#lb-val' });
  }

  // --- Магазини й гуртки ---
  var TAG_TEXT = {
    shops: { title: 'Магазини', sub: 'Їх видно у формі витрати як кнопки, а у звітах витрати групуються за магазином. Магазин записується на початку нотатки.', ph: 'Назва магазину', empty: 'Магазинів ще немає.', del: 'Видалити магазин ' },
    clubs: { title: 'Гуртки', sub: 'Назви гуртків дитини. Їх видно у формі витрати як кнопки, а у звітах видно, скільки йде на кожен. Назва записується на початку нотатки, а категорія ставиться «Діти».', ph: 'Наприклад, Футбол', empty: 'Гуртків ще немає. Додайте перший нижче.', del: 'Видалити гурток ' }
  };
  function openTags(kind, keep) {
    var names = F.state.cfg[kind]; var T = TAG_TEXT[kind];
    var html = sheetTop(T.title, T.sub) +
      (names.length ? '<ul class="ledger">' + names.map(function (n) {
        return '<li class="shop-row"><span class="lrow"><span class="name"><b>' + esc(n) + '</b></span></span><button class="ibtn" data-act="shop-del" data-k="' + kind + '" data-s="' + esc(n) + '" aria-label="' + T.del + esc(n) + '">' + ic('trash') + '</button></li>';
      }).join('') + '</ul>' : '<p class="hint">' + T.empty + '</p>') +
      '<form data-form="shop-add" data-k="' + kind + '" class="edit-row" style="grid-template-columns:1fr auto;margin-top:12px"><label class="sr" for="shop-new">' + esc(T.ph) + '</label><input class="in" id="shop-new" maxlength="30" autocomplete="off" placeholder="' + esc(T.ph) + '"><button class="btn sm" type="submit">Додати</button></form>' +
      '<p class="note bad" id="shop-err" role="alert" hidden></p>';
    openSheet(html, { keepScroll: keep, focus: names.length ? null : '#shop-new' });
  }

  // --- PIN-код ---
  function openPin() {
    var has = F.hasPin();
    var inp = function (id, label) { return '<label class="field"><span>' + label + '</span><input class="in pin-in" id="' + id + '" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" autocomplete="off"></label>'; };
    var html = sheetTop('PIN-код', 'Закриває додаток від сторонніх, коли ви віддаєте телефон. Діє лише на цьому телефоні.') +
      (has ? '<form data-form="pin-change" novalidate>' + inp('pin-cur', 'Поточний PIN') + inp('pin-new', 'Новий PIN із 4 цифр') + '<p class="note bad" id="pin-err" role="alert" hidden></p><button class="btn" type="submit">Змінити PIN</button></form>' +
        '<form data-form="pin-off" novalidate style="margin-top:8px">' + inp('pin-off-cur', 'Щоб вимкнути, введіть поточний PIN') + '<p class="note bad" id="pin-off-err" role="alert" hidden></p><button class="btn danger" type="submit">Вимкнути PIN</button></form>'
        : '<form data-form="pin-set" novalidate>' + inp('pin-new', 'Придумайте PIN із 4 цифр') + inp('pin-rep', 'Повторіть PIN') + '<p class="note bad" id="pin-err" role="alert" hidden></p><button class="btn" type="submit">Увімкнути PIN</button></form>') +
      '<p class="note">PIN лише ховає екран: дані на телефоні не шифруються. Якщо забудете PIN, видаліть іконку додатка з екрана й додайте знову. Якщо підключена спільна таблиця, дані повернуться з неї.</p>';
    openSheet(html, { focus: has ? '#pin-cur' : '#pin-new' });
  }
  var lockEl = null, pinBuf = '', pinFails = 0, lockedUntil = 0, hiddenAt = 0;
  function showLock() {
    if (!F.hasPin() || lockEl) return;
    lockEl = document.createElement('div'); lockEl.id = 'lock'; lockEl.setAttribute('role', 'dialog'); lockEl.setAttribute('aria-modal', 'true'); lockEl.setAttribute('aria-label', 'Введіть PIN');
    document.body.appendChild(lockEl); document.body.classList.add('lock'); pinBuf = ''; drawLock('');
  }
  function drawLock(msg, info) {
    if (!lockEl) return;
    var keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
    lockEl.innerHTML = '<div class="lock-in"><h2>Введіть PIN</h2><div class="dots" aria-hidden="true">' + [0, 1, 2, 3].map(function (n) { return '<i class="' + (n < pinBuf.length ? 'on' : '') + '"></i>'; }).join('') + '</div>' +
      '<p class="note' + (msg && !info ? ' bad' : '') + '" role="alert" style="min-height:40px">' + esc(msg || '') + '</p><div class="keypad">' + keys.map(function (k) {
        return k === '' ? '<span></span>' : '<button data-act="pin-key" data-k="' + k + '" aria-label="' + (k === 'del' ? 'Стерти' : k) + '">' + (k === 'del' ? ic('left') : k) + '</button>';
      }).join('') + '</div><button class="btn-text" data-act="pin-forgot" style="margin-top:8px">Забули PIN?</button></div>';
  }
  function pinKey(k) {
    if (!lockEl) return;
    if (Date.now() < lockedUntil) return drawLock('Забагато спроб. Зачекайте пів хвилини.');
    if (k === 'del') pinBuf = pinBuf.slice(0, -1); else if (pinBuf.length < 4) pinBuf += k;
    drawLock('');
    if (pinBuf.length === 4) {
      var tried = pinBuf;
      F.checkPin(tried).then(function (ok) {
        if (ok) { lockEl.remove(); lockEl = null; pinFails = 0; if (!$('.back')) document.body.classList.remove('lock'); render(); return; }
        pinBuf = ''; pinFails++;
        if (pinFails >= 5) { pinFails = 0; lockedUntil = Date.now() + 30000; drawLock('Забагато спроб. Зачекайте пів хвилини.'); } else drawLock('Невірний PIN. Спробуйте ще раз.');
      });
    }
  }

  // --- Масова зміна категорії ---
  function openBulk() {
    var ids = F.search(query, listKind).map(function (t) { return t.id; }); if (!ids.length) return;
    var html = sheetTop('Змінити категорію', 'Для ' + ids.length + ' ' + plural(ids.length, 'знайденої витрати', 'знайдених витрат', 'знайдених витрат') + '. Їх можна повернути кнопкою «Скасувати».') +
      '<div class="catgrid" style="margin-top:14px">' + F.categories().map(function (c) { return '<button type="button" class="chip" data-act="bulk-do" data-c="' + esc(c.id) + '">' + catDot(c) + esc(c.name) + '</button>'; }).join('') + '</div>';
    openSheet(html);
  }
  function refreshList() { var b = $('#list-body'); if (b) b.innerHTML = listBody(); }

  function openConnect(prefill) {
    prefill = prefill || {};
    var html = '<form data-form="connect" novalidate>' + sheetTop('Підключити сім’ю', 'Потрібні адреса веб-додатка й код із вашої Google Таблиці. Їх дає той, хто її створював. Найпростіше відкрити посилання-запрошення.') +
      '<label class="field"><span>Ваше ім’я</span><input class="in" id="c-name" maxlength="40" autocomplete="given-name" value="' + esc(prefill.name || F.state.me.name) + '"></label>' +
      '<label class="field"><span>Адреса веб-додатка</span><input class="in" id="c-url" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="https://script.google.com/macros/s/.../exec" value="' + esc(prefill.url || '') + '"></label>' +
      '<label class="field"><span>Код сім’ї</span><input class="in" id="c-code" autocapitalize="off" autocorrect="off" value="' + esc(prefill.code || '') + '"></label>' +
      '<p class="note bad" id="c-err" role="alert" hidden></p>' +
      '<button class="btn" type="submit" id="c-go">Підключити</button></form>';
    openSheet(html, { focus: '#c-name' });
  }
  async function submitConnect() {
    var btn = $('#c-go'); btn.disabled = true; btn.textContent = 'Підключаю…'; showErr('c-err', '');
    var name = $('#c-name').value.trim();
    if (!name) { btn.disabled = false; btn.textContent = 'Підключити'; return showErr('c-err', 'Введіть ім’я, щоб родина бачила, хто що витратив.'); }
    var r = await F.connect($('#c-url').value, $('#c-code').value, name);
    if (r.error) { btn.disabled = false; btn.textContent = 'Підключити'; return showErr('c-err', r.error); }
    F.finishOnboarding(); closeSheet(); render(); toast('Підключено. Витрати родини завантажено.');
  }
  function openJoin(inv) {
    var html = '<form data-form="join" data-url="' + esc(inv.url) + '" data-code="' + esc(inv.code) + '" novalidate>' + sheetTop('Підключитися до родини?', 'Вас запросили вести спільні витрати. Усі записи будуть бачити всі, хто має це посилання.', false) +
      '<label class="field"><span>Як вас записати?</span><input class="in" id="j-name" maxlength="40" autocomplete="given-name" value="' + esc(F.state.me.name) + '"></label>' +
      '<p class="note bad" id="j-err" role="alert" hidden></p>' +
      '<button class="btn" type="submit" id="j-go">Підключитися</button><button type="button" class="btn alt" data-act="close">Не зараз</button></form>';
    openSheet(html, { focus: '#j-name' });
  }
  async function submitJoin(form) {
    var name = $('#j-name').value.trim(); if (!name) return showErr('j-err', 'Введіть ім’я.');
    var b = $('#j-go'); b.disabled = true; b.textContent = 'Підключаю…';
    var r = await F.connect(attr(form, 'url'), attr(form, 'code'), name);
    if (r.error) { b.disabled = false; b.textContent = 'Підключитися'; return showErr('j-err', r.error); }
    F.finishOnboarding(); closeSheet(); render(); toast('Підключено. Витрати родини завантажено.');
  }
  function openInvite() {
    var link = F.makeInvite(location.origin + location.pathname);
    var html = sheetTop('Запросити родину', 'Надішліть це посилання в приватний чат. Воно відкриє додаток і підключить до спільної таблиці.') +
      '<div class="linkbox" id="inv-link">' + esc(link) + '</div>' +
      '<p class="note bad">Посилання містить код доступу до ваших витрат. Не публікуйте його в групах і соцмережах.</p>' +
      '<button class="btn" data-act="inv-share" data-link="' + esc(link) + '">' + ic('share') + (navigator.share ? 'Поділитися' : 'Скопіювати посилання') + '</button>';
    openSheet(html);
  }
  function openOnboarding() {
    var html = '<form data-form="onboard" novalidate>' + sheetTop('Сімейний бюджет', 'Записуйте витрати за кілька секунд і бачте, скільки ще можна витратити. Для початку скажіть, як вас записувати.', false) +
      '<label class="field"><span>Ваше ім’я</span><input class="in" id="o-name" maxlength="40" autocomplete="given-name" placeholder="Наприклад, Максим"></label>' +
      '<p class="note">Так родина бачитиме, хто що витратив.</p><p class="note bad" id="o-err" role="alert" hidden></p>' +
      '<button class="btn" type="submit">Почати</button><button type="button" class="btn alt" data-act="onboard-join">У мене є дані для підключення</button></form>';
    openSheet(html, { lock: true, focus: '#o-name' });
  }
  function openKey() {
    var src = F.keySource();
    var html = '<form data-form="key" novalidate>' + sheetTop('Ключ Gemini', 'Потрібен лише для розпізнавання чеків по фото. Без нього все інше працює.') +
      (src === 'nutriplan' ? '<p class="note">Зараз використовується ключ, який ви додали в NutriPlan. Можна лишити так.</p>' : '') +
      '<label class="field"><span>Ключ API</span><input class="in" id="k-val" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Вставте ключ" value="' + esc(F.state.me.geminiKey) + '"></label>' +
      '<p class="note">Ключ зберігається лише на цьому телефоні. Безкоштовний ліміт Google дозволяє їм використовувати надіслані фото для покращення продуктів, тому не знімайте чеки з особистими даними.</p>' +
      '<button class="btn" type="submit">Зберегти</button>' + (F.keySource() !== 'none' ? '<button type="button" class="btn alt" data-act="key-test">Перевірити ключ</button><div class="note" id="k-test" role="status" aria-live="polite" hidden></div>' : '') + (F.state.me.geminiKey ? '<button type="button" class="btn danger" data-act="key-del">Видалити ключ</button>' : '') + '</form>';
    openSheet(html, { focus: '#k-val' });
  }

  // --- ШІ-аналіз ---
  var aiBusy = false;
  var AI_CHIPS = [
    ['Куди йдуть гроші?', 'Куди найбільше йдуть гроші цього місяця і що з цього не обов’язкове?'],
    ['Де заощадити?', 'Де в моїх витратах найреальніше заощадити і скільки приблизно це дасть на місяць?'],
    ['Чи вкладемось у бюджет?', 'Чи вкладемось ми цього місяця в бюджет? Зроби прогноз до кінця місяця.'],
    ['Порівняй з минулим місяцем', 'Порівняй цей місяць з попереднім: що зросло, що зменшилось і чому це важливо.'],
    ['Магазини й гуртки', 'Розбери витрати за магазинами та гуртками, якщо вони є: де йде найбільше.']
  ];
  function aiHtml(text) {
    var html = '', list = false;
    String(text).replace(/\r/g, '').split('\n').forEach(function (raw) {
      var line = raw.trim().replace(/^#+\s*/, ''); if (!line) { if (list) { html += '</ul>'; list = false; } return; }
      var m = /^[-*•]\s+(.*)$/.exec(line);
      var body = esc(m ? m[1] : line).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
      if (m) { if (!list) { html += '<ul>'; list = true; } html += '<li>' + body + '</li>'; }
      else { if (list) { html += '</ul>'; list = false; } html += '<p>' + body + '</p>'; }
    });
    return html + (list ? '</ul>' : '');
  }
  function setAiBusy(on) { $$('[data-act=ai-ask], form[data-form=ai] button[type=submit]').forEach(function (b) { b.disabled = on; }); }
  function runAI(q) {
    var out = $('#ai-out'); if (!out || aiBusy) return;
    aiBusy = true; setAiBusy(true); out.hidden = false; out.className = 'ai-out'; out.textContent = 'Аналізую… це може зайняти до пів хвилини.';
    F.askAI(q, ym).then(function (text) {
      if (!document.body.contains(out)) return;
      out.innerHTML = aiHtml(text) + '<p class="ai-note">Це підказки на основі ваших записів, а не фінансова порада.</p>';
    }, function (e) {
      if (!document.body.contains(out)) return;
      out.className = 'ai-out bad';
      out.textContent = e && (e.code || e.status) ? F.describeGeminiError(e) : 'Не вдалося отримати аналіз. Спробуйте ще раз.';
    }).then(function () { aiBusy = false; setAiBusy(false); });
  }
  function openAI() {
    aiBusy = false;
    var html = '<form data-form="ai" novalidate>' + sheetTop('ШІ-аналіз', cap(monthName(ym)) + ' ' + ym.slice(0, 4) + ' і попередні місяці для порівняння.');
    if (F.keySource() === 'none') {
      html += '<p class="note">Для аналізу потрібен ключ Gemini, такий самий, як для розпізнавання чеків.</p><button type="button" class="btn" data-act="key">Додати ключ</button></form>';
    } else {
      html += '<button type="button" class="btn" data-act="ai-ask" data-q="">' + ic('sparkle') + ' Зробити аналіз</button>' +
        '<div class="chips ai-chips" role="group" aria-label="Готові питання">' + AI_CHIPS.map(function (c) { return '<button type="button" class="chip" data-act="ai-ask" data-q="' + esc(c[1]) + '">' + esc(c[0]) + '</button>'; }).join('') + '</div>' +
        '<label class="field"><span>Своє питання</span><input class="in" id="ai-q" maxlength="300" autocomplete="off" placeholder="Наприклад: скільки на Кубиху?"></label>' +
        '<button class="btn alt" type="submit">Запитати</button>' +
        '<div class="ai-out" id="ai-out" role="status" aria-live="polite" hidden></div>' +
        '<p class="note">Надсилаються підсумки по місяцях, категоріях, магазинах, гуртках і людях, цілі, кредити та 15 найбільших витрат з нотатками. Фото й повний список витрат не надсилаються. Безкоштовний ліміт Google дозволяє використовувати надіслане для покращення продуктів.</p></form>';
    }
    openSheet(html, {});
  }

  // ---------- Файли ----------
  async function saveFile(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    try {
      var file = new File([blob], name, { type: mime });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: name }); return true; }
    } catch (e) { if (e && e.name === 'AbortError') return false; }
    var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000); return true;
  }

  // ---------- Події ----------
  var ACT = {
    tab: function (el) { shopSel = null; setView(attr(el, 'tab')); },
    add: function () { openTx(null); },
    'tx-kind': function (el) {
      var form = $('form[data-form=tx]'); var k = attr(el, 'k'); form.setAttribute('data-kind', k);
      $$('[data-act=tx-kind]', form).forEach(function (b) { b.setAttribute('aria-pressed', String(attr(b, 'k') === k)); });
      $('#tx-cats').innerHTML = catGridHtml(k, k === 'expense' ? F.state.meta.lastCat : 'in_salary', null);
      $('#tx-title').textContent = TX_TITLE[k][0];
      var q = $('#tx-quick'); if (q) q.hidden = k !== 'expense'; $('#tx-scan-wrap').hidden = k !== 'expense'; $$('.tagrow').forEach(function (e) { e.hidden = k !== 'expense'; });
      syncSub();
    },
    sub: function (el) { setSub(attr(el, 's')); },
    subs: function (el) { openSubs(attr(el, 'id'), attr(el, 'from')); },
    'subs-done': function (el) { if (attr(el, 'from') === 'budget') { openBudget(); } else closeSheet(); render(); },
    'sub-del': function (el) {
      var cid = attr(el, 'id'); var r = F.removeSub(cid, attr(el, 's')); if (r.error) return toast(r.error, null, null, 5000);
      openSubs(cid, attr(el, 'from'), true); render(); if (r.affected) toast('Вид видалено. ' + r.affected + ' ' + plural(r.affected, 'запис', 'записи', 'записів') + ' тепер без виду', null, null, 6000);
    },
    quick: function (el) {
      var q = quickList[Number(attr(el, 'i'))]; if (!q) return;
      $('#tx-amount').value = String(q.amount).replace('.', ','); $('#tx-note').value = q.note; var r = $('#cat-' + q.category); if (r) r.checked = true; syncSub(); setSub(q.sub || ''); syncShops();
    },
    'repeat-tx': function (el) { var r = F.repeatTx(attr(el, 'id')); if (r.error) return toast(r.error); closeSheet(); render(); refreshList(); toast('Додано на сьогодні', 'Скасувати', function () { F.setDeleted(r.tx.id, true); render(); refreshList(); }); },
    'list-kind': function (el) { shopSel = null; listKind = attr(el, 'k'); catFilter = 'all'; if (view !== 'list') { view = 'list'; window.scrollTo(0, 0); } render(); },
    bulk: function () { openBulk(); },
    'bulk-do': function (el) {
      var ids = F.search(query, listKind).map(function (t) { return t.id; }); var snaps = ids.map(function (id) { return Object.assign({}, F.state.txs[id]); });
      var r = F.bulkSetCategory(ids, attr(el, 'c')); closeSheet();
      if (r.error) return toast(r.error); render();
      toast('Змінено витрат: ' + r.changed, r.changed ? 'Скасувати' : null, function () { snaps.forEach(F.restoreSnapshot); render(); }, 7000);
    },
    shops: function () { openTags('shops'); },
    clubs: function () { openTags('clubs'); },
    shop: function (el) {
      var n = $('#tx-note'); var name = attr(el, 's'); var k = attr(el, 'k') || 'shops'; var on = F.tagOf({ note: n.value }, k) === name;
      n.value = F.withTag(n.value, on ? '' : name); if (!on && k === 'clubs') { var kids = $('#cat-kids'); if (kids) kids.checked = true; syncSub(); } syncShops();
    },
    'shop-del': function (el) { var k = attr(el, 'k') || 'shops'; F.removeTag(k, attr(el, 's')); openTags(k, true); render(); },
    'shop-find': function (el) { shopKind = attr(el, 'k') || 'shops'; shopSel = attr(el, 's'); listKind = 'expense'; query = ''; catFilter = 'all'; view = 'list'; render(); window.scrollTo(0, 0); },
    'shop-clear': function () { shopSel = null; render(); },
    'split-del': function (el) { var row = el.closest('.split-row'); if (row) row.remove(); updateSplit(); },
    'split-one': function () {
      var c = splitCtx; var by = {}; splitRows().forEach(function (x) { if (x.amount != null) by[x.category] = (by[x.category] || 0) + x.amount; });
      var top = Object.keys(by).sort(function (a, b) { return by[b] - by[a]; })[0] || 'other'; var d = $('#sp-date').value; var note = $('#sp-note').value;
      closeSheet(); openTx(null, top); $('#tx-amount').value = String(c.total).replace('.', ','); if (d) $('#tx-date').value = d; $('#tx-note').value = note; syncShops();
    },
    goals: function () { openGoals(); },
    'goal-edit': function (el) { openGoals(attr(el, 'id'), false); var f = $('#g-name'); if (f) f.focus(); },
    'goal-cancel': function () { openGoals(null, true); },
    'goal-del': function (el) { if (confirm('Видалити ціль? Уже записані внески лишаться в історії.')) { F.removeGoal(attr(el, 'id')); openGoals(null, true); render(); } },
    'goal-move': function (el) { openGoalMove(attr(el, 'id'), Number(attr(el, 's'))); },
    cards: function () { openCards(); },
    'card-move': function (el) { openCardMove(attr(el, 'id'), Number(attr(el, 's'))); },
    'card-debt': function (el) { openCardDebt(attr(el, 'id')); },
    'card-edit': function (el) { openCards(attr(el, 'id'), false); var f = $('#cc-name'); if (f) { if (f.scrollIntoView) f.scrollIntoView({ block: 'center' }); f.focus(); } },
    'card-cancel': function () { openCards(null, true); },
    'card-del': function (el) { var r = F.removeCard(attr(el, 'id')); if (r.error) return showErr('cc-err', r.error); openCards(null, true); render(); toast('Кредитку видалено'); },
    'card-all': function (el) { var a = $('#cm-amount'); if (a) { a.value = attr(el, 'v'); a.focus(); } },
    'card-tx-del': function (el) { var tid = attr(el, 'id'); F.setDeleted(tid, true); openCards(null, true); render(); toast('Запис видалено', 'Повернути', function () { F.setDeleted(tid, false); if ($('.sheet')) openCards(null, true); render(); }); },
    loans: function () { openLoans(); },
    'loan-edit': function (el) { openLoans(attr(el, 'id'), false); var f = $('#l-name'); if (f) f.focus(); },
    'loan-cancel': function () { openLoans(null, true); },
    'loan-del': function (el) { if (confirm('Видалити цей запис? Автоматичний щомісячний платіж теж буде видалено, а вже записані платежі лишаться.')) { F.removeLoan(attr(el, 'id')); openLoans(null, true); render(); } },
    'loan-bal': function (el) { openLoanBalance(attr(el, 'id')); },
    pin: function () { openPin(); },
    'pin-key': function (el) { pinKey(attr(el, 'k')); },
    'pin-forgot': function () { drawLock('Видаліть іконку додатка з екрана й додайте знову. Якщо підключена спільна таблиця, дані повернуться з неї.', true); },
    'add-cat': function (el) { openTx(null, attr(el, 'c')); },
    'open-cat': function (el) { catFrom = view === 'cat' ? catFrom : view; catId = attr(el, 'c'); scrollBack = window.scrollY; if (view === 'home') ym = curYm; view = 'cat'; render(); window.scrollTo(0, 0); },
    'cat-back': function () { view = catFrom; render(); window.scrollTo(0, scrollBack); },
    edit: function (el) { openTx(attr(el, 'id')); },
    close: function () { closeSheet(); },
    backdrop: function (el, e) { if (e.target === el && !sheetLocked) closeSheet(); },
    month: function (el) { var n = F.addMonths(ym, Number(attr(el, 'd'))); if (n > curYm) return; ym = n; render(); },
    pickmonth: function (el) { ym = attr(el, 'ym'); render(); },
    filter: function (el) { catFilter = attr(el, 'c'); render(); },
    repmode: function (el) { repMode = attr(el, 'm'); render(); },
    strip: function (el) {
      var d = Number(attr(el, 'd')); var arr = F.dailySeries(curYm); var v = arr[d - 1] || 0;
      var r = $('#strip-read'); if (r) r.textContent = dayMonthShort(curYm + '-' + String(d).padStart(2, '0')) + ': ' + (v ? money(v) : 'витрат немає');
    },
    budget: function () { openBudget(); },
    recurring: function () { openRecurring(); },
    key: function () { openKey(); },
    ai: function () { openAI(); },
    'ai-ask': function (el) { runAI(attr(el, 'q') || ''); },
    'key-test': function (el) {
      var box = $('#k-test'); if (!box) return; box.hidden = false; box.textContent = 'Перевіряю…'; el.disabled = true;
      F.testKey().then(function (rows) {
        box.innerHTML = rows.map(function (r) { return '<div>' + (r.ok ? '✓ ' : '✗ ') + '<b>' + esc(r.step) + '</b>: ' + esc(r.text) + '</div>'; }).join('');
      }).catch(function () { box.textContent = 'Не вдалося виконати перевірку.'; }).then(function () { el.disabled = false; });
    },
    'key-del': function () { F.setGeminiKey(''); closeSheet(); render(); toast('Ключ видалено'); },
    scan: function () { $('#tx-file').click(); },
    'del-tx': function (el) {
      var id = attr(el, 'id'); F.setDeleted(id, true); closeSheet(); render();
      toast('Витрату видалено', 'Повернути', function () { F.setDeleted(id, false); render(); });
    },
    'open-connect': function () { openConnect(); },
    'onboard-join': function () { var n = $('#o-name').value; closeSheet(); openConnect({ name: n }); },
    sync: async function () { toast('Синхронізую…', null, null, 1500); var r = await F.syncNow(); if (r && r.ok) toast('Синхронізовано'); else if (r && r.error) toast(r.error, null, null, 6000); render(); },
    invite: function () { openInvite(); },
    'inv-share': async function (el) {
      var link = attr(el, 'link');
      try { if (navigator.share) { await navigator.share({ title: 'Сімейний бюджет', text: 'Підключайся до наших спільних витрат:', url: link }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(link); toast('Посилання скопійовано'); } catch (e) { var b = $('#inv-link'); if (b) { var rg = document.createRange(); rg.selectNodeContents(b); var s = getSelection(); s.removeAllRanges(); s.addRange(rg); toast('Утримуйте виділене й виберіть «Скопіювати»'); } }
    },
    disconnect: function () { if (confirm('Відключити цей телефон від спільної таблиці? Записи лишаться на телефоні, але нові не будуть надсилатися.')) { F.disconnect(); render(); toast('Відключено'); } },
    'cat-del': function (el) { var r = F.removeCategory(attr(el, 'id')); if (r.error) toast(r.error, null, null, 7000); else { openBudget(true); render(); } },
    'rec-edit': function (el) { openRecurring(attr(el, 'id'), false); var f = $('#rec-name'); if (f) f.focus(); },
    'rec-cancel': function () { openRecurring(null, true); },
    'rec-toggle': function (el) { var r = F.state.cfg.recurring.filter(function (x) { return x.id === attr(el, 'id'); })[0]; if (r) { F.updateRecurring(r.id, { active: !r.active }); openRecurring(null, true); render(); } },
    'rec-del': function (el) { if (confirm('Видалити цей регулярний платіж? Уже записані витрати лишаться.')) { F.removeRecurring(attr(el, 'id')); openRecurring(null, true); render(); } },
    'export-json': async function () { if (await saveFile('simeinyi-biudzhet-' + F.todayStr() + '.json', F.exportJSON(), 'application/json')) { toast('Копію збережено'); render(); } },
    'export-csv': function () { saveFile('vytraty-' + F.todayStr() + '.csv', F.exportCSV(), 'text/csv'); },
    'import-json': function () { $('#import-file').click(); }
  };
  document.addEventListener('click', function (e) {
    var el = e.target.closest ? e.target.closest('[data-act]') : null; if (!el) return;
    var fn = ACT[attr(el, 'act')]; if (fn) fn(el, e);
  });

  document.addEventListener('submit', function (e) {
    var form = e.target; var kind = form.getAttribute('data-form'); if (!kind) return; e.preventDefault();
    if (kind === 'ai') { runAI(($('#ai-q') || {}).value || ''); return; }
    if (kind === 'tx') submitTx(form);
    else if (kind === 'connect') submitConnect();
    else if (kind === 'join') submitJoin(form);
    else if (kind === 'onboard') {
      var n = $('#o-name').value.trim(); if (!n) return showErr('o-err', 'Введіть ім’я.');
      F.setName(n); F.finishOnboarding(); closeSheet(); render();
    } else if (kind === 'sub-add') {
      var cid = attr(form, 'id'); var rs = F.addSub(cid, $('#sub-new').value); if (rs.error) return toast(rs.error, null, null, 5000);
      openSubs(cid, attr(form, 'from'), true); render(); var ni = $('#sub-new'); if (ni) ni.focus();
    } else if (kind === 'cat-add') {
      var r = F.addCategory($('#cat-new').value); if (r.error) return toast(r.error, null, null, 6000); openBudget(true); render();
    } else if (kind === 'rec') {
      var id = attr(form, 'id'); var p = { name: $('#rec-name').value, amount: $('#rec-amount').value, day: $('#rec-day').value, category: $('#rec-cat').value };
      var res = id ? F.updateRecurring(id, p) : F.addRecurring(p); if (res.error) return showErr('rec-err', res.error);
      openRecurring(null, false); render(); toast(id ? 'Платіж змінено' : 'Платіж додано');
    } else if (kind === 'split') {
      submitSplit();
    } else if (kind === 'shop-add') {
      var tk = attr(form, 'k') || 'shops'; var sr = F.addTag(tk, $('#shop-new').value); if (sr.error) return showErr('shop-err', sr.error);
      openTags(tk, true); render(); var ni = $('#shop-new'); if (ni) ni.focus();
    } else if (kind === 'goal') {
      var gid = attr(form, 'id'); var gp = { name: $('#g-name').value, target: $('#g-target').value, deadline: $('#g-deadline').value };
      var gr = gid ? F.updateGoal(gid, gp) : F.addGoal(gp); if (gr.error) return showErr('g-err', gr.error);
      openGoals(null, false); render(); toast(gid ? 'Ціль змінено' : 'Ціль додано');
    } else if (kind === 'goal-move') {
      var mid = attr(form, 'id'); var sg = Number(attr(form, 's')); var raw = $('#gm-amount').value; var amt = F.parseAmount(raw);
      if (amt == null) return showErr('gm-err', 'Введіть суму більше нуля.');
      var gi = F.goalInfo(F.goalById(mid), F.todayStr()); if (sg < 0 && amt > gi.saved) return showErr('gm-err', 'На цій цілі лише ' + money(gi.saved) + '.');
      var mr = F.addContribution(mid, sg * amt, $('#gm-date').value, $('#gm-note').value); if (mr.error) return showErr('gm-err', mr.error);
      openGoals(null, false); render(); toast(sg > 0 ? 'Внесок записано' : 'Знято з цілі', 'Скасувати', function () { F.setDeleted(mr.tx.id, true); render(); });
    } else if (kind === 'loan') {
      var lid = attr(form, 'id'); var lp = { name: $('#l-name').value, kind: $('#l-kind').value, balance: $('#l-balance').value, rate: $('#l-rate').value, payment: $('#l-pay').value, day: $('#l-day').value };
      if (!lid) lp.auto = $('#l-auto').checked;
      var lr = lid ? F.updateLoan(lid, lp) : F.addLoan(lp); if (lr.error) return showErr('l-err', lr.error);
      openLoans(null, false); render(); toast(lid ? 'Збережено' : 'Додано');
    } else if (kind === 'card') {
      var cid0 = attr(form, 'id'); var cp = { name: $('#cc-name').value, limit: $('#cc-limit').value };
      var cr = cid0 ? F.updateCard(cid0, cp) : F.addCard(cp); if (cr.error) return showErr('cc-err', cr.error);
      openCards(null, false); render(); toast(cid0 ? 'Збережено' : 'Кредитку додано');
    } else if (kind === 'card-move') {
      var kid = attr(form, 'id'); var ks = Number(attr(form, 's')); var kamt = F.parseAmount($('#cm-amount').value);
      if (kamt == null) return showErr('cm-err', 'Введіть суму більше нуля.');
      var kr = F.cardMove(kid, ks, kamt, $('#cm-date').value, $('#cm-note').value); if (kr.error) return showErr('cm-err', kr.error);
      closeSheet(); render(); var left = F.cardDebt(kid);
      toast(ks > 0 ? 'Записано: взяли ' + money(kamt) + '. Борг ' + money(Math.max(0, left)) : (left > 0.005 ? 'Погашено ' + money(kamt) + '. Лишилось ' + money(left) : 'Кредитку погашено повністю'), 'Скасувати', function () { F.setDeleted(kr.tx.id, true); render(); });
    } else if (kind === 'card-debt') {
      var dr = F.setCardDebt(attr(form, 'id'), $('#cd-val').value); if (dr.error) return showErr('cd-err', dr.error);
      openCards(null, false); render(); toast(dr.same ? 'Борг і так такий' : 'Борг уточнено');
    } else if (kind === 'loan-bal') {
      var br = F.updateLoan(attr(form, 'id'), { balance: $('#lb-val').value }); if (br.error) return showErr('lb-err', br.error);
      openLoans(null, false); render(); toast('Залишок оновлено');
    } else if (kind === 'pin-set') {
      var pn = $('#pin-new').value; if (pn !== $('#pin-rep').value) return showErr('pin-err', 'PIN не збігаються.');
      F.setPin(pn).then(function (r) { if (r.error) return showErr('pin-err', r.error); closeSheet(); render(); toast('PIN увімкнено'); });
    } else if (kind === 'pin-change') {
      F.checkPin($('#pin-cur').value).then(function (ok) { if (!ok) return showErr('pin-err', 'Поточний PIN невірний.'); return F.setPin($('#pin-new').value).then(function (r) { if (r.error) return showErr('pin-err', r.error); closeSheet(); render(); toast('PIN змінено'); }); });
    } else if (kind === 'pin-off') {
      F.checkPin($('#pin-off-cur').value).then(function (ok) { if (!ok) return showErr('pin-off-err', 'PIN невірний.'); F.removePin(); closeSheet(); render(); toast('PIN вимкнено'); });
    } else if (kind === 'key') {
      F.setGeminiKey($('#k-val').value); closeSheet(); render(); toast(F.state.me.geminiKey ? 'Ключ збережено' : 'Ключ не вказано');
    }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.closest && el.closest('form[data-form=split]')) { updateSplit(); return; }
    if (el.name === 'cat' && el.closest && el.closest('form[data-form=tx]')) { syncSub(); return; }
    if (el.id === 'tx-file') { if (el.files && el.files[0]) doScan(el.files[0]); return; }
    if (el.id === 'import-file') {
      var f = el.files && el.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () { var r = F.importJSON(String(rd.result)); el.value = ''; if (r.error) toast(r.error, null, null, 6000); else { render(); toast('Відновлено: нових ' + r.added + ', оновлених ' + r.updated); } };
      rd.readAsText(f); return;
    }
    var kind = el.getAttribute && el.getAttribute('data-change'); if (!kind) return;
    var id = attr(el, 'id'); var r;
    if (kind === 'name') { F.setName(el.value); return; }
    if (kind === 'currency') { F.setCurrency(el.value); render(); return; }
    if (kind === 'budget') { r = F.setBudget(el.value.trim() === '' ? null : el.value); if (r.error) { toast(r.error); el.value = F.state.cfg.budget ? String(F.state.cfg.budget).replace('.', ',') : ''; } render(); return; }
    if (kind === 'sub-name') { var sid = attr(el, 's'); r = F.renameSub(id, sid, el.value); if (r.error) { toast(r.error, null, null, 5000); var cur0 = F.subsOf(id).filter(function (x) { return x.id === sid; })[0]; el.value = cur0 ? cur0.name : ''; } render(); return; }
    if (kind === 'cat-name') { r = F.updateCategory(id, { name: el.value }); if (r.error) { toast(r.error, null, null, 5000); el.value = F.catById(id).name; } render(); return; }
    if (kind === 'month-budget') { r = F.setMonthBudget(curYm, el.value.trim() === '' ? null : el.value); if (r.error) { toast(r.error); el.value = F.state.cfg.budgets[curYm] ? String(F.state.cfg.budgets[curYm]).replace('.', ',') : ''; } render(); return; }
    if (kind === 'member-limit') { var nm = el.getAttribute('data-name'); r = F.setMemberLimit(nm, el.value.trim() === '' ? null : el.value); if (r.error) { toast(r.error); el.value = F.state.cfg.memberLimits[nm] ? String(F.state.cfg.memberLimits[nm]).replace('.', ',') : ''; } render(); return; }
    if (kind === 'cat-limit') { r = F.updateCategory(id, { limit: el.value.trim() === '' ? null : el.value }); if (r.error) { toast(r.error); el.value = F.catById(id).limit ? String(F.catById(id).limit).replace('.', ',') : ''; } render(); return; }
  });

  document.addEventListener('keydown', function (e) {
    if (lockEl) { if (/^[0-9]$/.test(e.key)) pinKey(e.key); else if (e.key === 'Backspace') pinKey('del'); return; }
    if (e.key === 'Escape' && $('.back') && !sheetLocked) closeSheet();
  });
  document.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'q') { query = e.target.value; refreshList(); }
    if (e.target && e.target.id === 'tx-note') syncShops();
    if (e.target && e.target.id === 'tx-sub-own' && e.target.value) $$('[data-act=sub]').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
    if (e.target && e.target.closest && e.target.closest('form[data-form=split]')) updateSplit();
  });

  // ---------- Запуск ----------
  F.on(function () { renderSoon(); });
  function onVisible() {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return; }
    if (document.visibilityState !== 'visible') return;
    if (hiddenAt && Date.now() - hiddenAt > 30000) showLock();
    var t = F.todayStr(); if (t.slice(0, 7) !== curYm) { var wasCur = ym === curYm; curYm = t.slice(0, 7); if (wasCur) ym = curYm; }
    F.materializeRecurring(); render(); if (F.isConnected()) F.syncNow();
  }
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('online', function () { if (F.isConnected()) F.syncNow(); });
  setInterval(function () { if (document.visibilityState === 'visible' && F.isConnected()) F.syncNow(); }, 90000);

  render();
  showLock();
  var inv = F.parseInvite(location.hash);
  if (location.hash) { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* не критично */ } }
  if (inv && !(F.isConnected() && F.state.me.url === inv.url && F.state.me.code === inv.code)) openJoin(inv);
  else if (!F.state.meta.onboarded && !F.state.me.name) openOnboarding();
  if (F.isConnected()) F.syncNow();
  window.__fb = { render: render, setView: setView, openTx: openTx, openBudget: openBudget, openRecurring: openRecurring, openInvite: openInvite };
})();
