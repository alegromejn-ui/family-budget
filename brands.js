/* Значки магазинів і сервісів. За наявності інтернету показується справжній значок із сайту магазину,
   без інтернету — плашка у фірмових кольорах з літерою. Розпізнавання за початком назви (нотатки).
   Невідомий магазин отримує стабільний колір із назви, тому «Кубиха» завжди одного кольору. */
(function (root) {
  'use strict';

  // [ключ, регулярний вираз для початку назви, текст на значку, колір 1, колір 2, колір тексту, вид]
  var B = [
    ['silpo', /^(silpo|сільпо|сильпо)/i, 'S', '#FF7A1A', '#E8530E', '#fff', 'grocery'],
    ['atb', /^(атб|atb)/i, 'АТБ', '#1B56B8', '#0F3C8C', '#fff', 'grocery'],
    ['maudau', /^(maudau|маудау)/i, 'M', '#7B4DFF', '#5B2EE0', '#fff', 'online'],
    ['fozzy', /^(fozzy|фоззі|фози)/i, 'F', '#F0323A', '#C81D26', '#fff', 'grocery'],
    ['eva', /^eva\b|^єва\b|^ева\b/i, 'EVA', '#12B76A', '#0A8F50', '#fff', 'drugstore'],
    ['avrora', /^(аврора|avrora)/i, 'A', '#D6338A', '#A61E68', '#fff', 'shop'],
    ['novus', /^(novus|новус)/i, 'N', '#E5322D', '#B91F1B', '#fff', 'grocery'],
    ['varus', /^(varus|варус)/i, 'V', '#2FA84F', '#1F8438', '#fff', 'grocery'],
    ['metro', /^(metro|метро)\b/i, 'M', '#1A4E9C', '#0E3470', '#FFD100', 'grocery'],
    ['auchan', /^(auchan|ашан)/i, 'A', '#E2231A', '#B51810', '#fff', 'grocery'],
    ['rozetka', /^(rozetka|розетка)/i, 'R', '#14B35A', '#0B8C42', '#fff', 'online'],
    ['epicentr', /^(епіцентр|epicentr|эпицентр)/i, 'E', '#FF7A00', '#E05E00', '#fff', 'shop'],
    ['foxtrot', /^(foxtrot|фокстрот)/i, 'F', '#F7861E', '#D9690A', '#fff', 'shop'],
    ['comfy', /^(comfy|комфі)/i, 'C', '#FF9F1C', '#E07F00', '#fff', 'shop'],
    ['jysk', /^(jysk|юск)/i, 'J', '#1C5FB8', '#0F4492', '#fff', 'shop'],
    ['prostor', /^(простор|prostor)/i, 'П', '#C9262E', '#9E151C', '#fff', 'shop'],
    ['podorozhnyk', /^(подорожник|аптека|анц|d\.s\.|низькі ціни)/i, '+', '#16A34A', '#0F7A35', '#fff', 'drugstore'],
    ['np', /^(нова пошта|новапошта|nova poshta|нп\b)/i, 'НП', '#E4262C', '#B5161C', '#fff', 'post'],
    ['up', /^(укрпошта|ukrposhta)/i, 'УП', '#FFD400', '#F2B800', '#1B1B1B', 'post'],
    ['wog', /^(wog|вог)\b/i, 'W', '#0F8B4A', '#096B38', '#fff', 'fuel'],
    ['okko', /^(okko|окко)/i, 'O', '#E2231A', '#B51810', '#fff', 'fuel'],
    ['socar', /^(socar|сокар)/i, 'S', '#0072CE', '#0057A0', '#fff', 'fuel'],
    ['upg', /^(upg|юпіджі)/i, 'U', '#00A651', '#007A3C', '#fff', 'fuel'],
    ['shell', /^(shell|шелл)/i, 'S', '#FFD500', '#F2B800', '#D81E05', 'fuel'],
    ['uklon', /^(uklon|уклон)/i, 'U', '#1FA2FF', '#0B7DD1', '#fff', 'taxi'],
    ['bolt', /^(bolt|болт)/i, 'B', '#34D186', '#1DAE69', '#06231B', 'taxi'],
    ['mono', /^(mono|моно)/i, 'm', '#2B2B2B', '#000', '#fff', 'bank'],
    ['privat', /^(приват|privat)/i, 'П', '#7CB518', '#5E9210', '#fff', 'bank'],
    ['kyivstar', /^(київстар|kyivstar)/i, 'K', '#1996E8', '#0B72BD', '#fff', 'telecom'],
    ['vodafone', /^(vodafone|водафон)/i, 'V', '#E60000', '#B80000', '#fff', 'telecom'],
    ['lifecell', /^(lifecell|лайфселл)/i, 'L', '#FFCB2B', '#F2B000', '#1B1B1B', 'telecom'],
    ['netflix', /^netflix/i, 'N', '#E50914', '#B20710', '#fff', 'sub'],
    ['spotify', /^spotify/i, 'S', '#1ED760', '#14A944', '#06231B', 'sub'],
    ['youtube', /^(youtube|ютуб)/i, '▶', '#FF2D2D', '#CC0000', '#fff', 'sub'],
    ['apple', /^(apple|icloud)/i, 'A', '#3A3A3C', '#1C1C1E', '#fff', 'sub'],
    ['google', /^(google|гугл)/i, 'G', '#4285F4', '#2B63C9', '#fff', 'sub'],
    ['chatgpt', /^(chatgpt|openai|claude)/i, 'AI', '#10A37F', '#0B7A5E', '#fff', 'sub'],
    ['mcd', /^(mcdonald|макдональдс|макдак)/i, 'M', '#FFC72C', '#F2A900', '#DA291C', 'cafe'],
    ['kfc', /^kfc/i, 'K', '#E4002B', '#B30022', '#fff', 'cafe'],
    ['puzata', /^(пузата|puzata)/i, 'П', '#E8751A', '#C25A0C', '#fff', 'cafe'],
    ['bazar', /^(базар|ринок)/i, 'Б', '#8FB339', '#6F9122', '#fff', 'market'],
    ['online', /^(інтернет магазин|інтернет-магазин|онлайн)/i, '@', '#5B7CFA', '#3B5BDB', '#fff', 'online']
  ];

  // Стабільна палітра для магазинів без відомого бренду
  var PAL = [['#0A84C6', '#066A9F'], ['#E58A00', '#BC6F00'], ['#16A085', '#0E7A64'], ['#C2459B', '#9A2F79'], ['#D2552B', '#A93E1B'],
    ['#4C6FD6', '#344FAE'], ['#6C5CC9', '#5043A5'], ['#7E9A1F', '#5F7814'], ['#9A6A44', '#76502F'], ['#3F8F8A', '#2B6C68'], ['#C23A64', '#98264A'], ['#4E7FB0', '#376290']];

  function hash(s) { var h = 5381; s = String(s || '').toLowerCase(); for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function clean(s) { return String(s || '').trim().replace(/^[\s«"'(]+/, ''); }

  // Знайти бренд за початком тексту (назви магазину або нотатки)
  function find(text) {
    var t = clean(text); if (!t) return null;
    for (var i = 0; i < B.length; i++) {
      if (B[i][1].test(t)) return { key: B[i][0], text: B[i][2], c1: B[i][3], c2: B[i][4], fg: B[i][5], kind: B[i][6] };
    }
    return null;
  }
  // Значок для будь-якої назви: відомий бренд або літера на стабільному кольорі
  function resolve(name) {
    var b = find(name); if (b) return b;
    var n = clean(name); if (!n) return null;
    var p = PAL[hash(n) % PAL.length];
    var ch = (n.match(/[A-Za-zА-Яа-яІіЇїЄєҐґ0-9]/) || ['•'])[0].toUpperCase();
    return { key: 'x' + (hash(n) % PAL.length), text: ch, c1: p[0], c2: p[1], fg: '#fff', kind: 'shop', generic: true };
  }
  // ---------- Справжні значки ----------
  // Значок береться із сайту самого магазину (його favicon) через сервіс значків. Нічого не намальовано вручну:
  // якщо інтернету немає або значок не знайшовся, лишається кольорова плашка з літерою.
  var DOM = { silpo: 'silpo.ua', atb: 'atbmarket.com', maudau: 'maudau.com.ua', fozzy: 'fozzy.ua', eva: 'eva.ua', avrora: 'avrora.ua', novus: 'novus.online', varus: 'varus.ua', metro: 'metro.ua', auchan: 'auchan.ua',
    rozetka: 'rozetka.com.ua', epicentr: 'epicentrk.ua', foxtrot: 'foxtrot.com.ua', comfy: 'comfy.ua', jysk: 'jysk.ua', prostor: 'prostor.ua', np: 'novaposhta.ua', up: 'ukrposhta.ua', wog: 'wog.ua', okko: 'okko.ua',
    socar: 'socar.ua', upg: 'upg.ua', shell: 'shell.ua', uklon: 'uklon.com.ua', bolt: 'bolt.eu', mono: 'monobank.ua', privat: 'privatbank.ua', kyivstar: 'kyivstar.ua', vodafone: 'vodafone.ua', lifecell: 'lifecell.ua',
    netflix: 'netflix.com', spotify: 'spotify.com', youtube: 'youtube.com', apple: 'apple.com', google: 'google.com', mcd: 'mcdonalds.com', kfc: 'kfc.ua', puzata: 'puzatahata.ua' };
  var REAL_KEY = 'fb_real_icons'; var okSet = {}, badSet = {};
  function realOn() { try { return localStorage.getItem(REAL_KEY) !== '0'; } catch (e) { return true; } }
  function setReal(on) { try { localStorage.setItem(REAL_KEY, on ? '1' : '0'); } catch (e) { /* пам’ять недоступна */ } }
  function srcFor(key, n) { var d = DOM[key]; return n === 2 ? 'https://icons.duckduckgo.com/ip3/' + d + '.ico' : 'https://www.google.com/s2/favicons?domain=' + d + '&sz=128'; }
  function markAll(key) { var list = document.querySelectorAll('.bico[data-brand="' + key + '"]'); for (var i = 0; i < list.length; i++) list[i].classList.add('real'); }
  // Сервіс замість відсутнього значка віддає крихітний глобус 16×16: такий не показуємо
  function imgOk(img) { var key = img.getAttribute('data-k'); if (img.naturalWidth < 32) return imgFail(img); okSet[key] = img.getAttribute('data-n') || '1'; markAll(key); }
  function imgFail(img) {
    var key = img.getAttribute('data-k');
    if (img.getAttribute('data-n') !== '2') { img.setAttribute('data-n', '2'); img.src = srcFor(key, 2); return; }
    badSet[key] = 1; if (img.parentNode) img.parentNode.removeChild(img);
  }
  // size: '' | 'sm' | 'lg'
  function badge(name, size) {
    var b = resolve(name); if (!b) return '';
    var real = !b.generic && DOM[b.key] && !badSet[b.key] && realOn();
    var len = b.text.length; var cls = 'bico' + (size ? ' ' + size : '') + ' l' + Math.min(len, 3) + (b.generic ? ' gen' : '') + ' k-' + b.kind + (real && okSet[b.key] ? ' real' : '');
    var n = real && okSet[b.key] === '2' ? 2 : 1;
    return '<i class="' + cls + '" data-brand="' + esc(b.key) + '" style="--b1:' + b.c1 + ';--b2:' + b.c2 + ';--bf:' + b.fg + '" aria-hidden="true"><b>' + esc(b.text) + '</b>' +
      (real ? '<img class="bimg" alt="" decoding="async" referrerpolicy="no-referrer" data-k="' + esc(b.key) + '" data-n="' + n + '" src="' + srcFor(b.key, n) + '" onload="FBBrand.imgOk(this)" onerror="FBBrand.imgFail(this)">' : '') + '</i>';
  }
  function color(name) { var b = resolve(name); return b ? b.c1 : null; }

  root.FBBrand = { find: find, resolve: resolve, badge: badge, color: color, realOn: realOn, setReal: setReal, imgOk: imgOk, imgFail: imgFail };
})(window);
