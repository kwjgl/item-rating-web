/*
 * 문항 화면 공용 모듈 — 플랫폼 틀(연습장·문항 번호·정답 확인)과 응답 조작
 * ------------------------------------------------------------
 * 미리보기(items/index.html)와 평정 조사 화면(/index.html)이 함께 쓴다.
 *
 *   ItemRuntime.mount(canvas, opts) — canvas(1280×800 고정 크기 칸) 안에 플랫폼 틀과 문항 하나를 그린다.
 *     opts.item     : items.js 의 문항 하나
 *     opts.D        : 결함 스위치 함수 D('이름') → true/false
 *     opts.response : 이 문항의 지금 응답(없으면 null). 다시 그릴 때 이어서 보여 준다
 *     opts.pos, opts.total : 플랫폼 번호 칸에 보일 '몇 번째 / 모두 몇 개'
 *     opts.answeredAt(i)   : i번째(0부터) 번호 칸에 '푼 문항' 표시를 할지
 *     opts.scale()  : 지금 화면 배율 (끌기·선 잇기 좌표 계산)
 *     opts.scratch  : 연습장 획을 담아 둘 객체(문항을 오가도 남게). 없으면 새로 만든다
 *     opts.onChange(resp) : 응답이 바뀔 때마다 (resp 는 복사본, 응답이 비면 null)
 *     opts.onEvent(name)  : 'check'(정답 확인) · 'scratch'(연습장 열기) · 'passage'(지문 팝업 열기)
 *     opts.onNav(i)       : 번호 칸을 눌렀을 때(0부터). 없으면 번호 칸은 눌리지 않는다
 *   반환값: { redraw() } — 창 크기가 바뀌면 불러 선 잇기의 선을 다시 그린다
 *
 *   ItemRuntime.answered(item, resp), ItemRuntime.correct(item, resp) — 응답 여부·정답 여부
 *
 * 조작(고르기·입력·끌기·잇기)은 모든 문항에서 같은 코드로 정상 동작한다.
 * 결함은 items.js 의 화면 설계에서만 생긴다.
 */
(function () {
  'use strict';
  const CIRC = ['①', '②', '③', '④', '⑤', '⑥'];
  const $ = (s, r) => r.querySelector(s);
  const $$ = (s, r) => Array.from(r.querySelectorAll(s));
  const clone = v => (v == null ? v : JSON.parse(JSON.stringify(v)));

  function answered(it, r) {
    if (it.type === 'choice') return r != null;
    if (it.type === 'short') return !!String(r || '').trim();
    return !!r && Object.keys(r).length > 0;
  }
  const norm = s => String(s || '').replace(/\s+/g, '').replace(/[.。]$/, '');
  function correct(it, r) {
    if (!answered(it, r)) return null;
    if (it.type === 'choice') return r === it.answer;
    if (it.type === 'short') return it.answer.map(norm).indexOf(norm(r)) >= 0;
    if (it.type === 'drag') return it.cards.every(c => r[c.id] === c.ans);
    if (it.type === 'match') {
      const keys = Object.keys(it.answer);
      return keys.length === Object.keys(r).length && keys.every(k => r[k] === it.answer[k]);
    }
    return null;
  }

  const FRAME = `<div class="p-frame">
    <header class="p-top">
      <span class="p-subject"></span><span class="p-title"></span><span class="p-no"></span>
      <button type="button" class="p-tool p-scratch-btn" aria-pressed="false">✎ 연습장</button>
    </header>
    <div class="p-body">
      <main class="p-main" aria-label="문항 화면">
        <div class="p-area"></div>
        <div class="p-scratch" hidden>
          <canvas aria-label="연습장"></canvas>
          <div class="p-scratch-bar"><span>연습장</span>
            <button type="button" class="p-scratch-clear">모두 지우기</button>
            <button type="button" class="p-scratch-close">닫기</button></div>
        </div>
      </main>
      <aside class="p-side">
        <div class="p-side-t">문항 번호</div>
        <div class="p-nums"></div>
        <div class="p-feedback" role="status" aria-live="polite"></div>
        <button type="button" class="p-check">정답 확인</button>
      </aside>
    </div>
  </div>`;

  function ghostHost() {
    let h = document.getElementById('ghostHost');
    if (!h) { h = document.createElement('div'); h.id = 'ghostHost'; document.body.appendChild(h); }
    return h;
  }

  function mount(canvas, o) {
    const it = o.item, D = o.D, scale = o.scale || (() => 1);
    const onChange = o.onChange || (() => {});
    const onEvent = o.onEvent || (() => {});
    let resp = clone(o.response);
    let redraw = null;

    canvas.innerHTML = FRAME;
    const F = $('.p-frame', canvas);

    // ---- 플랫폼 틀 ----
    $('.p-subject', F).textContent = it.subject;
    $('.p-title', F).textContent = `${it.school === '초' ? '초등학교' : '중학교'} ${it.subject} 평가`;
    $('.p-no', F).textContent = `${o.pos}번`;
    const nums = [];
    for (let i = 0; i < o.total; i++) {
      const done = o.answeredAt ? o.answeredAt(i) : false;
      nums.push(`<button type="button" class="p-num${i === o.pos - 1 ? ' on' : ''}${done ? ' done' : ''}" data-i="${i}"` +
        `${o.onNav ? '' : ' tabindex="-1"'} aria-label="${i + 1}번 문항">${i + 1}</button>`);
    }
    $('.p-nums', F).innerHTML = nums.join('');
    $('.p-nums', F).addEventListener('click', e => {
      const b = e.target.closest('.p-num'); if (b && o.onNav) o.onNav(Number(b.dataset.i));
    });
    const fb = $('.p-feedback', F);
    const feedback = (t, k) => { fb.textContent = t; fb.className = 'p-feedback' + (k ? ' ' + k : ''); };
    $('.p-check', F).addEventListener('click', () => {
      onEvent('check');
      const c = correct(it, resp);
      if (c === null) feedback('먼저 답을 해 보세요.', 'warn');
      else feedback(c ? '정답입니다.' : '다시 생각해 보세요.', c ? 'ok' : 'no');
    });
    function changed() {
      const empty = !answered(it, resp);
      const cur = $(`.p-num[data-i="${o.pos - 1}"]`, F);
      if (cur) cur.classList.toggle('done', !empty);
      feedback('', '');
      onChange(empty ? null : clone(resp));
    }

    // ---- 문항 화면 ----
    const area = $('.p-area', F);
    area.innerHTML = `<div class="it t-${it.type}" data-item="${it.id}">${it.render(D)}</div>`;
    const root = $('.it', area);
    if (it.type === 'choice') mountChoice();
    else if (it.type === 'short') mountShort();
    else if (it.type === 'drag') mountDrag();
    else if (it.type === 'match') mountMatch();
    mountPopup();
    mountScratch();

    function mountChoice() {
      const ol = $('[data-choices]', root);
      ol.innerHTML = it.choices.map((c, i) =>
        `<li><button type="button" class="i-choice" data-v="${i}" aria-pressed="false"><span class="i-mark">${CIRC[i]}</span><span class="i-ctext">${c}</span></button></li>`).join('');
      const paint = () => $$('.i-choice', ol).forEach(b => {
        const sel = Number(b.dataset.v) === resp;
        b.classList.toggle('on', sel); b.setAttribute('aria-pressed', sel);
      });
      ol.addEventListener('click', e => {
        const b = e.target.closest('.i-choice'); if (!b) return;
        resp = Number(b.dataset.v); paint(); changed();
      });
      paint();
    }

    function mountShort() {
      $$('.i-input', root).forEach(inp => {
        inp.value = resp || '';
        inp.addEventListener('input', () => { resp = inp.value; changed(); });
      });
    }

    // 지문 팝업 (5번) — 문두 띠 바로 아래부터 덮는다. 문두는 가리지 않는다.
    function mountPopup() {
      const pop = $('.i-pop', root); if (!pop) return;
      const s = $('.i-stem', root);
      pop.style.top = (s.offsetTop + s.offsetHeight + 6) + 'px';
      $('.i-open', root).addEventListener('click', () => { pop.hidden = false; onEvent('passage'); });
      $('.i-pop-close', pop).addEventListener('click', () => { pop.hidden = true; });
    }

    // 끌어 놓기 — 끌기 또는 '누르고 칸 누르기'. 놓은 카드는 다시 옮길 수 있다.
    function mountDrag() {
      const opts = it.opts ? it.opts(D) : {};
      resp = resp || {};
      const bank = $('[data-bank]', root);
      let selected = null;

      function layout() {
        $$('.i-card', root).forEach(c => c.remove());
        it.cards.forEach(c => {
          const where = resp[c.id];
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
            const inBin = it.cards.filter(c => resp[c.id] === binId && c.id !== cardId);
            if (inBin.length >= b.cap) delete resp[inBin[0].id];   // 한 칸에 하나: 있던 카드는 제자리로
          }
          resp[cardId] = binId;
        } else delete resp[cardId];
        selected = null; layout(); changed();
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
            ghost.style.fontSize = getComputedStyle(card).fontSize;
            ghost.style.transform = `translate(-50%, -50%) scale(${scale()})`;
            ghostHost().appendChild(ghost);
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
            const t = ev.type === 'pointercancel' ? null : targetAt(ev.clientX, ev.clientY);
            if (t) place(id, t === 'bank' ? null : t); else { selected = null; paintSel(); }
          } else if (ev.type !== 'pointercancel') {
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
    function mountMatch() {
      const box = $('[data-match]', root);
      const left = typeof it.left === 'function' ? it.left(D) : it.left;
      const right = typeof it.right === 'function' ? it.right(D) : it.right;
      resp = resp || {};
      const node = (side, n) =>
        `<button type="button" class="i-node" data-side="${side}" data-id="${n.id}"><span class="i-node-t">${n.html}</span><span class="i-dot"></span></button>`;
      box.innerHTML = `<div class="i-col left">${left.map(n => node('L', n)).join('')}</div>
        <div class="i-col right">${right.map(n => node('R', n)).join('')}</div>
        <svg class="i-lines" aria-hidden="true"></svg>`;
      const svg = $('.i-lines', box);
      let pend = null, temp = null;

      function dotXY(side, id) {
        const d = $(`.i-node[data-side="${side}"][data-id="${id}"] .i-dot`, box);
        const r = d.getBoundingClientRect(), b = box.getBoundingClientRect(), k = scale();
        return [(r.left + r.width / 2 - b.left) / k, (r.top + r.height / 2 - b.top) / k];
      }
      function draw() {
        let h = '';
        Object.keys(resp).forEach(L => {
          const a = dotXY('L', L), z = dotXY('R', resp[L]);
          h += `<line x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}"/>` +
               `<line class="hit" data-l="${L}" x1="${a[0]}" y1="${a[1]}" x2="${z[0]}" y2="${z[1]}"/>`;
        });
        svg.innerHTML = h;
        if (temp) svg.insertAdjacentHTML('beforeend', `<line class="tmp" x1="${temp[0]}" y1="${temp[1]}" x2="${temp[2]}" y2="${temp[3]}"/>`);
        $$('.i-node', box).forEach(n => {
          const linked = n.dataset.side === 'L' ? resp[n.dataset.id] != null : Object.values(resp).indexOf(n.dataset.id) >= 0;
          n.classList.toggle('linked', linked);
          n.classList.toggle('pending', !!pend && pend.side === n.dataset.side && pend.id === n.dataset.id);
        });
      }
      function connect(a, b) {
        const L = a.side === 'L' ? a.id : b.id, R = a.side === 'L' ? b.id : a.id;
        Object.keys(resp).forEach(k => { if (resp[k] === R) delete resp[k]; });
        resp[L] = R; pend = null; draw(); changed();
      }
      svg.addEventListener('click', e => {
        const l = e.target.closest('line.hit'); if (!l) return;
        delete resp[l.dataset.l]; draw(); changed();
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
          const a = dotXY(me.side, me.id), b = box.getBoundingClientRect(), k = scale();
          temp = [a[0], a[1], (ev.clientX - b.left) / k, (ev.clientY - b.top) / k];
          draw();
        };
        const up = ev => {
          n.removeEventListener('pointermove', move); n.removeEventListener('pointerup', up); n.removeEventListener('pointercancel', up);
          if (!drag) return;                      // 누르기만 했으면 짝을 기다린다
          temp = null;
          const el = ev.type === 'pointercancel' ? null : document.elementFromPoint(ev.clientX, ev.clientY);
          const t = el && el.closest('.i-node');
          if (t && box.contains(t) && t.dataset.side !== me.side) connect(me, { side: t.dataset.side, id: t.dataset.id });
          else { pend = null; draw(); }
        };
        n.addEventListener('pointermove', move); n.addEventListener('pointerup', up); n.addEventListener('pointercancel', up);
      });
      redraw = draw;
      draw();
    }

    // 연습장 (플랫폼 공통)
    function mountScratch() {
      const layer = $('.p-scratch', F), cv = $('canvas', layer), ctx = cv.getContext('2d'), btn = $('.p-scratch-btn', F);
      const store = o.scratch || {};
      store.strokes = store.strokes || [];
      let curStroke = null;
      const pt = e => { const r = cv.getBoundingClientRect(), k = scale(); return [(e.clientX - r.left) / k, (e.clientY - r.top) / k]; };
      function paint() {
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.strokeStyle = '#1D4ED8'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        store.strokes.forEach(s => { ctx.beginPath(); s.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.stroke(); });
      }
      function toggle(v) {
        layer.hidden = !v; btn.classList.toggle('on', v); btn.setAttribute('aria-pressed', v);
        if (v) { const m = $('.p-main', F); cv.width = m.offsetWidth; cv.height = m.offsetHeight; paint(); onEvent('scratch'); }
      }
      cv.addEventListener('pointerdown', e => { curStroke = [pt(e)]; store.strokes.push(curStroke); cv.setPointerCapture(e.pointerId); });
      cv.addEventListener('pointermove', e => { if (curStroke) { curStroke.push(pt(e)); paint(); } });
      const end = () => { curStroke = null; };
      cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
      $('.p-scratch-clear', F).addEventListener('click', () => { store.strokes.length = 0; paint(); });
      $('.p-scratch-close', F).addEventListener('click', () => toggle(false));
      btn.addEventListener('click', () => toggle(layer.hidden));
    }

    return { redraw() { if (redraw) redraw(); } };
  }

  window.ItemRuntime = { mount, answered, correct };
})();
