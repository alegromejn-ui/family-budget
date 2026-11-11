/* Дотики: хвилька, «пружинка» чипів і бризки при виборі магазину. Нічого не змінює в даних. */
(function () {
  'use strict';
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;
  var HOST = '.txrow, .chip, .shopcard, .catlink, .btn, .btn-text, .tab, .seg button, .arrow, .iconbtn';

  // Хвилька з точки дотику
  document.addEventListener('pointerdown', function (e) {
    var el = e.target.closest && e.target.closest(HOST); if (!el || el.disabled) return;
    var r = el.getBoundingClientRect(); if (r.width > 700) return;
    el.classList.add('rip-host');
    var d = Math.max(r.width, r.height) * 2.2, s = document.createElement('span'); s.className = 'rip';
    s.style.cssText = 'width:' + d + 'px;height:' + d + 'px;left:' + (e.clientX - r.left - d / 2) + 'px;top:' + (e.clientY - r.top - d / 2) + 'px';
    el.appendChild(s); setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 600);
  }, { passive: true });

  // Бризки кольору магазину
  function burst(el) {
    var r = el.getBoundingClientRect(), cx = r.left + 24, cy = r.top + r.height / 2;
    var col = getComputedStyle(el).getPropertyValue('--chipc').trim() || getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#0F4D3F';
    for (var i = 0; i < 9; i++) {
      var s = document.createElement('i'); s.className = 'spark'; s.style.background = col; s.style.left = cx + 'px'; s.style.top = cy + 'px'; document.body.appendChild(s);
      var a = Math.PI * 2 * i / 9 + Math.random() * .5, dist = 26 + Math.random() * 26;
      var an = s.animate ? s.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * dist + 'px,' + Math.sin(a) * dist + 'px) scale(.2)', opacity: 0 }], { duration: 560, easing: 'cubic-bezier(.22,.8,.2,1)' }) : null;
      (function (n) { if (an) an.onfinish = function () { n.remove(); }; else n.remove(); })(s);
    }
  }
  // Вибір чипа: пружинка (і бризки для магазинів)
  new MutationObserver(function (list) {
    list.forEach(function (m) {
      var el = m.target; if (!el.classList || !el.classList.contains('chip') || m.oldValue === el.getAttribute('aria-pressed')) return;
      if (el.getAttribute('aria-pressed') !== 'true' || !el.animate) return;
      el.animate([{ transform: 'scale(.88)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'cubic-bezier(.34,1.4,.64,1)' });
      if (el.getAttribute('data-act') === 'shop') { burst(el); try { if (navigator.vibrate) navigator.vibrate(8); } catch (x) { /* не підтримується */ } }
    });
  }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'], attributeOldValue: true });
})();
