/*
 * 문항 화면 엔진 — 플랫폼 틀(연습장·문항 번호·정답 확인)과 응답 조작
 * ------------------------------------------------------------
 * 플랫폼 틀은 모든 문항에 똑같이 그려지고 평정 대상이 아니다.
 * 평정 대상 영역은 #area(.p-main) 안의 .it 하나뿐이다.
 * 조작(끌기·잇기·고르기·입력)은 모든 문항에서 같은 코드로 정상 동작한다.
 * 결함은 items.js 의 화면 설계에서만 생긴다.
 */
(function () {
  'use strict';
  const CFG = window.ITEM_CONFIG, ITEMS = window.ITEMS;
  const CW = 1280, CH = 800;
  const CIRC = ['①', '②', '③', '④', '⑤', '⑥'];
  const TYPE_NAME = { choice: '선택형', short: '단답형', drag: '끌어 놓기', match: '선 잇기' };
  const qs = new URLSearchParams(location.search);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  // ---------- 결함 스위치 ----------
  const on = {};
  Object.keys(CFG.defects).forEach(k => { on[k] = !!CFG.defects[k].on; });
  if (qs.get('clean') === '1') Object.keys(on).forEach(k => { on[k] = false; });
  (qs.get('off') || '').split(',').forEach(k => { if (k in on) on[k] = false; });
  (qs.get('on') || '').split(',').forEach(k => { if (k in on) on[k] = true; });
  function D(k) {
    if (!(k in on)) throw new Error('config.js 에 없는 결함 이름: ' + k);
    return on[k];
  }
  const indicatorOf = id => CFG.indicators.find(x => x.id === id);

  let cur = Math.min(ITEMS.length - 1, Math.max(0, (parseInt(qs.get('item'), 10) || 1) - 1));
  const state = {};       // 문항 id → 응답
  let SCALE = 1;
  let redraw = null;      // 지금 문항의 선 다시 그리기 (선 잇기)

  // ---------- 화면 맞추기: 1280×800 을 통째로 확대·축소 ----------
  function fit() {
    const stage = $('#stage'), screen = $('#screen'), canvas = $('#canvas');
    const aw = stage.clientWidth - 24, ah = stage.clientHeight - 24;
    SCALE = Math.max(0.3, Math.min(aw / CW, ah / CH, 1.6));
    canvas.style.transform = `scale(${SCALE})`;
    screen.style.width = Math.round(CW * SCALE) + 'px';
    screen.style.height = Math.round(CH * SCALE) + 'px';
    if (redraw) redraw();
  }
  window.addEventListener('resize', fit);

  // ---------- 응답 상태 ----------
  function answered(it) {
    const r = state[it.id];
    if (it.type === 'choice') return r != null;
    if (it.type === 'short') return !!String(r || '').trim();
    return !!r && Object.keys(r).length > 0;
  }
  const norm = s => String(s || '').replace(/\s+/g, '').replace(/[.。]$/, '');
  function correct(it) {
    const r = state[it.id];
    if (it.type === 'choice') return r === it.answer;
    if (it.type === 'short') return it.answer.map(norm).indexOf(norm(r)) >= 0;
    if (it.type === 'drag') return it.cards.every(c => r[c.id] === c.ans);
    if (it.type === 'match') {
      const keys = Object.keys(it.answer);
      return keys.length === Object.keys(r).length && keys.every(k => r[k] === it.answer[k]);
    }
    return false;
  }
  function touched() {
    $$('.p-num').forEach((b, i) => b.classList.toggle('done', answered(ITEMS[i])));
    feedback('', '');
  }
  function feedback(text, kind) {
    const f = $('#pFeedback');
    f.textContent = text;
    f.className = 'p-feedback' + (kind ? ' ' + kind : '');
  }

  // ---------- 그리기 ----------
  function render() {
    const it = ITEMS[cur];
    redraw = null;
    $('#pSubject').textContent = it.subject;
    $('#pTitle').textContent = `${it.school === '초' ? '초등학교' : '중학교'} ${it.subject} 평가`;
    $('#pNums').innerHTML = ITEMS.map((x, i) =>
      `<button type="button" class="p-num${i === cur ? ' on' : ''}${answered(x) ? ' done' : ''}" data-go="${i}" aria-label="${x.no}번 문항">${x.no}</button>`).join('');
    $('#pNo').textContent = `${it.no}번`;
    feedback('', '');
    const area = $('#area');
    area.innerHTML = `<div class="it t-${it.type}" id="it" data-item="${it.no}">${it.render(D)}</div>`;
    const root = $('#it');
    if (it.type === 'choice') mountChoice(it, root);
    else if (it.type === 'short') mountShort(it, root);
    else if (it.type === 'drag') mountDrag(it, root);
    else if (it.type === 'match') mountMatch(it, root);
    mountPopup(root);
    Scratch.load(it.id);
    renderPanel();
    syncUrl();
  }

  // 선택형
  function mountChoice(it, root) {
    const ol = $('[data-choices]', root);
    ol.innerHTML = it.choices.map((c, i) =>
      `<li><button type="button" class="i-choice" data-v="${i}" aria-pressed="false"><span class="i-mark">${CIRC[i]}</span><span class="i-ctext">${c}</span></button></li>`).join('');
    const paint = () => $$('.i-choice', ol).forEach(b => {
      const sel = Number(b.dataset.v) === state[it.id];
      b.classList.toggle('on', sel); b.setAttribute('aria-pressed', sel);
    });
    ol.addEventListener('click', e => {
      const b = e.target.closest('.i-choice'); if (!b) return;
      state[it.id] = Number(b.dataset.v); paint(); touched();
    });
    paint();
  }

  // 단답형
  function mountShort(it, root) {
    $$('.i-input', root).forEach(inp => {
      inp.value = state[it.id] || '';
      inp.addEventListener('input', () => { state[it.id] = inp.value; touched(); });
    });
  }

  // 지문 팝업 (5번) — 문두 띠 바로 아래부터 덮는다. 문두는 가리지 않는다.
  function mountPopup(root) {
    const pop = $('.i-pop', root); if (!pop) return;
    const s = $('.i-stem', root);
    pop.style.top = (s.offsetTop + s.offsetHeight + 6) + 'px';
    $('.i-open', root).addEventListener('click', () => { pop.hidden = false; });
    $('.i-pop-close', pop).addEventListener('click', () => { pop.hidden = true; });
  }

  // 끌어 놓기 — 끌기 또는 '누르고 칸 누르기'. 놓은 카드는 다시 옮길 수 있다.
  function mountDrag(it, root) {
    const opts = it.opts ? it.opts(D) : {};
    const st = state[it.id] || (state[it.id] = {});
    const bank = $('[data-bank]', root);
    let selected = null;

    function layout() {
      $$('.i-card', root).forEach(c => c.remove());
      it.cards.forEach(c => {
        const where = st[c.id];
        const host = where ? $(`[data-bin="${where}"] .i-bin-drop`, root) : bank;
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'i-card'; b.dataset.card = c.id; b.innerHTML = c.html;
        b.setAttribute('aria-label', b.textContent);
        if (where && opts.dotInBin) b.classList.add('as-dot');
        host.appendChild(b);
      });
      paintSel();
    }
    function paintSel() {
      $$('.i-card', root).forEach(c => c.classList.toggle('sel', c.dataset.card === selected));
      root.classList.toggle('sel-mode', !!selected);
    }
    function place(cardId, binId) {
      if (binId) {
        const b = it.bins.find(x => x.id === binId);
        if (b && b.cap) {
          const inBin = it.cards.filter(c => st[c.id] === binId && c.id !== cardId);
          if (inBin.length >= b.cap) delete st[inBin[0].id];   // 한 칸에 하나: 있던 카드는 제자리로
        }
        st[cardId] = binId;
      } else delete st[cardId];
      selected = null; layout(); touched();
    }
    function targetAt(x, y) {
      const el = document.elementFromPoint(x, y); if (!el || !root.contains(el)) return null;
      const b = el.closest('[data-bin]'); if (b) return b.dataset.bin;
      return el.closest('[data-bank]') ? 'bank' : null;
    }
    function hot(x, y) {
      $$('.hot', root).forEach(e => e.classList.remove('hot'));
      const t = targetAt(x, y); if (!t) return;
      (t === 'bank' ? bank : $(`[data-bin="${t}"]`, root)).classList.add('hot');
    }

    root.addEventListener('pointerdown', e => {
      const card = e.target.closest('.i-card'); if (!card || e.button > 0) return;
      e.preventDefault();
      const id = card.dataset.card, sx = e.clientX, sy = e.clientY;
      let ghost = null;
      card.setPointerCapture(e.pointerId);
      const move = ev => {
        if (!ghost && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) {
          ghost = card.cloneNode(true);
          ghost.classList.add('ghost'); ghost.classList.remove('sel');
          ghost.style.width = card.offsetWidth + 'px';
          ghost.style.transform = `translate(-50%, -50%) scale(${SCALE})`;
          $('#ghostHost').appendChild(ghost);
          card.classList.add('dragging');
        }
        if (ghost) { ghost.style.left = ev.clientX + 'px'; ghost.style.top = ev.clientY + 'px'; hot(ev.clientX, ev.clientY); }
      };
      const up = ev => {
        card.removeEventListener('pointermove', move);
        card.removeEventListener('pointerup', up);
        card.removeEventListener('pointercancel', up);
        $$('.hot', root).forEach(x => x.classList.remove('hot'));
        if (ghost) {
          ghost.remove(); card.classList.remove('dragging');
          const t = targetAt(ev.clientX, ev.clientY);
          if (t) place(id, t === 'bank' ? null : t); else { selected = null; paintSel(); }
        } else {
          selected = selected === id ? null : id; paintSel();
        }
      };
      card.addEventListener('pointermove', move);
      card.addEventListener('pointerup', up);
      card.addEventListener('pointercancel', up);
    });
    root.addEventListener('click', e => {
      if (!selected || e.target.closest('.i-card')) return;
      const b = e.target.closest('[data-bin]');
      if (b) place(selected, b.dataset.bin);
      else if (e.target.closest('[data-bank]')) place(selected, null);
    });
    layout();
  }

  // 선 잇기 — 끌어서 잇기 또는 두 칸 차례로 누르기. 선을 누르면 지워진다.
  function mountMatch(it, root) {
    const box = $('[data-match]', root);
    const left = typeof it.left === 'function' ? it.left(D) : it.left;
    const right = typeof it.right === 'function' ? it.right(D) : it.right;
    const st = state[it.id] || (state[it.id] = {});
    const node = (side, n) =>
      `<button type="button" class="i-node" data-side="${side}" data-id="${n.id}"><span class="i-node-t">${n.html}</span><span class="i-dot"></span></button>`;
    box.innerHTML = `<div class="i-col left">${left.map(n => node('L', n)).join('')}</div>
      <div class="i-col right">${right.map(n => node('R', n)).join('')}</div>
      <svg class="i-lines" aria-hidden="true"></svg>`;
    const svg = $('.i-lines', box);
    let pend = null, temp = null;

    function dotXY(side, id) {
      const d = $(`.i-node[data-side="${side}"][data-id="${id}"] .i-dot`, box);
      const r = d.getBoundingClientRect(), b = box.getBoundingClientRect();
      return [(r.left + r.width / 2 - b.left) / SCALE, (r.top + r.height / 2 - b.top) / SCALE];
    }
    function draw() {
      let h = '';
      Object.keys(st).forEach(L => {
        const a = dotXY('L', L), z = dotXY('R', st[L]);
        h += `<line x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}"/>` +
             `<line class="hit" data-l="${L}" x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}"/>`;
      });
      svg.innerHTML = h;
      if (temp) svg.insertAdjacentHTML('beforeend', `<line class="tmp" x1="${temp[0]}" y1="${temp[1]}" x2="${temp[2]}" y2="${temp[3]}"/>`);
      $$('.i-node', box).forEach(n => {
        const linked = n.dataset.side === 'L' ? st[n.dataset.id] != null : Object.values(st).indexOf(n.dataset.id) >= 0;
        n.classList.toggle('linked', linked);
        n.classList.toggle('pending', !!pend && pend.side === n.dataset.side && pend.id === n.dataset.id);
      });
    }
    function connect(a, b) {
      const L = a.side === 'L' ? a.id : b.id, R = a.side === 'L' ? b.id : a.id;
      Object.keys(st).forEach(k => { if (st[k] === R) delete st[k]; });
      st[L] = R; pend = null; draw(); touched();
    }
    svg.addEventListener('click', e => {
      const l = e.target.closest('line.hit'); if (!l) return;
      delete st[l.dataset.l]; draw(); touched();
    });
    box.addEventListener('pointerdown', e => {
      const n = e.target.closest('.i-node'); if (!n || e.button > 0) return;
      e.preventDefault();
      const me = { side: n.dataset.side, id: n.dataset.id };
      if (pend && pend.side !== me.side) { connect(pend, me); return; }
      if (pend && pend.id === me.id) { pend = null; draw(); return; }
      pend = me; draw();
      const sx = e.clientX, sy = e.clientY; let drag = false;
      n.setPointerCapture(e.pointerId);
      const move = ev => {
        if (!drag && Math.hypot(ev.clientX - sx, ev.clientY - sy) > 6) drag = true;
        if (!drag) return;
        const a = dotXY(me.side, me.id), b = box.getBoundingClientRect();
        temp = [a[0], a[1], (ev.clientX - b.left) / SCALE, (ev.clientY - b.top) / SCALE];
        draw();
      };
      const up = ev => {
        n.removeEventListener('pointermove', move); n.removeEventListener('pointerup', up); n.removeEventListener('pointercancel', up);
        if (!drag) return;                      // 누르기만 했으면 짝을 기다린다
        temp = null;
        const el = document.elementFromPoint(ev.clientX, ev.clientY);
        const t = el && el.closest('.i-node');
        if (t && box.contains(t) && t.dataset.side !== me.side) connect(me, { side: t.dataset.side, id: t.dataset.id });
        else { pend = null; draw(); }
      };
      n.addEventListener('pointermove', move); n.addEventListener('pointerup', up); n.addEventListener('pointercancel', up);
    });
    redraw = draw;
    draw();
  }

  // ---------- 연습장 (플랫폼 공통) ----------
  const Scratch = (function () {
    const strokes = {};       // 문항 id → 획 목록
    let id = null, open = false, cv, ctx, layer;
    function init() {
      layer = $('#scratch'); cv = $('#scratchCanvas'); ctx = cv.getContext('2d');
      let curStroke = null;
      cv.addEventListener('pointerdown', e => {
        const r = cv.getBoundingClientRect();
        curStroke = [[(e.clientX - r.left) / SCALE, (e.clientY - r.top) / SCALE]];
        (strokes[id] = strokes[id] || []).push(curStroke);
        cv.setPointerCapture(e.pointerId);
      });
      cv.addEventListener('pointermove', e => {
        if (!curStroke) return;
        const r = cv.getBoundingClientRect();
        curStroke.push([(e.clientX - r.left) / SCALE, (e.clientY - r.top) / SCALE]); paint();
      });
      const end = () => { curStroke = null; };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      $('#scratchClear').addEventListener('click', () => { strokes[id] = []; paint(); });
      $('#scratchClose').addEventListener('click', () => toggle(false));
      $('#pScratch').addEventListener('click', () => toggle(!open));
    }
    function size() {
      const main = $('.p-main');
      cv.width = main.offsetWidth; cv.height = main.offsetHeight;
    }
    function paint() {
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = '#1D4ED8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      (strokes[id] || []).forEach(s => {
        ctx.beginPath(); s.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke();
      });
    }
    function toggle(v) {
      open = v; layer.hidden = !v;
      $('#pScratch').classList.toggle('on', v);
      $('#pScratch').setAttribute('aria-pressed', v);
      if (v) { size(); paint(); }
    }
    return { init, load(newId) { id = newId; toggle(false); } };
  })();

  // ---------- 연구자 설정 칸 (?panel=1, 문항 화면 밖) ----------
  const PANEL = qs.get('panel') === '1';
  function renderPanel() {
    if (!PANEL) return;
    const p = $('#rpanel');
    p.hidden = false;
    p.innerHTML = `<h2>연구자 설정</h2>
      <p class="rp-note">문항 화면 밖의 칸이라 평정 대상이 아닙니다. 체크를 바꾸면 이 창에서만 바뀌고, 주소에 반영됩니다. 기본값은 <code>items/config.js</code>에서 바꿉니다.</p>
      <div class="rp-btns"><button type="button" data-all="1">결함 모두 켜기</button><button type="button" data-all="0">결함 모두 끄기</button><button type="button" data-all="cfg">설정 파일대로</button></div>
      <ol class="rp-list">${ITEMS.map((it, i) => {
        const df = it.defect ? CFG.defects[it.defect] : null;
        const ind = df ? indicatorOf(df.indicator) : null;
        return `<li class="${i === cur ? 'cur' : ''}">
          <button type="button" class="rp-go" data-go="${i}">${it.no}. ${it.school} · ${it.subject} · ${TYPE_NAME[it.type]}</button>
          <div class="rp-ind">${ind ? ind.name : '결함 없음'}</div>
          ${df ? `<label class="rp-sw"><input type="checkbox" data-def="${it.defect}" ${on[it.defect] ? 'checked' : ''}> 결함 켜기 <code>${it.defect}</code></label><div class="rp-what">${df.what}</div>` : ''}
        </li>`;
      }).join('')}</ol>`;
  }
  document.addEventListener('change', e => {
    const k = e.target.dataset && e.target.dataset.def;
    if (k) { on[k] = e.target.checked; render(); }
  });
  document.addEventListener('click', e => {
    const all = e.target.closest('[data-all]');
    if (all) {
      Object.keys(on).forEach(k => { on[k] = all.dataset.all === 'cfg' ? !!CFG.defects[k].on : all.dataset.all === '1'; });
      render(); return;
    }
    const go = e.target.closest('[data-go]');
    if (go) { cur = Number(go.dataset.go); render(); }
  });
  function syncUrl() {
    const p = new URLSearchParams();
    p.set('item', ITEMS[cur].no);
    if (PANEL) p.set('panel', '1');
    const offs = Object.keys(on).filter(k => CFG.defects[k].on && !on[k]);
    const ons = Object.keys(on).filter(k => !CFG.defects[k].on && on[k]);
    if (offs.length) p.set('off', offs.join(','));
    if (ons.length) p.set('on', ons.join(','));
    history.replaceState(null, '', '?' + p.toString());
  }

  // ---------- 정답 확인 (플랫폼 공통) ----------
  $('#pCheck').addEventListener('click', () => {
    const it = ITEMS[cur];
    if (!answered(it)) { feedback('먼저 답을 해 보세요.', 'warn'); return; }
    if (correct(it)) feedback('정답입니다.', 'ok');
    else feedback('다시 생각해 보세요.', 'no');
  });

  // 시험·점검용으로 바깥에서 읽을 수 있게 둔다
  window.__items = { D, on, state, ITEMS, go(i) { cur = i; render(); }, render };

  Scratch.init();
  render();
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fit(); render(); });
})();
