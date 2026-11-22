/*
 * 평정용 24문항 — 초등 세트(E01~E12) · 중등 세트(M01~M12)
 * ------------------------------------------------------------
 * render(D) 는 문항 화면(평정 대상 영역) HTML 을 돌려준다.
 * D('E03') 처럼 문항 id 로 그 문항의 결함 스위치(true/false)를 읽는다.
 * 결함이 꺼지면 같은 문항의 '결함 없는 판'이 그려진다.
 *
 * type: choice(선택형) · short(단답형) · drag(끌어 놓기) · match(선 잇기)
 * 엔진(runtime.js)이 data-choices / .i-input / data-bank·data-bin / data-match 자리에 응답 요소를 채운다.
 *
 * [그림 파일] ART 표의 그림은 items/assets/ 에 파일이 있으면 그 파일을, 없으면 아래의 임시 SVG를 보여 준다.
 *   그림 작업 지시서: items/assets/README.md
 */
(function () {
  'use strict';

  // 이 파일이 있는 폴더 기준으로 assets/ 를 찾는다 (미리보기와 평정 조사 화면 모두에서 맞게)
  const HERE = ((document.currentScript && document.currentScript.src) || '').replace(/[^/]*$/, '');
  const ASSETS = HERE + 'assets/';
  // 그림 이름 → 파일 이름 (PNG 로 받으면 확장자만 바꾸면 된다)
  const ART = {
    strata: 'e03-strata.svg',
    heatRoom: 'm03-heat-room.svg',
    fish: 'e11-crucian-carp.svg',
    squirrel: 'e11-squirrel.svg',
    sparrow: 'e11-sparrow.svg',
    vValley: 'm12-v-valley.svg',
    alluvialFan: 'm12-alluvial-fan.svg',
    delta: 'm12-delta.svg'
  };
  // 그림 칸: 임시 SVG 위에 그림 파일을 덮는다. 파일이 없으면(불러오기 실패) 그림 파일만 지워져 임시 SVG가 보인다.
  // overlay 는 맨 위에 덧그리는 SVG(화살표·기호). 그림 파일과 같은 viewBox 를 쓴다.
  function art(name, vw, vh, fallback, overlay, label) {
    return `<div class="i-art" style="aspect-ratio:${vw}/${vh}" role="img" aria-label="${label}">
      <svg class="i-art-fb" viewBox="0 0 ${vw} ${vh}" aria-hidden="true">${fallback}</svg>
      <img src="${ASSETS}${ART[name]}" alt="" onerror="this.remove()">
      ${overlay ? `<svg class="i-art-ov" viewBox="0 0 ${vw} ${vh}" aria-hidden="true">${overlay}</svg>` : ''}
    </div>`;
  }
  // 그림 파일만 (없으면 아무것도 안 보임) — 선 잇기 칸 속 작은 그림처럼 글자가 함께 있는 자리
  const icon = (name, alt) => `<img class="i-icon" src="${ASSETS}${ART[name]}" alt="${alt}" onerror="this.remove()">`;

  // [평정 근거 요소] data-el 이 붙은 요소는 평정할 때 문항 화면 위에 ①②… 번호가 붙고,
  // 교사가 '미충족'의 근거로 고를 수 있다. key 는 분석용 이름(시트에 남음), name 은 교사에게 보이는 이름.
  // 결함 문항마다 '의도한 결함 요소'의 key 는 Code.gs 의 DEFECTS.elements 에 있다.
  const el = (key, name) => ` data-el="${key}" data-el-name="${name}"`;

  // 응답 방식 안내 — 같은 형식의 문항은 모두 같은 문구를 쓴다
  const G = {
    choice: '',
    short: '',
    drag: '카드를 끌어 칸에 놓거나, 카드를 누른 뒤 칸을 누르세요. 놓은 카드는 다시 옮길 수 있습니다.',
    match: '왼쪽 점에서 오른쪽 점으로 끌거나 차례로 누르면 선이 이어집니다. 선을 누르면 지워집니다.'
  };
  // 선택형·단답형은 실제 평가 화면처럼 안내 문장 없이 화면 표시(원 번호 선택지, 테두리 있는 입력 칸)로 응답 방식을 알린다.
  // 끌어 놓기·선 잇기는 조작 방법이 화면만으로 드러나지 않으므로 짧은 안내를 둔다.
  const guide = t => (G[t] ? `<p class="i-guide"${el('guide', '응답 방법 안내')}>${G[t]}</p>` : '');
  // 문두. 앞에 runtime.js 가 문항 번호(.i-qno)를 붙인다
  const stem = h => `<div class="i-stem"${el('stem', '문두')}><span class="i-stem-t">${h}</span></div>`;
  // 국어 지시문 ("다음 글을 읽고, 물음에 답하세요.") — 지문 칸 맨 위
  const direction = t => `<p class="i-direction"${el('direction', '지시문')}>${t}</p>`;
  // 좌우 나눔: 왼쪽 = 지시문·지문·자료, 오른쪽 = 문두·응답 (디지털 평가 화면의 기본 틀)
  const split = (left, right) => `<div class="i-split"><section class="i-pane l">${left}</section><section class="i-pane r">${right}</section></div>`;
  const CHOICES = `<ol class="i-choices" data-choices data-el="resp" data-el-name="선택지"></ol>`;
  const fr = (a, b, sign) => `<span class="frac-wrap">${sign || ''}<span class="frac" aria-label="${b}분의 ${a}"><span>${a}</span><span>${b}</span></span></span>`;
  const bin = (id, label) => `<div class="i-bin" data-bin="${id}"><div class="i-bin-label">${label}</div><div class="i-bin-drop"></div></div>`;
  const dragArea = (bins, extraClass) => `${guide('drag')}
    <div class="i-bank${extraClass ? ' ' + extraClass : ''}" data-bank aria-label="카드가 있는 곳"${el('bank', '카드')}></div>
    <div class="i-bins c${bins.length}"${el('bins', '카드 놓는 칸')}>${bins.map(b => bin(b[0], b[1])).join('')}</div>`;
  // 정보 선별 결함: 풀이에 쓰이지 않는 덧붙임 지식 상자 (평범한 글상자, 그림·강조 없음)
  const extra = t => `<aside class="i-extra"${el('extra', '더 알아보기 상자')}><p class="i-extra-h">더 알아보기</p><p>${t}</p></aside>`;
  // 장식 절제 결함: 문두 옆의 큰 정지 캐릭터 (움직임·글 없음)
  // 장식 절제 결함: 문두 옆의 큰 정지 캐릭터 (지문 내용과 관련 있는 모습. 움직임·글자·말풍선 없음, 풀이 단서 없음)
  const mascot = (body, name) => `<svg class="i-mascot" viewBox="0 0 200 200" aria-hidden="true" data-el="mascot" data-el-name="${name}">${body}</svg>`;
  // E02 '개미의 더듬이' — 웃는 개미
  const MASCOT_ANT = mascot(`
    <ellipse cx="100" cy="190" rx="70" ry="8" fill="#E7E2D4"/>
    <g stroke="#3B2A20" stroke-width="5" stroke-linecap="round" fill="none">
      <path d="M78 128 L52 150 L40 176"/><path d="M92 134 L84 160 L80 184"/><path d="M110 134 L118 160 L122 184"/>
      <path d="M124 128 L150 150 L162 176"/>
      <path d="M84 52 Q70 20 50 14"/><path d="M110 52 Q128 20 150 16"/>
    </g>
    <circle cx="50" cy="14" r="7" fill="#3B2A20"/><circle cx="150" cy="16" r="7" fill="#3B2A20"/>
    <ellipse cx="148" cy="138" rx="40" ry="32" fill="#8B4A2B"/>
    <ellipse cx="102" cy="120" rx="24" ry="20" fill="#9C5733"/>
    <circle cx="96" cy="78" r="38" fill="#A9603A"/>
    <ellipse cx="82" cy="74" rx="9" ry="11" fill="#fff"/><ellipse cx="112" cy="74" rx="9" ry="11" fill="#fff"/>
    <circle cx="84" cy="76" r="5" fill="#2A1A12"/><circle cx="114" cy="76" r="5" fill="#2A1A12"/>
    <ellipse cx="72" cy="92" rx="8" ry="5" fill="#E98A6B" opacity=".8"/><ellipse cx="122" cy="92" rx="8" ry="5" fill="#E98A6B" opacity=".8"/>
    <path d="M86 96 Q97 106 108 96" stroke="#2A1A12" stroke-width="4" fill="none" stroke-linecap="round"/>`, '개미 캐릭터 그림');
  // M02 '바닷물은 왜 짤까' — 웃는 고래
  const MASCOT_WHALE = mascot(`
    <ellipse cx="100" cy="190" rx="76" ry="8" fill="#DCE8F2"/>
    <path d="M100 52 Q96 30 84 22 M100 52 Q104 28 118 22 M100 52 L100 26" stroke="#7FB8E6" stroke-width="6" fill="none" stroke-linecap="round"/>
    <path d="M24 120 Q24 62 100 60 Q172 62 172 118 Q172 168 100 170 Q40 170 24 120 Z" fill="#4A8FD0"/>
    <path d="M168 120 Q186 92 198 96 Q190 118 198 142 Q186 146 168 128 Z" fill="#3B7BBE"/>
    <path d="M30 128 Q60 160 110 162 Q150 160 166 132 Q150 150 104 152 Q60 150 30 128 Z" fill="#CFE5F7"/>
    <circle cx="66" cy="104" r="10" fill="#fff"/><circle cx="68" cy="106" r="5.5" fill="#1C2E44"/>
    <ellipse cx="54" cy="126" rx="9" ry="5" fill="#F29C9C" opacity=".8"/>
    <path d="M40 132 Q56 146 74 136" stroke="#1C2E44" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M96 150 Q110 168 132 158" stroke="#3B7BBE" stroke-width="5" fill="none" stroke-linecap="round"/>`, '고래 캐릭터 그림');
  const stemFig = (fig, h) => `<div class="i-stem with-fig"${el('stem', '문두')}><span class="i-stem-t">${h}</span>${fig || ''}</div>`;
  // 근접 배치 결함: 비교할 두 자료를 왼쪽 위·오른쪽 아래로 떨어뜨림. 끄면 한 자료 상자에 나란히.
  function compare(far, stemHtml, a, b, resp, wide, names) {
    if (far) {
      return stemHtml + `<div class="i-far"><section class="i-data far-a"${el('dataA', names[0])}>${a}</section>` +
        `<section class="i-resp far-r">${resp}</section><section class="i-data far-b"${el('dataB', names[1])}>${b}</section></div>`;
    }
    const box = `<div class="i-data fig${wide ? '' : ' fit'}"${el('data', names[0] + '·' + names[1])}><div class="i-figs">${a}${b}</div></div>`;
    return `${stemHtml}${box}<div class="i-below"><section class="i-resp">${resp}</section></div>`;
  }
  // 응답 방식 인지 결함: 입력 칸이 본문 괄호와 똑같이 보이고 입력 안내가 없다. 끄면 입력 칸 표시와 안내.
  function blankAnswer(hidden, before, after, width) {
    const w = width ? ` style="width:${width}"` : '';
    return (hidden ? '' : guide('short')) + `<div class="i-ansbox"${el('resp', '답 칸')}><p class="i-ansbox-h">답</p><p>${before}${hidden
      ? `(<input class="i-input inline bare" autocomplete="off" aria-label="답"${w}>)`
      : `<input class="i-input inline" autocomplete="off" aria-label="답" placeholder="눌러서 쓰기"${w}>`}${after}</p></div>`;
  }
  // 지문·자료 참조 결함: 지문을 [지문 보기] 팝업으로만 보여 주고, 팝업이 문두 아래의 응답 영역을 덮는다(문두는 가리지 않음).
  // 끄면 왼쪽 칸에 지시문·지문, 오른쪽 칸에 문두·응답.
  function passageOrPopup(popup, dirText, stemHtml, passage, respInner) {
    if (!popup) return split(direction(dirText) + `<div class="i-data scroll"${el('data', '지문')}>${passage}</div>`, stemHtml + respInner);
    return stemHtml + `<section class="i-resp"><button type="button" class="i-open"${el('popup', '지문 보기 단추(팝업 지문)')}>지문 보기</button>${respInner}</section>
      <div class="i-pop" hidden><div class="i-pop-card"><button type="button" class="i-pop-close">닫기 ✕</button><p class="i-direction">${dirText}</p>${passage}</div></div>`;
  }

  // ---------------- 그림 (임시 SVG) ----------------

  // E03 지층 단면 — viewBox 0 0 900 600. 층 경계 y≈150·300·450, 층마다 무늬는 같고 색만 다르다.
  const STRATA_COLORS = ['#E8C547', '#6E9E4B', '#9AA0A6', '#8C6A43'];   // 노랑, 초록, 회색, 갈색 (위 → 아래)
  const STRATA_FB = (() => {
    const edge = [20, 150, 300, 450, 590];
    const wave = (y, k) => `M0 ${y} C150 ${y - 10 + k} 300 ${y + 10} 450 ${y} S750 ${y - 8} 900 ${y + 4}`;
    let s = '<defs><pattern id="e03dots" width="24" height="24" patternUnits="userSpaceOnUse"><circle cx="6" cy="6" r="2.2" fill="#000" fill-opacity=".14"/><circle cx="18" cy="16" r="1.6" fill="#000" fill-opacity=".12"/></pattern></defs>';
    s += '<rect width="900" height="600" fill="#F4F1E8"/>';
    for (let i = 0; i < 4; i++) {
      const top = wave(edge[i], i * 3), y2 = edge[i + 1];
      const body = `${top} L900 ${y2 + 4} ${i === 3 ? '' : ''}L900 ${y2 + 30} L0 ${y2 + 30} Z`;
      s += `<path d="${i === 3 ? `${top} L900 600 L0 600 Z` : body}" fill="${STRATA_COLORS[i]}"/>`;
    }
    for (let i = 1; i < 4; i++) s += `<path d="${wave(edge[i], i * 3)}" stroke="#4A4235" stroke-opacity=".45" stroke-width="3" fill="none"/>`;
    s += '<rect y="20" width="900" height="580" fill="url(#e03dots)"/>';
    return s;
  })();
  const STRATA_LABELS = [85, 225, 375, 520].map((y, i) =>
    `<g><circle cx="840" cy="${y}" r="30" fill="#fff" stroke="#222" stroke-width="3"/><text x="840" y="${y + 12}" text-anchor="middle" font-size="34" font-weight="700" fill="#222">${'㉠㉡㉢㉣'[i]}</text></g>`).join('');

  // M03 열의 이동 — viewBox 0 0 480 330. 배경(방·난로·냄비·사람)은 그림 파일, 화살표·기호는 덧그림.
  const HEAT_FB = `
    <rect x="6" y="6" width="468" height="318" rx="8" fill="#FBFBF8" stroke="#C9CFD6" stroke-width="2"/>
    <line x1="6" y1="300" x2="474" y2="300" stroke="#9AA3AE" stroke-width="3"/>
    <rect x="46" y="196" width="96" height="104" rx="6" fill="#6B7280"/>
    <rect x="66" y="222" width="56" height="44" rx="4" fill="#2B2F36"/>
    <path d="M94 262 C80 250 86 238 94 228 C96 240 106 242 102 254 C108 250 110 244 108 238 C116 248 112 262 94 262 z" fill="#F2A33A"/>
    <rect x="56" y="166" width="76" height="30" rx="4" fill="#9AA3AE"/>
    <rect x="132" y="176" width="96" height="9" rx="4" fill="#B6BDC6" stroke="#8D96A1" stroke-width="1.5"/>
    <circle cx="410" cy="168" r="20" fill="#F1D2B4" stroke="#8D6E57" stroke-width="2"/>
    <path d="M410 188 L410 262 M410 262 L392 298 M410 262 L428 298" stroke="#5B6573" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M410 206 L372 236" stroke="#5B6573" stroke-width="7" stroke-linecap="round"/>
    <circle cx="368" cy="239" r="8" fill="#F1D2B4" stroke="#8D6E57" stroke-width="2"/>`;
  function heatOverlay(labels) {
    const tag = (x, y, t) => labels
      ? `<g><circle cx="${x}" cy="${y}" r="17" fill="#fff" stroke="#333" stroke-width="2"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="21" font-weight="700" fill="#222">${t}</text></g>` : '';
    const mk = (id, c) => `<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${c}"/></marker>`;
    return `<defs>${mk('ah-r', '#C8382E')}${mk('ah-g', '#3E8E2C')}${mk('ah-b', '#2B5CC4')}</defs>
      <path d="M140 160 L212 160" stroke="#C8382E" stroke-width="7" fill="none" marker-end="url(#ah-r)"/>
      <path d="M94 150 C92 40, 300 30, 318 130" stroke="#2B5CC4" stroke-width="7" fill="none" marker-end="url(#ah-b)"/>
      <path d="M152 244 L340 244" stroke="#3E8E2C" stroke-width="7" fill="none" marker-end="url(#ah-g)"/>
      ${tag(176, 134, '㉠')}${tag(206, 70, '㉡')}${tag(246, 272, '㉢')}`;
  }

  // E06 모눈 위 도형. 모눈 한 칸 = 1 cm²
  function gridFigure(cols, rows, poly, label) {
    const c = 30, w = cols * c, h = rows * c;
    let lines = '';
    for (let i = 0; i <= cols; i++) lines += `<line x1="${i * c}" y1="0" x2="${i * c}" y2="${h}"/>`;
    for (let j = 0; j <= rows; j++) lines += `<line x1="0" y1="${j * c}" x2="${w}" y2="${j * c}"/>`;
    const pts = poly.map(p => `${p[0] * c},${p[1] * c}`).join(' ');
    return `<figure class="i-fig"><figcaption>${label}</figcaption>
      <svg viewBox="-2 -2 ${w + 4} ${h + 4}" width="${w + 4}" height="${h + 4}" role="img" aria-label="모눈 위의 도형 ${label}">
        <g stroke="#C3CAD3" stroke-width="1.2">${lines}</g>
        <polygon points="${pts}" fill="#CFE0F7" fill-opacity=".85" stroke="#2E5FA8" stroke-width="3"/>
      </svg></figure>`;
  }
  const FIG_A = gridFigure(7, 5, [[1, 1], [6, 1], [6, 4], [1, 4]], '(가)');                      // 15
  const FIG_B = gridFigure(6, 6, [[1, 1], [3, 1], [3, 3], [5, 3], [5, 5], [1, 5]], '(나)');      // 12

  // M06 가열 곡선. 같은 눈금(0~120 ℃, 0~10분)으로 그린 두 그래프
  function heatCurve(label, bp) {
    const W = 400, H = 250, L = 56, T = 14, R = 12, B = 44, pw = W - L - R, ph = H - T - B;
    const x = m => L + (m / 10) * pw, y = t => T + ph - (t / 120) * ph;
    let g = '';
    for (let t = 0; t <= 120; t += 20) g += `<line x1="${L}" y1="${y(t)}" x2="${W - R}" y2="${y(t)}" stroke="#D5DBE2"/><text x="${L - 8}" y="${y(t) + 6}" text-anchor="end" font-size="16" fill="#333">${t}</text>`;
    for (let m = 0; m <= 10; m += 2) g += `<line x1="${x(m)}" y1="${T}" x2="${x(m)}" y2="${T + ph}" stroke="#EEF1F4"/><text x="${x(m)}" y="${T + ph + 22}" text-anchor="middle" font-size="16" fill="#333">${m}</text>`;
    const t1 = (bp - 20) / 20;   // 1분에 20 ℃씩 오른다고 보고 끓기 시작하는 시각
    const pts = [[0, 20], [t1, bp], [t1 + 4, bp], [Math.min(10, t1 + 4 + (120 - bp) / 20), Math.min(120, bp + (10 - t1 - 4) * 20)]];
    return `<figure class="i-fig graph"><figcaption>${label}</figcaption>
      <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="물질 ${label}의 가열 곡선">
        ${g}
        <line x1="${L}" y1="${T}" x2="${L}" y2="${T + ph}" stroke="#333" stroke-width="2"/>
        <line x1="${L}" y1="${T + ph}" x2="${W - R}" y2="${T + ph}" stroke="#333" stroke-width="2"/>
        <text x="14" y="${T + ph / 2}" font-size="15" fill="#333" transform="rotate(-90 14 ${T + ph / 2})" text-anchor="middle">온도(℃)</text>
        <text x="${L + pw / 2}" y="${H - 2}" font-size="15" fill="#333" text-anchor="middle">가열 시간(분)</text>
        <polyline points="${pts.map(p => `${x(p[0])},${y(p[1])}`).join(' ')}" fill="none" stroke="#2E5FA8" stroke-width="4" stroke-linejoin="round"/>
      </svg></figure>`;
  }

  // E07 고장 안내도 (곳마다 그림과 이름 글자가 함께 있다)
  const TOWN_MAP = `<svg viewBox="0 0 460 380" role="img" aria-label="학교를 가운데에 두고 동서남북에 도서관, 우체국, 시장, 공원이 있는 고장 안내도">
    <rect x="2" y="2" width="456" height="376" rx="8" fill="#FAFAF6" stroke="#C9CFD6" stroke-width="2"/>
    <path d="M230 40 L230 340 M50 200 L410 200" stroke="#D5D9DE" stroke-width="26" stroke-linecap="round"/>
    <g transform="translate(52 62)"><path d="M0 -30 L10 6 L0 0 L-10 6 z" fill="#333"/><text x="0" y="-36" text-anchor="middle" font-size="20" font-weight="700" fill="#222">북</text></g>
    <g transform="translate(230 200)"><rect x="-34" y="-26" width="68" height="44" fill="#fff" stroke="#444" stroke-width="2.5"/><path d="M-40 -26 L0 -48 L40 -26 z" fill="#fff" stroke="#444" stroke-width="2.5"/><rect x="-8" y="-2" width="16" height="20" fill="#444"/><text x="0" y="46" text-anchor="middle" font-size="21" font-weight="700" fill="#222">학교</text></g>
    <g transform="translate(230 66)"><rect x="-26" y="-20" width="52" height="34" rx="3" fill="#fff" stroke="#444" stroke-width="2.5"/><path d="M0 -14 L0 10 M-18 -12 Q-9 -16 0 -12 Q9 -16 18 -12 L18 10 Q9 6 0 10 Q-9 6 -18 10 z" fill="none" stroke="#444" stroke-width="2"/><text x="40" y="8" font-size="21" fill="#222">도서관</text></g>
    <g transform="translate(384 200)"><rect x="-24" y="-18" width="48" height="34" fill="#fff" stroke="#444" stroke-width="2.5"/><path d="M-24 -18 L0 2 L24 -18" fill="none" stroke="#444" stroke-width="2.5"/><text x="0" y="44" text-anchor="middle" font-size="21" fill="#222">우체국</text></g>
    <g transform="translate(230 330)"><path d="M-30 -8 L-24 -26 L24 -26 L30 -8 z" fill="#fff" stroke="#444" stroke-width="2.5"/><rect x="-26" y="-8" width="52" height="22" fill="#fff" stroke="#444" stroke-width="2.5"/><text x="40" y="10" font-size="21" fill="#222">시장</text></g>
    <g transform="translate(76 200)"><circle cx="0" cy="-14" r="18" fill="#fff" stroke="#444" stroke-width="2.5"/><path d="M0 4 L0 20" stroke="#444" stroke-width="4"/><text x="0" y="46" text-anchor="middle" font-size="21" fill="#222">공원</text></g>
  </svg>`;

  // M12 지형 — viewBox 0 0 400 300. 임시 그림(모식도)
  const LAND_FB = {
    vValley: `<rect width="400" height="300" fill="#DCEBF5"/>
      <path d="M0 40 L170 250 L230 250 L400 40 L400 300 L0 300 Z" fill="#8FA876"/>
      <path d="M0 40 L170 250 L200 250 L60 40 Z" fill="#7A9363"/>
      <path d="M170 250 L230 250 L215 300 L185 300 Z" fill="#4F8CC9"/>
      <path d="M190 250 C195 270 205 280 200 300" stroke="#2E6FB0" stroke-width="5" fill="none"/>`,
    alluvialFan: `<rect width="400" height="300" fill="#DCEBF5"/>
      <path d="M0 0 L400 0 L400 90 L250 120 L150 120 L0 90 Z" fill="#7A9363"/>
      <path d="M200 120 L40 300 L360 300 Z" fill="#D9C08A"/>
      <path d="M200 120 L200 300 M200 120 L110 300 M200 120 L290 300" stroke="#B89B5E" stroke-width="3" fill="none"/>
      <path d="M200 40 L200 120" stroke="#4F8CC9" stroke-width="7"/>`,
    delta: `<rect width="400" height="300" fill="#4F8CC9"/>
      <path d="M0 0 L400 0 L400 60 L240 90 L160 90 L0 60 Z" fill="#8FA876"/>
      <path d="M200 90 L70 260 Q200 300 330 260 Z" fill="#D9C08A"/>
      <path d="M200 20 L200 90 M200 90 L120 240 M200 90 L200 270 M200 90 L280 240" stroke="#2E6FB0" stroke-width="5" fill="none"/>`
  };
  const landNode = (name, tag, alt) =>
    `<span class="i-land"><b>${tag}</b>${art(name, 400, 300, LAND_FB[name], '', alt)}</span>`;

  // ---------------- 문항 ----------------
  // 배치: 국어(지문 있음)는 split(왼쪽 = 지시문·지문, 오른쪽 = 문두·응답), 그 밖의 교과는 한 단(문두 → 그림·자료 → 응답).
  //       자료가 없는 문항은 문두 바로 아래 응답. 문두 앞 문항 번호는 runtime.js 가 붙인다.
  const DIR_TEXT = '다음 글을 읽고, 물음에 답하세요.';
  const DIR_POEM = '다음 시를 읽고, 물음에 답하세요.';
  const ITEMS = [
    // ======================= 초등 세트 =======================
    // E01 ─ 과학·끌어 놓기 ─ 정보 선별
    {
      id: 'E01', set: 'E', no: 1, school: '초', subject: '과학', type: 'drag',
      cards: [
        { id: 'c1', html: '돌멩이', ans: 'solid' }, { id: 'c2', html: '우유', ans: 'liquid' },
        { id: 'c3', html: '풍선 속 공기', ans: 'gas' }, { id: 'c4', html: '얼음', ans: 'solid' },
        { id: 'c5', html: '식용유', ans: 'liquid' }, { id: 'c6', html: '축구공 속 공기', ans: 'gas' }
      ],
      bins: [{ id: 'solid' }, { id: 'liquid' }, { id: 'gas' }],
      render: D => stem('다음 물체를 고체, 액체, 기체로 나누어 알맞은 칸에 끌어다 놓으세요.') +
        `<section class="i-resp">${dragArea([['solid', '고체'], ['liquid', '액체'], ['gas', '기체']])}</section>` +
        (D('E01') ? extra('‘물질’은 ‘물건의 바탕’이라는 뜻을 가진 낱말이에요. 우리 주변의 물체는 모두 물질로 이루어져 있어요.') : '')
    },

    // E02 ─ 국어·선택형 ─ 장식 절제
    {
      id: 'E02', set: 'E', no: 2, school: '초', subject: '국어', type: 'choice',
      choices: [
        '개미에게 더듬이는 아주 중요한 기관입니다.',
        '개미는 더듬이로 냄새를 맡습니다.',
        '개미는 더듬이로 친구를 알아봅니다.',
        '더듬이가 다치면 개미는 길을 잃기도 합니다.'
      ],
      answer: 0,
      render: D => split(direction(DIR_TEXT) +
          `<div class="i-data i-ptext scroll"${el('data', '지문')}><p class="i-phead">개미의 더듬이</p>
            <p class="i-para">개미에게 더듬이는 아주 중요한 기관입니다. 개미는 더듬이로 냄새를 맡아 먹이가 있는 곳을 찾습니다. 또 더듬이를 서로 맞대어 같은 집에 사는 친구인지 알아봅니다. 그래서 더듬이가 다치면 개미는 길을 잃기도 합니다.</p></div>`,
        stemFig(D('E02') && MASCOT_ANT, '이 글의 중심 문장으로 알맞은 것은 무엇인가요?') + guide('choice') + CHOICES)
    },

    // E03 ─ 과학·선택형 ─ 색 외 구분 단서
    {
      id: 'E03', set: 'E', no: 3, school: '초', subject: '과학', type: 'choice',
      choices: D => D('E03')
        ? ['노란색 층', '갈색 층', '초록색 층', '회색 층']
        : ['㉠ 층', '㉣ 층', '㉡ 층', '㉢ 층'],
      answer: 1,
      render: D => stem('그림은 어느 곳의 지층을 나타낸 것입니다. 이 지층에서 가장 먼저 쌓인 층은 어느 것인가요? (단, 지층은 뒤집히지 않았습니다.)') +
        `<div class="i-data fig" style="max-width:360px"${el('data', '지층 그림')}>${art('strata', 900, 600, STRATA_FB, D('E03') ? '' : STRATA_LABELS, '네 개의 층이 수평으로 쌓인 지층 단면 그림')}</div>` + CHOICES
    },

    // E04 ─ 수학·단답형 ─ 핵심 정보 강조
    {
      id: 'E04', set: 'E', no: 4, school: '초', subject: '수학', type: 'short',
      answer: ['22'],
      render: D => stem(D('E04')
        ? '<span class="x1">어떤 수에</span> <span class="x3">5를</span> <span class="x4">더해야 할 것을</span> <span class="x2">잘못하여</span> <span class="x5">뺐더니</span> <span class="x3">12가</span> 되었습니다. <span class="x1">바르게</span> <span class="x4">계산하면</span> <span class="x2">얼마인가요</span>?'
        : '어떤 수에 5를 더해야 할 것을 잘못하여 뺐더니 12가 되었습니다. <span class="em-key">바르게 계산하면</span> 얼마인가요?') +
        `<section class="i-resp narrow">${guide('short')}
          <p class="i-answer-line"${el('resp', '답 입력 칸')}>답: <input class="i-input num" inputmode="numeric" autocomplete="off" aria-label="답" placeholder="숫자"></p></section>`
    },

    // E05 ─ 국어·선 잇기 ─ 지문·자료 참조
    {
      id: 'E05', set: 'E', no: 5, school: '초', subject: '국어', type: 'match',
      left: [{ id: 'a', html: '㉠ 고대했다' }, { id: 'b', html: '㉡ 옹기종기' }, { id: 'c', html: '㉢ 꼿꼿하게' }],
      right: [{ id: 'r1', html: '굽지 않고 곧게' }, { id: 'r2', html: '몹시 기다렸다' }, { id: 'r3', html: '크게 실망했다' }, { id: 'r4', html: '작은 것들이 모여 있는 모양' }],
      answer: { a: 'r2', b: 'r4', c: 'r1' },
      render: D => passageOrPopup(D('E05'), DIR_TEXT,
        stem('㉠~㉢의 뜻을 짐작하여 알맞게 선으로 이으세요.'),
        `<div class="i-ptext">
          <p class="i-para">우리 반은 화단에 강낭콩을 심었다. 나는 매일 아침 물을 주며 싹이 트기를 <span class="i-smark"><b>㉠</b><u>고대했다</u></span>. 일주일쯤 지나자 흙을 뚫고 연두색 싹이 고개를 내밀었다. 친구들은 신기해하며 화단 앞에 <span class="i-smark"><b>㉡</b><u>옹기종기</u></span> 모여들었다.</p>
          <p class="i-para">그런데 며칠 뒤 세찬 비가 내려 몇몇 싹이 쓰러지고 말았다. 우리는 막대기를 세우고 끈으로 줄기를 묶어 주었다. 다행히 싹들은 다시 <span class="i-smark"><b>㉢</b><u>꼿꼿하게</u></span> 일어섰다.</p></div>`,
        `${guide('match')}<div class="i-match stack${D('E05') ? ' solo' : ''}" data-match${el('resp', '선 잇기 칸')}></div>`)
    },

    // E06 ─ 수학·단답형 ─ 관련 정보 근접 배치
    {
      id: 'E06', set: 'E', no: 6, school: '초', subject: '수학', type: 'short',
      answer: ['3'],
      render: D => compare(D('E06'), stem('모눈 한 칸의 넓이는 1 cm²입니다. 도형 (가)와 (나)의 넓이의 차는 몇 cm²인가요?'),
        FIG_A, FIG_B, `${guide('short')}
          <p class="i-answer-line"${el('resp', '답 입력 칸')}><input class="i-input num" inputmode="numeric" autocomplete="off" aria-label="답" placeholder="숫자"> cm²</p>`, false, ['도형 (가)', '도형 (나)'])
    },

    // E07 ─ 사회·단답형 ─ 응답 방식 인지
    {
      id: 'E07', set: 'E', no: 7, school: '초', subject: '사회', type: 'short',
      answer: ['도서관'],
      render: D => stem('다음은 어느 고장의 안내도입니다. 학교의 북쪽에 있는 곳은 어디인가요?') +
        `<div class="i-data fig" style="max-width:380px"${el('data', '안내도')}>${TOWN_MAP}</div>` +
        `<section class="i-resp narrow">${blankAnswer(D('E07'), '학교의 북쪽에는 ', '이/가 있습니다.')}</section>`
    },

    // E08 ─ 사회·끌어 놓기 ─ 응답 결과 표시
    {
      id: 'E08', set: 'E', no: 8, school: '초', subject: '사회', type: 'drag',
      opts: D => ({ dotInBin: D('E08') }),
      cards: [
        { id: 'k1', html: '논과 밭이 넓게 펼쳐져 있다', ans: 'farm' },
        { id: 'k2', html: '배가 드나드는 항구가 있다', ans: 'fish' },
        { id: 'k3', html: '산비탈에 계단식 밭이 있다', ans: 'mount' },
        { id: 'k4', html: '비닐하우스에서 채소를 기른다', ans: 'farm' },
        { id: 'k5', html: '바다에서 김이나 미역을 기른다', ans: 'fish' },
        { id: 'k6', html: '숲에서 버섯을 기른다', ans: 'mount' }
      ],
      bins: [{ id: 'farm' }, { id: 'fish' }, { id: 'mount' }],
      render: () => stem('촌락의 모습을 나타낸 카드를 알맞은 칸에 끌어다 놓으세요.') +
        `<section class="i-resp">${dragArea([['farm', '농촌'], ['fish', '어촌'], ['mount', '산지촌']])}</section>`
    },

    // E09 ─ 국어·선택형 ─ 결함 없음
    {
      id: 'E09', set: 'E', no: 9, school: '초', subject: '국어', type: 'choice',
      choices: ['교실에서 실내화를 신자.', '교실 청소를 더 자주 하자.', '바닥에 앉아서 활동하지 말자.', '운동화를 깨끗하게 빨아 신자.'],
      answer: 0,
      render: () => split(direction(DIR_TEXT) +
          `<div class="i-data i-ptext scroll"${el('data', '지문')}><p class="i-phead">교실에서 실내화를 신자</p>
            <p class="i-para">우리 반 친구들은 교실에서도 운동화를 그대로 신고 다닌다. 그래서 바닥에 흙과 모래가 쌓이고, 청소를 해도 금방 더러워진다. 바닥에 앉아 활동할 때에는 옷도 쉽게 더러워진다. 교실에서 실내화를 신으면 바닥을 깨끗하게 지킬 수 있다. 우리 모두 교실에 들어올 때 실내화로 갈아 신자.</p></div>`,
        stem('글쓴이의 생각으로 알맞은 것은 무엇인가요?') + guide('choice') + CHOICES)
    },

    // E10 ─ 수학·끌어 놓기 ─ 결함 없음
    {
      id: 'E10', set: 'E', no: 10, school: '초', subject: '수학', type: 'drag',
      cards: [
        { id: 'f34', html: fr(3, 4), ans: 's2' }, { id: 'f23', html: fr(2, 3), ans: 's1' }, { id: 'f56', html: fr(5, 6), ans: 's3' }
      ],
      bins: [{ id: 's1', cap: 1 }, { id: 's2', cap: 1 }, { id: 's3', cap: 1 }],
      render: () => stem('세 분수를 작은 수부터 차례로 빈칸에 끌어다 놓으세요.') +
        `<section class="i-resp">${guide('drag')}
          <div class="i-bank frac-bank" data-bank aria-label="카드가 있는 곳"${el('bank', '카드')}></div>
          <div class="i-slots"${el('bins', '카드 놓는 칸')}>${bin('s1', '가장 작은 수')}<span class="i-lt" aria-hidden="true">&lt;</span>${bin('s2', '두 번째 수')}<span class="i-lt" aria-hidden="true">&lt;</span>${bin('s3', '가장 큰 수')}</div>
        </section>`
    },

    // E11 ─ 과학·선 잇기 ─ 결함 없음
    {
      id: 'E11', set: 'E', no: 11, school: '초', subject: '과학', type: 'match',
      left: [
        { id: 'fish', html: `${icon('fish', '')}붕어` },
        { id: 'sq', html: `${icon('squirrel', '')}다람쥐` },
        { id: 'bird', html: `${icon('sparrow', '')}참새` }
      ],
      right: [{ id: 'walk', html: '다리로 걷거나 뛰어다닌다' }, { id: 'fly', html: '날개로 날아다닌다' }, { id: 'swim', html: '지느러미로 헤엄친다' }],
      answer: { fish: 'swim', sq: 'walk', bird: 'fly' },
      render: () => stem('동물과 그 동물이 움직이는 방법을 알맞게 선으로 이으세요.') +
        `<section class="i-resp">${guide('match')}<div class="i-match wide-right" data-match${el('resp', '선 잇기 칸')}></div></section>`
    },

    // E12 ─ 사회·선 잇기 ─ 결함 없음
    {
      id: 'E12', set: 'E', no: 12, school: '초', subject: '사회', type: 'match',
      left: [{ id: 'fire', html: '소방서' }, { id: 'health', html: '보건소' }, { id: 'lib', html: '도서관' }, { id: 'police', html: '경찰서' }],
      right: [
        { id: 'book', html: '책을 빌려 주고 읽을 곳을 마련한다' },
        { id: 'rescue', html: '불을 끄고 위험에 빠진 사람을 구한다' },
        { id: 'order', html: '범죄를 막고 교통질서를 지킨다' },
        { id: 'vacc', html: '예방 접종 등 주민의 건강을 돌본다' }
      ],
      answer: { fire: 'rescue', health: 'vacc', lib: 'book', police: 'order' },
      render: () => stem('우리 고장의 공공 기관과 그곳에서 하는 일을 알맞게 선으로 이으세요.') +
        `<section class="i-resp">${guide('match')}<div class="i-match wide-right" data-match${el('resp', '선 잇기 칸')}></div></section>`
    },

    // ======================= 중등 세트 =======================
    // M01 ─ 사회·끌어 놓기 ─ 정보 선별
    {
      id: 'M01', set: 'M', no: 1, school: '중', subject: '사회', type: 'drag',
      cards: [
        { id: 'p1', html: '풍부한 일자리', ans: 'pull' }, { id: 'p2', html: '잦은 분쟁과 전쟁', ans: 'push' },
        { id: 'p3', html: '높은 임금 수준', ans: 'pull' }, { id: 'p4', html: '낮은 소득 수준', ans: 'push' },
        { id: 'p5', html: '부족한 교육·의료 시설', ans: 'push' }, { id: 'p6', html: '쾌적한 주거 환경', ans: 'pull' }
      ],
      bins: [{ id: 'pull' }, { id: 'push' }],
      render: D => stem('인구 이동에 영향을 주는 요인을 나타낸 카드를 흡인 요인과 배출 요인으로 나누어 알맞은 칸에 끌어다 놓으세요.') +
        `<section class="i-resp">${dragArea([['pull', '흡인 요인'], ['push', '배출 요인']])}</section>` +
        (D('M01') ? extra('세계 인구는 2022년에 80억 명을 넘어섰다. 이는 1950년 무렵 세계 인구(약 25억 명)의 세 배가 넘는 수이다.') : '')
    },

    // M02 ─ 국어·선택형 ─ 장식 절제 (긴 설명문, 지문 칸만 스크롤)
    {
      id: 'M02', set: 'M', no: 2, school: '중', subject: '국어', type: 'choice',
      choices: [
        '대상의 뜻을 밝혀 설명하였다.',
        '두 대상의 공통점과 차이점을 견주어 설명하였다.',
        '어떤 현상이 일어나게 된 원인과 결과를 밝혀 설명하였다.',
        '대상을 일정한 기준에 따라 나누어 설명하였다.'
      ],
      answer: 2,
      render: D => split(direction(DIR_TEXT) +
          `<div class="i-data i-ptext scroll"${el('data', '지문')}><p class="i-phead">바닷물은 왜 짤까</p>
            <p class="i-para">바닷물 1킬로그램을 증발시키면 약 35그램의 소금이 남는다. 강물이나 빗물에서는 짠맛이 거의 나지 않는데, 바닷물은 왜 이렇게 짤까? 그 까닭은 오랜 세월 동안 되풀이된 물의 순환에서 찾을 수 있다.</p>
            <p class="i-para">비가 내리면 빗물은 땅 위의 바위와 흙을 적시며 흘러간다. 빗물에는 공기 중의 이산화 탄소가 조금 녹아 있어 약한 산성을 띠기 때문에, 바위 속의 여러 광물을 조금씩 녹여 낸다. 이렇게 녹아 나온 나트륨, 칼슘, 마그네슘 같은 물질은 강물을 따라 바다로 흘러 들어간다.</p>
            <p class="i-para">바다에 이른 물은 햇볕을 받아 증발하여 다시 구름이 된다. 그런데 물이 증발할 때 녹아 있던 물질은 함께 날아가지 못하고 바다에 남는다. 이 과정이 수억 년 동안 되풀이되면서 바다에는 녹아 있는 물질이 점점 쌓였고, 그 결과 바닷물이 짜게 되었다.</p>
            <p class="i-para">바다 밑에서 일어나는 화산 활동도 바닷물의 짠맛에 영향을 준다. 해저 화산이나 바다 밑에서 뜨거운 물이 솟아나는 곳에서는 염소 같은 물질이 바닷물로 나온다. 이 염소가 강물에서 온 나트륨과 만나 염화 나트륨, 곧 소금이 된다.</p>
            <p class="i-para">이처럼 바닷물이 짠 것은 육지의 물질이 강물을 타고 바다로 옮겨지고, 물만 증발하여 그 물질이 남는 일이 오랫동안 되풀이되었기 때문이다.</p></div>`,
        stemFig(D('M02') && MASCOT_WHALE, '이 글에서 주로 사용한 설명 방법으로 알맞은 것은?') + guide('choice') + CHOICES)
    },

    // M03 ─ 과학·선 잇기 ─ 색 외 구분 단서
    {
      id: 'M03', set: 'M', no: 3, school: '중', subject: '과학', type: 'match',
      left: D => D('M03')
        ? [{ id: 'r', html: '빨간색 화살표' }, { id: 'b', html: '파란색 화살표' }, { id: 'g', html: '초록색 화살표' }]
        : [{ id: 'r', html: '㉠ 화살표' }, { id: 'b', html: '㉡ 화살표' }, { id: 'g', html: '㉢ 화살표' }],
      right: [{ id: 'rad', html: '복사' }, { id: 'con', html: '전도' }, { id: 'cv', html: '대류' }],
      answer: { r: 'con', b: 'cv', g: 'rad' },
      render: D => stem('그림은 난로가 있는 방에서 열이 이동하는 모습을 화살표로 나타낸 것입니다. 화살표가 나타내는 열의 이동 방법을 찾아 선으로 이으세요.') +
        `<div class="i-row"><div class="i-data fig"${el('data', '열의 이동 그림')}>${art('heatRoom', 480, 330, HEAT_FB, heatOverlay(!D('M03')), '난로가 있는 방에서 열이 이동하는 모습을 화살표 세 개로 나타낸 그림')}</div>` +
        `<section class="i-resp">${guide('match')}<div class="i-match compact" data-match${el('resp', '선 잇기 칸')}></div></section></div>`
    },

    // M04 ─ 수학·선택형 ─ 핵심 정보 강조
    {
      id: 'M04', set: 'M', no: 4, school: '중', subject: '수학', type: 'choice',
      choices: ['−3', fr(1, 2, '+'), '−0.4', fr(1, 3, '−'), '+2'],
      answer: 3,
      render: D => stem(D('M04')
        ? '<span class="x1">다음 수</span> <span class="x3">중에서</span> <span class="x4">절댓값이</span> <span class="x2">가장</span> <span class="x5">작은</span> <span class="x3">수는</span>?'
        : '다음 수 중에서 <span class="em-key">절댓값이 가장 작은</span> 수는?') +
        `<section class="i-resp narrow">${guide('choice')}<ol class="i-choices num" data-choices${el('resp', '선택지')}></ol></section>`
    },

    // M05 ─ 국어·선 잇기 ─ 지문·자료 참조 (긴 소설 지문)
    {
      id: 'M05', set: 'M', no: 5, school: '중', subject: '국어', type: 'match',
      left: [{ id: 'dh', html: '도현' }, { id: 'hy', html: '하윤' }, { id: 'mj', html: '민재' }],
      right: [{ id: 'care', html: '배려심이 있다' }, { id: 'greed', html: '욕심이 많다' }, { id: 'cau', html: '신중하다' }, { id: 'resp', html: '책임감이 있다' }],
      answer: { dh: 'cau', hy: 'resp', mj: 'care' },
      render: D => passageOrPopup(D('M05'), DIR_TEXT,
        stem('인물과 그 인물의 성격을 알맞게 선으로 이으세요.'),
        `<div class="i-ptext">
          <p class="i-para">장마가 끝난 첫 토요일, 도현이와 하윤이, 민재는 뒷산 계곡으로 향했다. 며칠 동안 내린 비 때문에 계곡물은 평소보다 훨씬 불어 있었고, 늘 밟고 건너던 징검다리 몇 개는 흙탕물 아래로 잠겨 보이지 않았다.</p>
          <p class="i-para">“이 정도면 금방 건너겠는데?” 하윤이가 신발 끈을 고쳐 매며 앞으로 나섰다. 그때 도현이가 하윤이의 팔을 붙잡았다. 도현이는 주변에서 긴 나뭇가지를 주워 와 물에 잠긴 돌을 하나하나 짚어 보았다. 세 번째 돌에서 나뭇가지가 미끄러지듯 옆으로 밀려났다. “이 돌은 흔들려. 조금 돌아가더라도 위쪽 다리로 건너자.” 하윤이는 입을 삐죽였지만, 흔들리는 돌을 보고는 말없이 고개를 끄덕였다.</p>
          <p class="i-para">다리를 건너 넓은 바위에 자리를 잡은 셋은 도시락을 펼쳤다. 하윤이가 과자 봉지를 뜯는 순간, 세찬 바람이 불어 빈 봉지가 풀숲 쪽으로 날아갔다. “그냥 둬. 저기까지 언제 가.” 민재가 말렸지만 하윤이는 이미 일어서 있었다. 하윤이는 가시덤불을 헤치고 풀숲 끝까지 가서 봉지를 주워 왔다. 팔에는 가느다란 생채기가 나 있었다. “내가 떨어뜨렸으니 내가 치워야지.”</p>
          <p class="i-para">해가 기울 무렵, 셋은 산을 내려왔다. 앞서 걷던 하윤이가 길 한가운데에서 쩔쩔매고 있었다. 풀린 신발 끈을 매려는데 양손에 든 가방과 물통 때문에 좀처럼 허리를 굽히지 못했던 것이다. 민재는 아무 말 없이 다가가 하윤이의 가방과 물통을 받아 들었다. 그러고는 하윤이가 끈을 다 맬 때까지 한쪽에 서서 기다려 주었다.</p></div>`,
        `${guide('match')}<div class="i-match stack${D('M05') ? ' solo' : ''}" data-match${el('resp', '선 잇기 칸')}></div>`)
    },

    // M06 ─ 과학·단답형 ─ 관련 정보 근접 배치
    {
      id: 'M06', set: 'M', no: 6, school: '중', subject: '과학', type: 'short',
      answer: ['20', '20℃', '20°C'],
      render: D => compare(D('M06'), stem('그래프는 같은 조건에서 액체 물질 A와 B를 가열할 때의 온도 변화를 나타낸 것입니다. A와 B의 끓는점의 차는 몇 ℃인가요?'),
        heatCurve('A', 80), heatCurve('B', 100), `${guide('short')}
          <p class="i-answer-line"${el('resp', '답 입력 칸')}><input class="i-input num" inputmode="numeric" autocomplete="off" aria-label="답" placeholder="숫자"> ℃</p>`, true, ['그래프 A', '그래프 B'])
    },

    // M07 ─ 수학·단답형 ─ 응답 방식 인지
    {
      id: 'M07', set: 'M', no: 7, school: '중', subject: '수학', type: 'short',
      answer: ['6', 'x=6'],
      render: D => stem('일차방정식 3<i>x</i> − 7 = <i>x</i> + 5의 해를 구하세요.') +
        `<section class="i-resp narrow">${blankAnswer(D('M07'), '<i>x</i> = ', '', '6.5em')}</section>`
    },

    // M08 ─ 사회·끌어 놓기 ─ 응답 결과 표시
    {
      id: 'M08', set: 'M', no: 8, school: '중', subject: '사회', type: 'drag',
      opts: D => ({ dotInBin: D('M08') }),
      cards: [
        { id: 'k1', html: '일 년 내내 덥고 비가 많다', ans: 'trop' },
        { id: 'k2', html: '비가 매우 적게 내린다', ans: 'dry' },
        { id: 'k3', html: '사계절의 변화가 나타난다', ans: 'temp' },
        { id: 'k4', html: '오후에 소나기가 자주 내린다', ans: 'trop' },
        { id: 'k5', html: '낮과 밤의 기온 차가 크다', ans: 'dry' },
        { id: 'k6', html: '기온이 온화해 살기 좋다', ans: 'temp' }
      ],
      bins: [{ id: 'trop' }, { id: 'dry' }, { id: 'temp' }],
      render: () => stem('기후 지역의 특징을 나타낸 카드를 알맞은 칸에 끌어다 놓으세요.') +
        `<section class="i-resp">${dragArea([['trop', '열대 기후'], ['dry', '건조 기후'], ['temp', '온대 기후']])}</section>`
    },

    // M09 ─ 국어·단답형 ─ 결함 없음 (시 3연)
    {
      id: 'M09', set: 'M', no: 9, school: '중', subject: '국어', type: 'short',
      answer: ['직유법', '직유', '직유표현'],
      render: () => split(direction(DIR_POEM) +
          `<div class="i-data i-ptext poem scroll"${el('data', '시')}><p class="i-phead">엄마의 아침</p>
            <p>새벽마다 김이 오르는 부엌에서</p>
            <p>엄마의 손은 <span class="i-smark"><b>㉠</b> <u>바쁜 시계처럼</u></span>움직인다</p>
            <p>도마 위에 또각또각</p><p>냄비 속에 보글보글</p>
            <p class="stanza">아직 덜 깬 창문 너머로</p>
            <p>골목의 가로등이 하나둘 눈을 감으면</p>
            <p>엄마는 식탁 위에</p><p>따뜻한 하루를 한 그릇씩 덜어 놓는다</p>
            <p class="stanza">나는 숟가락을 들며 생각한다</p>
            <p>저 손이 멈추지 않는 동안</p>
            <p>우리 집의 아침은</p><p>한 번도 늦은 적이 없었다고</p></div>`,
        stem('㉠에 쓰인 비유법의 이름을 쓰세요.') + guide('short') +
        `<p class="i-answer-line"${el('resp', '답 입력 칸')}>답: <input class="i-input word" autocomplete="off" aria-label="답" placeholder="눌러서 쓰기"></p>`)
    },

    // M10 ─ 수학·끌어 놓기 ─ 결함 없음
    {
      id: 'M10', set: 'M', no: 10, school: '중', subject: '수학', type: 'drag',
      cards: [
        { id: 'n1', html: '−3', ans: 'int' }, { id: 'n2', html: fr(2, 5, '+'), ans: 'rat' },
        { id: 'n3', html: '0', ans: 'int' }, { id: 'n4', html: '−0.5', ans: 'rat' },
        { id: 'n5', html: fr(12, 4, '+'), ans: 'int' }, { id: 'n6', html: fr(7, 2, '−'), ans: 'rat' }
      ],
      bins: [{ id: 'int' }, { id: 'rat' }],
      render: () => stem('수 카드를 정수와 정수가 아닌 유리수로 나누어 알맞은 칸에 끌어다 놓으세요.') +
        `<section class="i-resp">${dragArea([['int', '정수'], ['rat', '정수가 아닌 유리수']], 'frac-bank')}</section>`
    },

    // M11 ─ 과학·선택형 ─ 결함 없음
    {
      id: 'M11', set: 'M', no: 11, school: '중', subject: '과학', type: 'choice',
      choices: ['A', 'B, C', 'A, D', 'B, D', 'A, C, D'],
      answer: 2,
      render: () => stem('표는 물질 A~D의 밀도를 나타낸 것입니다. 물에 넣었을 때 <span class="em-key">뜨는 물질을 모두</span> 고른 것은? (단, 물의 밀도는 1.0&nbsp;g/cm³입니다.)') +
        `<div class="i-data fig table" style="max-width:640px"${el('data', '표')}><table class="i-table wide">
            <tbody><tr><th>물질</th><td>A</td><td>B</td><td>C</td><td>D</td></tr>
            <tr><th>밀도(g/cm³)</th><td>0.8</td><td>1.3</td><td>2.7</td><td>0.5</td></tr></tbody>
          </table></div>` + CHOICES
    },

    // M12 ─ 사회·선 잇기 ─ 결함 없음
    {
      id: 'M12', set: 'M', no: 12, school: '중', subject: '사회', type: 'match',
      left: [
        { id: 'v', html: landNode('vValley', '㉮', '골짜기 바닥이 좁고 양쪽 비탈이 가파른 지형 그림') },
        { id: 'f', html: landNode('alluvialFan', '㉯', '산지에서 평지로 나오는 곳에 부채 모양으로 퍼진 지형 그림') },
        { id: 'd', html: landNode('delta', '㉰', '강이 바다와 만나는 곳에 세모꼴로 쌓인 지형 그림') }
      ],
      right: [{ id: 'delta', html: '삼각주' }, { id: 'vv', html: 'V자곡' }, { id: 'fan', html: '선상지' }],
      answer: { v: 'vv', f: 'fan', d: 'delta' },
      render: () => stem('그림 ㉮~㉰가 나타내는 하천 지형의 이름을 찾아 알맞게 선으로 이으세요.') +
        `<section class="i-resp">${guide('match')}<div class="i-match land" data-match${el('resp', '선 잇기 칸')}></div></section>`
    }
  ];

  window.ITEMS = ITEMS;
  window.ITEM_SETS = { E: '초등', M: '중등' };
})();
