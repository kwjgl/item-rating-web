/*
 * 미리보기 페이지(items/index.html) — 12문항을 차례로 풀어 보고 결함을 켜고 끈다.
 * 문항 화면은 runtime.js 가 그린다(평정 조사 화면과 같은 코드).
 *
 * 결함 기본값: config.js. 평정 조사에서는 Code.gs 의 DEFECTS 가 기준이다.
 */
(function () {
  'use strict';
  const CFG = window.ITEM_CONFIG, ITEMS = window.ITEMS, RT = window.ItemRuntime;
  const CW = 1280, CH = 800;
  const TYPE_NAME = { choice: '선택형', short: '단답형', drag: '끌어 놓기', match: '선 잇기' };
  const qs = new URLSearchParams(location.search);
  const $ = s => document.querySelector(s);

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
  const scratch = {};     // 문항 id → 연습장 획
  let SCALE = 1, view = null;

  function fit() {
    const stage = $('#stage'), screen = $('#screen'), canvas = $('#canvas');
    const aw = stage.clientWidth - 24, ah = stage.clientHeight - 24;
    SCALE = Math.max(0.3, Math.min(aw / CW, ah / CH, 1.6));
    canvas.style.transform = `scale(${SCALE})`;
    screen.style.width = Math.round(CW * SCALE) + 'px';
    screen.style.height = Math.round(CH * SCALE) + 'px';
    if (view) view.redraw();
  }
  window.addEventListener('resize', fit);

  function render() {
    const it = ITEMS[cur];
    view = RT.mount($('#canvas'), {
      item: it, D, response: state[it.id], pos: cur + 1, total: ITEMS.length,
      answeredAt: i => RT.answered(ITEMS[i], state[ITEMS[i].id]),
      scale: () => SCALE,
      scratch: scratch[it.id] || (scratch[it.id] = {}),
      onChange: r => { state[it.id] = r; },
      onNav: i => { cur = i; render(); }
    });
    renderPanel();
    syncUrl();
  }

  // ---------- 연구자 설정 칸 (?panel=1, 문항 화면 밖) ----------
  const PANEL = qs.get('panel') === '1';
  function renderPanel() {
    if (!PANEL) return;
    const p = $('#rpanel');
    p.hidden = false;
    p.innerHTML = `<h2>연구자 설정</h2>
      <p class="rp-note">문항 화면 밖의 칸이라 평정 대상이 아닙니다. 체크를 바꾸면 이 창에서만 바뀌고, 주소에 반영됩니다. 기본값은 <code>items/config.js</code>, 평정 조사에서는 <code>Code.gs</code>의 DEFECTS 입니다.</p>
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

  // 점검용
  window.__items = { D, on, state, ITEMS, go(i) { cur = i; render(); }, render };

  render();
  fit();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { render(); fit(); });
})();
