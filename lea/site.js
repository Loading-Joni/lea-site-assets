
(function () {
/* Укажите адрес папки с ассетами (hero/, portfolio/, reviews/) и страницу политики. */
var ASSET_BASE = 'https://loading-joni.github.io/lea-site-assets/lea/';
var POLICY_URL = 'https://YOUR-SITE/politika';
/* false — скрыть панель «Твики» (для публикации) */
var SHOW_TWEAKS = true;
function asset(p) { return ASSET_BASE + p; }
/* Весь интерфейс запускается после появления блоков на странице (см. waitForBlocks в конце файла). */
function leaMain() {
document.querySelectorAll('.v2 [data-src]').forEach(function (el) { el.setAttribute('src', asset(el.getAttribute('data-src'))); });
document.querySelectorAll('.v2 [data-href]').forEach(function (el) { el.setAttribute('href', asset(el.getAttribute('data-href'))); });
document.querySelectorAll('.v2 [data-policy]').forEach(function (el) { el.setAttribute('href', POLICY_URL); });
var heroVideo = document.getElementById('v2-video');
if (heroVideo) {
  if (heroVideo.getAttribute('data-poster')) heroVideo.setAttribute('poster', asset(heroVideo.getAttribute('data-poster')));
  var sources = heroVideo.querySelectorAll('source');
  var lastSource = sources[sources.length - 1];
  /* Ошибка приходит на последний источник, когда ни один формат не загрузился: тогда остаётся фото-подложка. */
  if (lastSource) lastSource.addEventListener('error', function () { heroVideo.style.display = 'none'; });
  heroVideo.load();
}
/* Координаты в viewBox 1600×900 относятся к hero3. Выноски привязаны к своим деталям: тёплый пол — к полу. */
var HOTSPOTS = [
{title:'Подсветка под шкафами',text:'Тёплый профиль под верхними шкафами даёт свет на столешнице без видимого источника.',from:.04,to:.36,ax:430,ay:342,bx:4,by:14},
{title:'Тёплый пол',text:'Нагревательная плёнка под паркетом и термостат в доступной зоне. Пол прогревается снизу, батарей не нужно.',from:.38,to:.62,ax:900,ay:770,bx:4,by:56},
{title:'Подвесной светильник над столом',text:'Свет над обеденной зоной отдельно от общего освещения. Высоту подбираем под стол.',from:.64,to:.78,ax:898,ay:210,bx:58,by:14},
{title:'Панорамное остекление',text:'Окна от пола до потолка с низкой теплопотерей. Вид на город становится частью интерьера.',from:.8,to:1,ax:1200,ay:300,bx:58,by:56}
];
/* Ключевые кадры камеры: центр (cx, cy) и масштаб s. Амплитуда зума задаётся твиком. */
var CAM = [
{p:0, cx:800, cy:450, s:1},
{p:.3, cx:600, cy:500, s:1.3},
{p:.62, cx:1150, cy:440, s:1.3},
{p:1, cx:1280, cy:300, s:1.6}
];
var RATES = {cosmetic:3500, capital:7500, design:12000, newbuild:6000};
var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var NS = 'http://www.w3.org/2000/svg';
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function fmt(n) { return n.toLocaleString('ru-RU'); }

var hero = document.querySelector('.v2-hero');
var stage = document.getElementById('v2-stage');
var svg = document.getElementById('v2-scene');
var world = document.getElementById('v2-world');
var hl = document.getElementById('v2-hl');
var intro = document.getElementById('v2-intro');
var video = document.getElementById('v2-video');
video.pause();
function markReady() { if (video.readyState >= 2) video.classList.add('is-ready'); }
video.addEventListener('loadeddata', markReady);
markReady();

/* Выноски и точки стоят в разметке (#v2-pin1…4, #v2-note1…4); JS только ведёт их по кадру и рисует линии. */
var spots = HOTSPOTS.map(function (s, i) {
var line = document.createElementNS(NS, 'line');
hl.appendChild(line);
return {s: s, pin: document.getElementById('v2-pin' + (i + 1)), note: document.getElementById('v2-note' + (i + 1)), line: line, key: 'note' + (i + 1)};
});

var zoomK = 1.15;
function place() {
var r = stage.getBoundingClientRect();
var W = r.width, H = r.height;
hl.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
var m = world.getScreenCTM();
spots.forEach(function (o) {
var pt = svg.createSVGPoint(); pt.x = o.s.ax; pt.y = o.s.ay;
var q = pt.matrixTransform(m);
var px = q.x - r.left, py = q.y - r.top;
var nx = o.s.bx / 100 * W + (tw.pos[o.key] || [0, 0])[0], ny = o.s.by / 100 * H + (tw.pos[o.key] || [0, 0])[1];
var nw = o.note.offsetWidth, nh = o.note.offsetHeight;
nx = clamp(nx, 12, Math.max(12, W - nw - 12)); ny = clamp(ny, 12, Math.max(12, H - nh - 12));
o.pin.style.left = px + 'px'; o.pin.style.top = py + 'px';
o.note.style.left = nx + 'px'; o.note.style.top = ny + 'px';
var ex = nx > px ? nx : nx + nw;
o.line.setAttribute('x1', px); o.line.setAttribute('y1', py);
o.line.setAttribute('x2', ex); o.line.setAttribute('y2', ny + 12);
o.vis = px > 16 && px < W - 16 && py > 16 && py < H - 16;
});
}

function progress() {
var rr = hero.getBoundingClientRect();
var total = hero.offsetHeight - window.innerHeight;
return clamp(-rr.top / total, 0, 1);
}

/* Камера: между ключевыми кадрами плавный переход, центр не выходит за пределы кадра hero3. */
var fitPortrait = null;
function camera(p) {
var W = stage.clientWidth, H = stage.clientHeight;
var portrait = W < H;
if (portrait !== fitPortrait) {
fitPortrait = portrait;
svg.setAttribute('preserveAspectRatio', portrait ? 'xMidYMid meet' : 'xMidYMid slice');
}
/* На портрете кадр вписан по ширине целиком: без зума, панорамы и обрезки. Выноски остаются на деталях. */
if (portrait) return {s: 1, cx: 800, cy: 450};
var i = 0;
while (i < CAM.length - 2 && p > CAM[i + 1].p) i++;
var a = CAM[i], b = CAM[i + 1];
var t = clamp((p - a.p) / (b.p - a.p), 0, 1);
t = t * t * (3 - 2 * t);
var s = 1 + ((a.s + (b.s - a.s) * t) - 1) * zoomK;
var cx = a.cx + (b.cx - a.cx) * t;
var cy = a.cy + (b.cy - a.cy) * t;
var hw = 800 / s, hh = 450 / s;
return {s: s, cx: clamp(cx, hw, 1600 - hw), cy: clamp(cy, hh, 900 - hh)};
}

/* Видео всегда на паузе: только точные seek-и. Play/rate дают рывки. */
function scrub(p) {
var d = video.duration;
if (!d || !isFinite(d)) return;
if (!video.paused) video.pause();
var target = p * Math.max(0, d - 0.04);
if (!video.seeking && Math.abs(target - video.currentTime) > 0.02) video.currentTime = target;
}

function draw(p) {
var c = camera(p);
world.setAttribute('transform', 'translate(800 450) scale(' + c.s + ') translate(' + (-c.cx) + ' ' + (-c.cy) + ')');
intro.style.opacity = String(1 - clamp((p - .04) / .1, 0, 1));
intro.style.transform = 'translateY(' + (clamp(p / .1, 0, 1) * -24) + 'px)';
scrub(p);
place();
spots.forEach(function (o) {
var a = (p < o.s.from || p > o.s.to) ? 0 : Math.min(1, (p - o.s.from) / .06, o.s.to >= 1 ? 1 : (o.s.to - p) / .06);
/* Карточка остаётся в окне прогресса, даже если точка ушла за кадр; пин и линия скрываются. */
var pa = o.vis ? a : 0;
o.pin.style.opacity = String(pa);
o.note.style.opacity = String(a);
o.line.style.opacity = String(pa);
});
}

/* Сглаживание прогресса по времени кадра: не зависит от частоты экрана, убирает рывки от колеса мыши и тачпада. */
var SMOOTH = 3, smP = 0, lastFrame = 0;
function render(now) {
var target = progress();
if (!lastFrame) smP = target;
var dt = lastFrame ? Math.min(.1, (now - lastFrame) / 1000) : 0;
lastFrame = now;
smP += (target - smP) * (1 - Math.exp(-dt * SMOOTH));
if (Math.abs(target - smP) < .0005) smP = target;
draw(smP);
requestAnimationFrame(render);
}

var io =  new IntersectionObserver(function (entries) {
entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } });
}, {threshold: .12});
document.querySelectorAll('.v2-rv').forEach(function (el) { io.observe(el); });

var area = document.getElementById('v2-area');
var areaOut = document.getElementById('v2-area-out');
var total = document.getElementById('v2-total');
var chips = document.querySelectorAll('.v2-chips button');
var type = 'capital';
function calc() {
var a = +area.value, rate = RATES[type];
area.style.setProperty('--p', ((a - 20) / 130 * 100) + '%');
areaOut.textContent = a + ' м²';
var from = Math.round(a * rate * .92 / 1000) * 1000;
var to = Math.round(a * rate * 1.08 / 1000) * 1000;
total.textContent = fmt(from) + ' – ' + fmt(to);
}
area.addEventListener('input', calc);
for (var j = 0; j < chips.length; j++) {
chips[j].addEventListener('click', function () {
for (var q = 0; q < chips.length; q++) chips[q].setAttribute('aria-pressed', String(chips[q] === this));
type = this.getAttribute('data-type');
calc();
});
}
calc();

var agree = document.getElementById('v2-agree');
var submit = document.getElementById('v2-submit');
var form = document.getElementById('v2-form');
var status = document.getElementById('v2-status');
agree.addEventListener('change', function () { submit.disabled = !agree.checked; });
form.addEventListener('submit', function (e) {
e.preventDefault();
status.textContent = 'Спасибо. Мы свяжемся с вами и назовём смету.';
form.reset();
submit.disabled = true;
});

document.getElementById('v2-year').textContent = new Date().getFullYear();

var TW_KEY = 'lea-v2-tw';
var TW_DEF = {hero:'hero3.jpg', video:true, bright:100, shade:80, zoom:115, fs:100, img:100, gap:100, bg:'graphite', anim:true, font:0, btn:0, pos:{}, color:{}};
/* Первый образец — исходная пара шрифтов сайта. --serif для заголовков, --sans для текста. */
var FONTS = [
{n:'Журнал', d:'Playfair / Manrope', serif:"'Playfair Display',Georgia,serif", sans:"'Manrope',system-ui,sans-serif"},
{n:'Классика', d:'Cormorant / Onest', serif:"'Cormorant Garamond',Georgia,serif", sans:"'Onest',system-ui,sans-serif"},
{n:'Ампир', d:'Yeseva / Manrope', serif:"'Yeseva One',Georgia,serif", sans:"'Manrope',system-ui,sans-serif"},
{n:'Геометрия', d:'Unbounded / Manrope', serif:"'Unbounded',system-ui,sans-serif", sans:"'Manrope',system-ui,sans-serif"},
{n:'Гротеск', d:'Onest', serif:"'Onest',system-ui,sans-serif", sans:"'Onest',system-ui,sans-serif"},
{n:'Узкий', d:'Oswald / Onest', serif:"'Oswald',system-ui,sans-serif", sans:"'Onest',system-ui,sans-serif"},
{n:'Чертёж', d:'JetBrains Mono / Onest', serif:"'JetBrains Mono',monospace", sans:"'Onest',system-ui,sans-serif"},
{n:'Рукопись', d:'Caveat / Onest', serif:"'Caveat',cursive", sans:"'Onest',system-ui,sans-serif"},
{n:'Округлый', d:'Rubik', serif:"'Rubik',system-ui,sans-serif", sans:"'Rubik',system-ui,sans-serif"},
{n:'Брутал', d:'Russo One / Onest', serif:"'Russo One',system-ui,sans-serif", sans:"'Onest',system-ui,sans-serif"}
];
/* Цвета кнопок: градиент фона, градиент при наведении и цвет текста. */
var BTNS = [
{n:'Латунь', bg:'linear-gradient(135deg,#C9A36A,#9C7745)', hv:'linear-gradient(135deg,#F2C98A,#C9A36A)', fg:'#0E0F10'},
{n:'Золото', bg:'linear-gradient(135deg,#F5D27A,#B8860B)', hv:'linear-gradient(135deg,#FFE7A8,#E0A526)', fg:'#0E0F10'},
{n:'Медь', bg:'linear-gradient(135deg,#D9895B,#8A4A2A)', hv:'linear-gradient(135deg,#F0A477,#B0633A)', fg:'#FFF6EE'},
{n:'Пламя', bg:'linear-gradient(120deg,#FF6A2D,#FF2D55)', hv:'linear-gradient(120deg,#FFD682,#FF6A2D)', fg:'#120A08'},
{n:'Закат', bg:'linear-gradient(135deg,#FF9A8B,#FF6A88 50%,#A18CD1)', hv:'linear-gradient(135deg,#FFC3A0,#FF8A9B 50%,#C3B3E6)', fg:'#120A10'},
{n:'Лёд', bg:'linear-gradient(135deg,#E6F0F5,#9FB8C8)', hv:'linear-gradient(135deg,#FFFFFF,#C4D6E0)', fg:'#0E1214'},
{n:'Аметист', bg:'linear-gradient(135deg,#8E7CC3,#4B3A7A)', hv:'linear-gradient(135deg,#B7A6E6,#6A56A8)', fg:'#FFFFFF'},
{n:'Бумага', bg:'linear-gradient(135deg,#F3EFE8,#D9D2C5)', hv:'linear-gradient(135deg,#FFFFFF,#E8E1D4)', fg:'#17191B'}
];
/* Тексты, которые можно сдвигать: ключ → селектор блока. Выноски note1–note4 берутся из HOTSPOTS. */
var TEXTS = [
{k:'kicker', t:'Надпись над заголовком', s:'.v2-kicker'},
{k:'h1', t:'Заголовок hero', s:'.v2-h1'},
{k:'sub', t:'Подзаголовок hero', s:'.v2-sub'},
{k:'ctas', t:'Кнопки hero', s:'.v2-ctas'},
{k:'uslugi', t:'Заголовок «Услуги»', s:'#uslugi .v2-lede'},
{k:'serv', t:'Список услуг', s:'.v2-serv'},
{k:'etapy', t:'Заголовок «Как мы работаем»', s:'#etapy .v2-lede'},
{k:'steps', t:'Шаги процесса', s:'.v2-steps'},
{k:'portfolio', t:'Заголовок «Портфолио»', s:'#portfolio .v2-lede'},
{k:'why', t:'Блок «Почему мы»', s:'.v2-why'},
{k:'calc', t:'Калькулятор', s:'#calc .v2-calc-grid'},
{k:'quotes', t:'Отзывы', s:'.v2-quotes'},
{k:'faq', t:'FAQ', s:'.v2-faq'},
{k:'form', t:'Форма заявки', s:'#zayavka'}
];
var posKey = 'h1';
/* Приоритет: сохранённое в браузере → window.LEA_TW (из экспорта админки) → значения по умолчанию. */
var tw = JSON.parse(JSON.stringify(TW_DEF));
var saved = null;
try { saved = JSON.parse(localStorage.getItem(TW_KEY)); } catch (e) { saved = null; }
var fromCfg = saved || window.LEA_TW || {};
for (var key in fromCfg) tw[key] = fromCfg[key];
tw.pos = tw.pos || {};
tw.color = tw.color || {};
var RANGES = {bright:'tw-bright', shade:'tw-shade', zoom:'tw-zoom', fs:'tw-fs', img:'tw-img', gap:'tw-gap'};
/* Твики применяются ко всем блокам сразу: twRoot работает как набор всех блоков с data-block. */
var allRoots = Array.prototype.slice.call(document.querySelectorAll('.v2[data-block]'));
var twRoot = {
classList: {toggle: function (c, f) { allRoots.forEach(function (r) { r.classList.toggle(c, f); }); }},
style: {setProperty: function (k, v) { allRoots.forEach(function (r) { r.style.setProperty(k, v); }); }}
};
var twPanel = document.getElementById('v2-tw');
var twBtn = document.getElementById('v2-tw-btn');
if (!SHOW_TWEAKS) { twPanel.style.display = 'none'; twBtn.style.display = 'none'; }
var photo = document.getElementById('v2-photo');
var etapy = document.getElementById('etapy');
function save() { try { localStorage.setItem(TW_KEY, JSON.stringify(tw)); } catch (e) {} }
function syncUi() {
Object.keys(RANGES).forEach(function (k) {
document.getElementById(RANGES[k]).value = tw[k];
document.getElementById('o-' + k).textContent = tw[k] + '%';
});
document.querySelectorAll('input[name=hero]').forEach(function (r) { r.checked = r.value === tw.hero; });
document.querySelectorAll('input[name=bg]').forEach(function (r) { r.checked = r.value === tw.bg; });
document.querySelectorAll('input[name=btn]').forEach(function (r) { r.checked = r.value === String(tw.btn); });
document.getElementById('tw-anim').checked = tw.anim;
document.getElementById('tw-video').checked = tw.video;
document.querySelectorAll('input[name=font]').forEach(function (r) { r.checked = r.value === String(tw.font); });
syncPos();
}
function applyFont() {
var f = FONTS[tw.font] || FONTS[0];
twRoot.style.setProperty('--serif', f.serif);
twRoot.style.setProperty('--sans', f.sans);
}
function applyPos() {
TEXTS.forEach(function (x) {
var el = document.querySelector(x.s);
if (!el) return;
var p = tw.pos[x.k] || [0, 0];
el.style.translate = p[0] + 'px ' + p[1] + 'px';
});
}
/* Элемент, которым управляет ключ: текстовый блок или выноска note1–note4. */
function elFor(k) {
if (k.indexOf('note') === 0) { var n = spots[+k.slice(4) - 1]; return n ? n.note : null; }
for (var i = 0; i < TEXTS.length; i++) if (TEXTS[i].k === k) return document.querySelector(TEXTS[i].s);
return null;
}
function applyColor() {
document.querySelectorAll('[data-tc]').forEach(function (n) { n.removeAttribute('data-tc'); });
var css = '';
Object.keys(tw.color).forEach(function (k) {
var el = elFor(k);
if (!el) return;
el.setAttribute('data-tc', k);
css += '[data-tc="' + k + '"], [data-tc="' + k + '"] * {color:' + tw.color[k] + ' !important}\n';
});
var st = document.getElementById('tw-color-style');
if (!st) { st = document.createElement('style'); st.id = 'tw-color-style'; document.head.appendChild(st); }
st.textContent = css;
}
function toHex(c) {
var m = String(c).match(/\d+/g);
if (!m || m.length < 3) return '#ffffff';
return '#' + m.slice(0, 3).map(function (v) { return ('0' + (+v).toString(16)).slice(-2); }).join('');
}
function applyTw() {
photo.setAttribute('href', asset('hero/' + tw.hero));
twRoot.classList.toggle('v2-novideo', !(tw.video && tw.hero === 'hero3.jpg'));
twRoot.style.setProperty('--bright', (tw.bright / 100).toFixed(2));
twRoot.style.setProperty('--shade', (tw.shade / 100).toFixed(2));
twRoot.style.setProperty('--img', (tw.img / 100).toFixed(2));
twRoot.style.setProperty('--gap', (tw.gap / 100).toFixed(2));
twRoot.style.setProperty('--fs', (tw.fs / 100).toFixed(2));
twRoot.classList.toggle('v2-still', !tw.anim);
etapy.setAttribute('data-bg', tw.bg);
applyFont();
applyPos();
applyColor();
var bt = BTNS[tw.btn] || BTNS[0];
twRoot.style.setProperty('--btn-bg', bt.bg);
twRoot.style.setProperty('--btn-hv', bt.hv);
twRoot.style.setProperty('--btn-fg', bt.fg);
}
Object.keys(RANGES).forEach(function (k) {
document.getElementById(RANGES[k]).addEventListener('input', function () {
tw[k] = +this.value;
document.getElementById('o-' + k).textContent = tw[k] + '%';
save(); applyTw();
});
});
document.querySelectorAll('input[name=hero]').forEach(function (r) {
r.addEventListener('change', function () { tw.hero = this.value; save(); applyTw(); });
});
document.querySelectorAll('input[name=bg]').forEach(function (r) {
r.addEventListener('change', function () { tw.bg = this.value; save(); applyTw(); });
});
document.getElementById('tw-anim').addEventListener('change', function () { tw.anim = this.checked; save(); applyTw(); });
document.getElementById('tw-video').addEventListener('change', function () { tw.video = this.checked; save(); applyTw(); });
document.getElementById('tw-reset').addEventListener('click', function () {
tw = JSON.parse(JSON.stringify(TW_DEF)); save(); syncUi(); applyTw();
});
var fontsBox = document.getElementById('tw-fonts');
FONTS.forEach(function (f, i) {
var lab = document.createElement('label');
var inp = document.createElement('input');
inp.type = 'radio'; inp.name = 'font'; inp.value = String(i);
var aa = document.createElement('span');
aa.className = 'aa'; aa.textContent = 'Аа'; aa.style.fontFamily = f.serif;
var sm = document.createElement('small'); sm.textContent = f.n + ' · ' + f.d;
lab.appendChild(inp); lab.appendChild(aa); lab.appendChild(sm);
fontsBox.appendChild(lab);
inp.addEventListener('change', function () { tw.font = i; save(); applyTw(); });
});
BTNS.forEach(function (b, i) {
var lab = document.createElement('label');
var inp = document.createElement('input');
inp.type = 'radio'; inp.name = 'btn'; inp.value = String(i);
inp.style.cssText = 'position:absolute;opacity:0;pointer-events:none';
var sw = document.createElement('span');
sw.className = 'sw'; sw.style.background = b.bg;
lab.style.position = 'relative';
lab.appendChild(inp); lab.appendChild(sw); lab.appendChild(document.createTextNode(' ' + b.n));
document.getElementById('tw-btns').appendChild(lab);
inp.addEventListener('change', function () { tw.btn = i; save(); applyTw(); });
});

var posSel = document.getElementById('tw-pos-sel');
var PAD = {x: 1400, y: 1000};
var pad = document.getElementById('tw-pad'), dot = document.getElementById('tw-dot');
var posOpts = TEXTS.map(function (x) { return {k: x.k, t: x.t}; })
.concat(HOTSPOTS.map(function (h, i) { return {k: 'note' + (i + 1), t: 'Выноска ' + (i + 1) + ': ' + h.title}; }));
posOpts.forEach(function (o) {
var op = document.createElement('option'); op.value = o.k; op.textContent = o.t; posSel.appendChild(op);
});
function syncPos() {
var p = tw.pos[posKey] || [0, 0];
posSel.value = posKey;
dot.style.left = ((p[0] + PAD.x) / (2 * PAD.x) * 100) + '%';
dot.style.top = ((p[1] + PAD.y) / (2 * PAD.y) * 100) + '%';
document.getElementById('o-xy').textContent = 'X ' + p[0] + ' · Y ' + p[1] + ' px';
var colEl = elFor(posKey);
var colIn = document.getElementById('tw-color');
if (colIn) colIn.value = tw.color[posKey] || (colEl ? toHex(getComputedStyle(colEl).color) : '#ffffff');
}
posSel.addEventListener('change', function () { posKey = this.value; syncPos(); });
function setPos(x, y) {
tw.pos[posKey] = [Math.round(clamp(x, -PAD.x, PAD.x)), Math.round(clamp(y, -PAD.y, PAD.y))];
save(); syncPos(); applyPos();
}
function padSet(e) {
var r = pad.getBoundingClientRect();
var nx = clamp((e.clientX - r.left) / r.width, 0, 1), ny = clamp((e.clientY - r.top) / r.height, 0, 1);
setPos(nx * 2 * PAD.x - PAD.x, ny * 2 * PAD.y - PAD.y);
}
pad.addEventListener('pointerdown', function (e) { pad.setPointerCapture(e.pointerId); padSet(e); });
pad.addEventListener('pointermove', function (e) { if (pad.hasPointerCapture(e.pointerId)) padSet(e); });
document.getElementById('tw-pos-reset').addEventListener('click', function () {
delete tw.pos[posKey]; save(); syncPos(); applyPos();
});
var colInput = document.getElementById('tw-color'), colReset = document.getElementById('tw-color-reset');
if (colInput) colInput.addEventListener('input', function () {
tw.color[posKey] = this.value; save(); applyColor();
});
if (colReset) colReset.addEventListener('click', function () {
delete tw.color[posKey]; save(); applyColor(); syncPos();
});
/* Перетаскивание текста прямо на странице, пока открыта панель. Клик по ссылке после сдвига не срабатывает. */
function keyAt(target) {
for (var i = 0; i < spots.length; i++) if (spots[i].note.contains(target)) return spots[i].key;
for (var j = 0; j < TEXTS.length; j++) {
var el = document.querySelector(TEXTS[j].s);
if (el && el.contains(target)) return TEXTS[j].k;
}
return null;
}
var drag = null, dragged = false;
document.addEventListener('pointerdown', function (e) {
dragged = false;
if (!twPanel.classList.contains('is-open') || editing || e.button !== 0 || twPanel.contains(e.target) || twBtn.contains(e.target)) return;
var key = keyAt(e.target);
if (!key) return;
drag = {key: key, x: e.clientX, y: e.clientY, p: (tw.pos[key] || [0, 0]).slice()};
});
document.addEventListener('pointermove', function (e) {
if (!drag) return;
var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
if (!dragged && Math.abs(dx) + Math.abs(dy) < 4) return;
dragged = true;
document.body.style.userSelect = 'none';
posKey = drag.key;
tw.pos[drag.key] = [Math.round(clamp(drag.p[0] + dx, -PAD.x, PAD.x)), Math.round(clamp(drag.p[1] + dy, -PAD.y, PAD.y))];
syncPos(); applyPos();
});
document.addEventListener('pointerup', function () {
if (drag && dragged) save();
drag = null;
document.body.style.userSelect = '';
});
document.addEventListener('click', function (e) {
if (dragged) { e.preventDefault(); e.stopPropagation(); dragged = false; }
}, true);

/* Админка: замочек в футере → пароль → панель. Вход действует до закрытия вкладки. */
var ADMIN_PASS = '101065';
var ADMIN_KEY = 'lea-admin';
var login = document.getElementById('v2-login');
var passIn = document.getElementById('v2-pass');
var loginErr = document.getElementById('v2-login-err');
var expBox = document.getElementById('v2-exp');
function isAdmin() { try { return sessionStorage.getItem(ADMIN_KEY) === '1'; } catch (e) { return false; } }
function setPanel(open) {
twPanel.classList.toggle('is-open', open);
twRoot.classList.toggle('v2-editing', open);
twBtn.setAttribute('aria-expanded', String(open));
}
function showLogin(show) {
login.hidden = !show;
if (show) { loginErr.textContent = ''; passIn.value = ''; setTimeout(function () { passIn.focus(); }, 0); }
}
function tryLogin() {
if (passIn.value === ADMIN_PASS) {
try { sessionStorage.setItem(ADMIN_KEY, '1'); } catch (e) {}
showLogin(false);
setPanel(true);
} else {
loginErr.textContent = 'Неверный пароль';
passIn.select();
}
}
twBtn.addEventListener('click', function () {
if (!isAdmin()) { showLogin(true); return; }
setPanel(!twPanel.classList.contains('is-open'));
});
document.getElementById('v2-login-btn').addEventListener('click', tryLogin);
passIn.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryLogin(); });
document.getElementById('v2-login-x').addEventListener('click', function () { showLogin(false); });
document.getElementById('tw-close').addEventListener('click', function () { setPanel(false); });
document.getElementById('tw-logout').addEventListener('click', function () {
try { sessionStorage.removeItem(ADMIN_KEY); } catch (e) {}
setEditing(false);
setPanel(false);
});
document.addEventListener('keydown', function (e) {
if (e.key !== 'Escape') return;
showLogin(false);
expBox.hidden = true;
});

/* Редактирование текста на странице: нужные элементы становятся contenteditable, черновик хранится по блокам. */
var TEXT_SEL = 'h1,h2,h3,h4,p,li,blockquote,cite,figcaption,.v2-btn,.v2-kicker,.v2-sub,.v2-lede,.v2-h1,.v2-note b,.v2-note span,.v2-consent span';
var pageBlocks = Array.prototype.slice.call(document.querySelectorAll('.v2[data-block]')).filter(function (b) {
return b.getAttribute('data-block') !== 'admin';
});
var editMap = {};
pageBlocks.forEach(function (b) {
var els = Array.prototype.slice.call(b.querySelectorAll(TEXT_SEL)).filter(function (el) {
return !el.closest('.v2-flame-wrap, .v2-holo, .v2-pin');
});
/* Вложенные элементы входят в родителя, чтобы индексы черновика не сбивались. */
editMap[b.getAttribute('data-block')] = els.filter(function (el) {
return !els.some(function (o) { return o !== el && o.contains(el); });
});
});
var editing = false;
function draftKey(name) { return 'lea-text-' + name; }
function restoreDrafts() {
Object.keys(editMap).forEach(function (name) {
var arr = null;
try { arr = JSON.parse(localStorage.getItem(draftKey(name))); } catch (e) { arr = null; }
if (!Array.isArray(arr)) return;
editMap[name].forEach(function (el, i) { if (typeof arr[i] === 'string') el.innerHTML = arr[i]; });
});
}
function saveDraft(name) {
try { localStorage.setItem(draftKey(name), JSON.stringify(editMap[name].map(function (el) { return el.innerHTML; }))); } catch (e) {}
}
function setEditing(on) {
editing = on;
Object.keys(editMap).forEach(function (name) {
editMap[name].forEach(function (el) { if (on) el.setAttribute('contenteditable', 'true'); else el.removeAttribute('contenteditable'); });
});
pageBlocks.forEach(function (b) { b.classList.toggle('v2-txt', on); });
document.getElementById('tw-text').checked = on;
}
pageBlocks.forEach(function (b) {
b.addEventListener('input', function () { if (editing) saveDraft(b.getAttribute('data-block')); });
});
document.addEventListener('click', function (e) {
if (editing && e.target.closest && e.target.closest('[contenteditable=true]')) e.preventDefault();
}, true);
document.getElementById('tw-text').addEventListener('change', function () { setEditing(this.checked); });
document.getElementById('tw-text-reset').addEventListener('click', function () {
Object.keys(editMap).forEach(function (name) { try { localStorage.removeItem(draftKey(name)); } catch (e) {} });
location.reload();
});
restoreDrafts();

/* Экспорт: чистый HTML каждого блока без служебных классов, стилей и черновых состояний. */
var EXPORT_LIMIT = 64 * 1024;
var EXPORT_ORDER = ['top', 'hero', 'services', 'process', 'portfolio', 'why', 'calc', 'reviews', 'faq', 'form', 'footer'];
function cleanBlock(root) {
var c = root.cloneNode(true);
c.classList.remove('v2-novideo', 'v2-still', 'v2-editing', 'v2-txt');
c.querySelectorAll('.v2-holo, #v2-hl line').forEach(function (n) { n.parentNode.removeChild(n); });
c.querySelectorAll('.is-in, .is-ready').forEach(function (n) { n.classList.remove('is-in', 'is-ready'); });
c.querySelectorAll('[contenteditable]').forEach(function (n) { n.removeAttribute('contenteditable'); });
c.querySelectorAll('[data-tc]').forEach(function (n) { n.removeAttribute('data-tc'); });
c.querySelectorAll('.v2-pin, .v2-note, #v2-intro, .v2-flame-glow, .v2-flame-hot, .v2-flame-hot i, .v2-flame-hot b').forEach(function (n) { n.removeAttribute('style'); });
c.querySelectorAll('#v2-world').forEach(function (n) { n.removeAttribute('transform'); });
c.querySelectorAll('.v2-modal').forEach(function (n) { n.hidden = true; });
c.querySelectorAll('#v2-exp-list').forEach(function (n) { n.innerHTML = ''; });
c.querySelectorAll('#v2-tw').forEach(function (n) { n.classList.remove('is-open'); });
c.querySelectorAll('#v2-tw-btn').forEach(function (n) { n.setAttribute('aria-expanded', 'false'); });
c.querySelectorAll('[style]').forEach(function (n) {
n.style.removeProperty('translate');
n.style.removeProperty('--p');
if (!n.getAttribute('style').trim()) n.removeAttribute('style');
});
c.querySelectorAll('video').forEach(function (v) {
v.style.removeProperty('display');
if (!v.getAttribute('style') || !v.getAttribute('style').trim()) v.removeAttribute('style');
});
var ar = c.querySelector('#v2-area');
if (ar) ar.setAttribute('value', area.value);
return c.outerHTML;
}
function copyText(text, btn) {
var done = function () {
btn.textContent = 'Скопировано';
setTimeout(function () { btn.textContent = 'Копировать'; }, 1500);
};
if (navigator.clipboard && window.isSecureContext) {
navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
} else {
fallbackCopy(text);
done();
}
}
function fallbackCopy(text) {
var ta = document.createElement('textarea');
ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
document.body.appendChild(ta); ta.select();
try { document.execCommand('copy'); } catch (e) {}
ta.parentNode.removeChild(ta);
}
function exportItem(it) {
var size = new Blob([it.html]).size;
var wrap = document.createElement('div'); wrap.className = 'v2-exp-item';
var head = document.createElement('div'); head.className = 'v2-exp-head';
var t = document.createElement('b'); t.textContent = it.title;
var s = document.createElement('span');
s.textContent = (size / 1024).toFixed(1) + ' КБ' + (size > EXPORT_LIMIT ? ' — больше 64 КБ, разбейте блок' : '');
if (size > EXPORT_LIMIT) s.className = 'warn';
var copy = document.createElement('button'); copy.type = 'button'; copy.className = 'mini'; copy.textContent = 'Копировать';
copy.addEventListener('click', function () { copyText(it.html, copy); });
var ta = document.createElement('textarea'); ta.readOnly = true; ta.value = it.html;
head.appendChild(t); head.appendChild(s); head.appendChild(copy);
wrap.appendChild(head); wrap.appendChild(ta);
return wrap;
}
/* Загрузчик такой же, как в блоке 12: подключает site.css и site.js с ASSET_BASE. */
function loaderCode() {
return [
'<script>',
'(function () {',
'if (window.__leaLoader) return;',
'window.__leaLoader = true;',
'var base = \'' + ASSET_BASE + '\';',
'var css = document.createElement(\'link\');',
'css.rel = \'stylesheet\';',
'css.href = base + \'site.css\';',
'document.head.appendChild(css);',
'var js = document.createElement(\'script\');',
'js.src = base + \'site.js\';',
'js.async = false;',
'document.body.appendChild(js);',
'})();',
'</script>'
].join('\n');
}
/* Весь сайт (настройки, 11 секций и админка) одним куском для одного T123-блока. */
function exportBlocks() {
var list = document.getElementById('v2-exp-list');
list.innerHTML = '';
var parts = ['<!-- ЛЕА: весь сайт одним кодом, вставить в один T123 HTML-блок -->', '<script>window.LEA_TW = ' + JSON.stringify(tw) + ';</script>'];
EXPORT_ORDER.concat(['admin']).forEach(function (name) {
var root = document.querySelector('.v2[data-block="' + name + '"]');
if (root) parts.push(cleanBlock(root));
});
parts.push(loaderCode());
list.appendChild(exportItem({title: 'Весь сайт одним кодом', html: parts.join('\n')}));
expBox.hidden = false;
}
document.getElementById('tw-export').addEventListener('click', exportBlocks);
document.getElementById('v2-exp-close').addEventListener('click', function () { expBox.hidden = true; });

syncUi();
applyTw();

/* Голографическая стена: сетка 20×20 иероглифов, у курсора они светятся золотом (порт holographic-wall). */
var HOLO_CHARS = ['𓄿','𓇋','𓅱','𓃀','𓊪','𓆑','𓅓','𓈖','𓂋','𓉔','𓎛','𓐍','𓄡','𓋴','𓈙','𓈎','𓎡','𓎼','𓏏','𓂧'];
var HOLO_N = 20, HOLO_R = 200, HOLO_I = 0.8;
var holos = [];
function holoPlace(h) {
var W = h.layer.clientWidth, H = h.layer.clientHeight;
h.cells.forEach(function (c) {
c.x = c.i * W / HOLO_N; c.y = c.j * H / HOLO_N;
c.el.style.left = c.x + 'px'; c.el.style.top = c.y + 'px';
});
}
function holoPaint(h) {
var on = h.mx !== null;
h.cells.forEach(function (c) {
var d = on ? Math.hypot(c.x - h.mx, c.y - h.my) : Infinity;
if (d < HOLO_R) {
var k = (1 - d / HOLO_R) * HOLO_I;
c.el.style.color = 'rgba(255,215,0,' + (0.3 + k) + ')';
c.el.style.transform = 'scale(1.3)';
c.el.style.textShadow = '0 0 ' + (k * 25) + 'px rgba(255,215,0,' + k + ')';
} else {
c.el.style.color = ''; c.el.style.transform = ''; c.el.style.textShadow = '';
}
});
}
/* Подложка на всех секциях, кроме hero с видео: символы подсвечиваются под курсором, без свечения. */
document.querySelectorAll('.v2-sec').forEach(function (host) {
var layer = document.createElement('div');
layer.className = 'v2-holo'; layer.setAttribute('aria-hidden', 'true');
var cells = [];
for (var i = 0; i < HOLO_N; i++) for (var j = 0; j < HOLO_N; j++) {
var s = document.createElement('span');
s.textContent = HOLO_CHARS[Math.floor(Math.random() * HOLO_CHARS.length)];
layer.appendChild(s);
cells.push({el: s, i: i, j: j, x: 0, y: 0});
}
host.insertBefore(layer, host.firstChild);
var h = {layer: layer, cells: cells, mx: null, my: null};
holos.push(h);
host.addEventListener('mousemove', function (e) {
var r = layer.getBoundingClientRect();
h.mx = e.clientX - r.left; h.my = e.clientY - r.top;
holoPaint(h);
});
host.addEventListener('mouseleave', function () { h.mx = null; holoPaint(h); });
});
function holoResize() { holos.forEach(function (h) { holoPlace(h); holoPaint(h); }); }
holoResize();
window.addEventListener('resize', holoResize);

if (reduce) twRoot.classList.toggle('v2-still', true);
requestAnimationFrame(render);
}

/* Блоки Tilda могут появиться не все сразу, поэтому ждём нужные элементы и запускаем один раз. */
var NEED = ['v2-scene', 'v2-video', 'v2-photo', 'v2-flame', 'v2-area', 'v2-form', 'v2-tw', 'v2-tw-btn', 'v2-login', 'v2-exp', 'etapy'];
var tries = 0;
(function waitForBlocks() {
var ready = NEED.every(function (id) { return document.getElementById(id); });
if (ready) {
if (!window.__leaBooted) { window.__leaBooted = true; leaMain(); }
return;
}
if (tries++ < 300) setTimeout(waitForBlocks, 50);
})();
})();

