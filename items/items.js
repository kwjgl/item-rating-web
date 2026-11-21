/*
 * 평정용 12문항 내용
 * ------------------------------------------------------------
 * render(D) 는 문항 화면(평정 대상 영역) HTML 을 돌려준다.
 * D('결함이름') 은 config.js 의 스위치 값(true/false)이다.
 * 결함이 꺼지면 같은 문항의 '결함 없는 판'이 그려진다.
 *
 * type: choice(선택형) · short(단답형) · drag(끌어 놓기) · match(선 잇기)
 * 엔진(engine.js)이 data-choices / .i-input / data-bank·data-bin / data-match 자리에
 * 응답 요소를 채워 넣는다.
 */
(function () {
  'use strict';

  // 응답 방식 안내 — 같은 형식의 문항은 모두 같은 문구를 쓴다
  const G = {
    choice: '알맞은 답을 하나 골라 누르세요.',
    short: '빈칸을 누르고 답을 쓰세요.',
    drag: '카드를 끌어 칸에 놓으세요. 카드를 누른 뒤 칸을 눌러도 됩니다. 놓은 카드는 다시 옮길 수 있습니다.',
    match: '왼쪽 칸에서 오른쪽 칸으로 끌거나, 두 칸을 차례로 누르면 선이 이어집니다. 이은 선을 누르면 지워집니다.'
  };
  const guide = t => `<p class="i-guide">${G[t]}</p>`;
  const stem = h => `<div class="i-stem">${h}</div>`;
  const fr = (a, b, sign) => `<span class="frac-wrap">${sign || ''}<span class="frac" aria-label="${b}분의 ${a}"><span>${a}</span><span>${b}</span></span></span>`;
  const bin = (id, label) => `<div class="i-bin" data-bin="${id}"><div class="i-bin-label">${label}</div><div class="i-bin-drop"></div></div>`;

  // ---------------- 그림 ----------------

  // 2번: 풀이와 상관없는 정지 캐릭터 (움직임 없음, 글 없음)
  const MASCOT = `<svg class="i-mascot" viewBox="0 0 200 200" aria-hidden="true">
    <ellipse cx="100" cy="188" rx="62" ry="9" fill="#E7E2D4"/>
    <path d="M30 118 Q8 96 18 70" stroke="#E0A419" stroke-width="10" fill="none" stroke-linecap="round"/>
    <path d="M170 118 Q192 96 182 70" stroke="#E0A419" stroke-width="10" fill="none" stroke-linecap="round"/>
    <line x1="100" y1="30" x2="100" y2="12" stroke="#B9831A" stroke-width="5"/>
    <circle cx="100" cy="10" r="9" fill="#FF6B5A"/>
    <circle cx="100" cy="106" r="78" fill="#FFC94A" stroke="#E0A419" stroke-width="5"/>
    <ellipse cx="68" cy="96" rx="13" ry="16" fill="#3A2E1E"/><ellipse cx="132" cy="96" rx="13" ry="16" fill="#3A2E1E"/>
    <circle cx="72" cy="90" r="4.5" fill="#fff"/><circle cx="136" cy="90" r="4.5" fill="#fff"/>
    <ellipse cx="50" cy="126" rx="13" ry="8" fill="#FF9A7A" opacity=".75"/><ellipse cx="150" cy="126" rx="13" ry="8" fill="#FF9A7A" opacity=".75"/>
    <path d="M76 132 Q100 156 124 132" stroke="#3A2E1E" stroke-width="6" fill="none" stroke-linecap="round"/>
  </svg>`;

  // 3번: 열의 이동 그림. 화살표 셋은 굵기·모양(촉)이 같고 색만 다르다.
  function heatFigure(labels) {
    const tag = (x, y, t) => labels
      ? `<g><circle cx="${x}" cy="${y}" r="17" fill="#fff" stroke="#333" stroke-width="2"/><text x="${x}" y="${y + 7}" text-anchor="middle" font-size="21" font-weight="700" fill="#222">${t}</text></g>` : '';
    return `<svg viewBox="0 0 480 330" role="img" aria-label="난로가 있는 방에서 열이 이동하는 모습을 화살표 세 개로 나타낸 그림">
      <defs>
        <marker id="ah-r" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#C8382E"/></marker>
        <marker id="ah-g" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#3E8E2C"/></marker>
        <marker id="ah-b" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="#2B5CC4"/></marker>
      </defs>
      <rect x="6" y="6" width="468" height="318" rx="8" fill="#FBFBF8" stroke="#C9CFD6" stroke-width="2"/>
      <line x1="6" y1="300" x2="474" y2="300" stroke="#9AA3AE" stroke-width="3"/>
      <!-- 난로 -->
      <rect x="46" y="196" width="96" height="104" rx="6" fill="#6B7280"/>
      <rect x="66" y="222" width="56" height="44" rx="4" fill="#2B2F36"/>
      <path d="M94 262 C80 250 86 238 94 228 C96 240 106 242 102 254 C108 250 110 244 108 238 C116 248 112 262 94 262 z" fill="#F2A33A"/>
      <!-- 냄비와 쇠 손잡이 -->
      <rect x="56" y="166" width="76" height="30" rx="4" fill="#9AA3AE"/>
      <rect x="132" y="176" width="96" height="9" rx="4" fill="#B6BDC6" stroke="#8D96A1" stroke-width="1.5"/>
      <!-- 사람 -->
      <circle cx="410" cy="168" r="20" fill="#F1D2B4" stroke="#8D6E57" stroke-width="2"/>
      <path d="M410 188 L410 262 M410 262 L392 298 M410 262 L428 298" stroke="#5B6573" stroke-width="7" stroke-linecap="round" fill="none"/>
      <path d="M410 206 L372 236" stroke="#5B6573" stroke-width="7" stroke-linecap="round"/>
      <circle cx="368" cy="239" r="8" fill="#F1D2B4" stroke="#8D6E57" stroke-width="2"/>
      <!-- 화살표: 빨강(손잡이를 따라), 파랑(공기의 순환), 초록(난로에서 손으로) -->
      <path d="M140 160 L212 160" stroke="#C8382E" stroke-width="7" fill="none" marker-end="url(#ah-r)"/>
      <path d="M94 150 C92 40, 300 30, 318 130" stroke="#2B5CC4" stroke-width="7" fill="none" marker-end="url(#ah-b)"/>
      <path d="M152 244 L340 244" stroke="#3E8E2C" stroke-width="7" fill="none" marker-end="url(#ah-g)"/>
      ${tag(176, 134, '㉠')}${tag(206, 70, '㉡')}${tag(246, 272, '㉢')}
    </svg>`;
  }

  // 6번: 모눈 위 도형. 모눈 한 칸 = 1 cm²
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
  const FIG_A = gridFigure(7, 5, [[1, 1], [6, 1], [6, 4], [1, 4]], '(가)');                      // 5×3 = 15
  const FIG_B = gridFigure(6, 6, [[1, 1], [3, 1], [3, 3], [5, 3], [5, 5], [1, 5]], '(나)');      // 16 − 4 = 12

  // 7번: 고장 안내도 (곳마다 그림과 이름 글자가 함께 있다)
  const TOWN_MAP = `<svg viewBox="0 0 460 380" role="img" aria-label="학교를 가운데에 두고 동서남북에 도서관, 우체국, 시장, 공원이 있는 고장 안내도">
    <rect x="2" y="2" width="456" height="376" rx="8" fill="#FAFAF6" stroke="#C9CFD6" stroke-width="2"/>
    <path d="M230 40 L230 340 M50 200 L410 200" stroke="#D5D9DE" stroke-width="26" stroke-linecap="round"/>
    <!-- 방위표 -->
    <g transform="translate(52 62)"><path d="M0 -30 L10 6 L0 0 L-10 6 z" fill="#333"/><text x="0" y="-36" text-anchor="middle" font-size="20" font-weight="700" fill="#222">북</text></g>
    <!-- 학교 -->
    <g transform="translate(230 200)"><rect x="-34" y="-26" width="68" height="44" fill="#fff" stroke="#444" stroke-width="2.5"/><path d="M-40 -26 L0 -48 L40 -26 z" fill="#fff" stroke="#444" stroke-width="2.5"/><rect x="-8" y="-2" width="16" height="20" fill="#444"/><text x="0" y="46" text-anchor="middle" font-size="21" font-weight="700" fill="#222">학교</text></g>
    <!-- 도서관 (북) -->
    <g transform="translate(230 66)"><rect x="-26" y="-20" width="52" height="34" rx="3" fill="#fff" stroke="#444" stroke-width="2.5"/><path d="M0 -14 L0 10 M-18 -12 Q-9 -16 0 -12 Q9 -16 18 -12 L18 10 Q9 6 0 10 Q-9 6 -18 10 z" fill="none" stroke="#444" stroke-width="2"/><text x="40" y="8" font-size="21" fill="#222">도서관</text></g>
    <!-- 우체국 (동) -->
    <g transform="translate(384 200)"><rect x="-24" y="-18" width="48" height="34" fill="#fff" stroke="#444" stroke-width="2.5"/><path d="M-24 -18 L0 2 L24 -18" fill="none" stroke="#444" stroke-width="2.5"/><text x="0" y="44" text-anchor="middle" font-size="21" fill="#222">우체국</text></g>
    <!-- 시장 (남) -->
    <g transform="translate(230 330)"><path d="M-30 -8 L-24 -26 L24 -26 L30 -8 z" fill="#fff" stroke="#444" stroke-width="2.5"/><rect x="-26" y="-8" width="52" height="22" fill="#fff" stroke="#444" stroke-width="2.5"/><text x="40" y="10" font-size="21" fill="#222">시장</text></g>
    <!-- 공원 (서) -->
    <g transform="translate(76 200)"><circle cx="0" cy="-14" r="18" fill="#fff" stroke="#444" stroke-width="2.5"/><path d="M0 4 L0 20" stroke="#444" stroke-width="4"/><text x="0" y="46" text-anchor="middle" font-size="21" fill="#222">공원</text></g>
  </svg>`;

  // ---------------- 문항 ----------------
  const ITEMS = [
    // 1 ─ 초·과학·끌어 놓기 ─ 정보 선별
    {
      no: 1, id: 'q01', school: '초', subject: '과학', type: 'drag', defect: 'infoTrivia',
      cards: [
        { id: 'c1', html: '돌멩이', ans: 'solid' }, { id: 'c2', html: '우유', ans: 'liquid' },
        { id: 'c3', html: '풍선 속 공기', ans: 'gas' }, { id: 'c4', html: '얼음', ans: 'solid' },
        { id: 'c5', html: '식용유', ans: 'liquid' }, { id: 'c6', html: '축구공 속 공기', ans: 'gas' }
      ],
      bins: [{ id: 'solid' }, { id: 'liquid' }, { id: 'gas' }],
      render: D => stem('다음 물체를 고체, 액체, 기체로 나누어 알맞은 칸에 끌어다 놓으세요.') +
        `<section class="i-resp">${guide('drag')}
          <div class="i-bank" data-bank aria-label="카드가 있는 곳"></div>
          <div class="i-bins c3">${bin('solid', '고체')}${bin('liquid', '액체')}${bin('gas', '기체')}</div>
        </section>` +
        (D('infoTrivia') ? `<aside class="i-extra"><p class="i-extra-h">더 알아보기</p>
          <p>‘물질’은 ‘물건의 바탕’이라는 뜻을 가진 낱말이에요. 우리 주변의 물체는 모두 물질로 이루어져 있어요.</p></aside>` : '')
    },

    // 2 ─ 초·국어·선택형 ─ 장식 절제
    {
      no: 2, id: 'q02', school: '초', subject: '국어', type: 'choice', defect: 'bigMascot',
      choices: [
        '개미에게 더듬이는 아주 중요한 기관입니다.',
        '개미는 더듬이로 냄새를 맡습니다.',
        '개미는 더듬이로 친구를 알아봅니다.',
        '더듬이가 다치면 개미는 길을 잃기도 합니다.'
      ],
      answer: 0,
      render: D => `<div class="i-stem with-fig"><span>글을 읽고, 이 글의 중심 문장으로 알맞은 것을 고르세요.</span>${D('bigMascot') ? MASCOT : ''}</div>
        <div class="i-cols">
          <section class="i-data i-ptext"><p class="i-phead">개미의 더듬이</p>
            <p class="i-para">개미에게 더듬이는 아주 중요한 기관입니다. 개미는 더듬이로 냄새를 맡아 먹이가 있는 곳을 찾습니다. 또 더듬이를 서로 맞대어 같은 집에 사는 친구인지 알아봅니다. 그래서 더듬이가 다치면 개미는 길을 잃기도 합니다.</p></section>
          <section class="i-resp">${guide('choice')}<ol class="i-choices" data-choices></ol></section>
        </div>`
    },

    // 3 ─ 중·과학·선 잇기 ─ 색 외 구분 단서
    {
      no: 3, id: 'q03', school: '중', subject: '과학', type: 'match', defect: 'colorOnlyArrows',
      left: D => D('colorOnlyArrows')
        ? [{ id: 'r', html: '빨간색 화살표' }, { id: 'b', html: '파란색 화살표' }, { id: 'g', html: '초록색 화살표' }]
        : [{ id: 'r', html: '㉠ 화살표' }, { id: 'b', html: '㉡ 화살표' }, { id: 'g', html: '㉢ 화살표' }],
      right: [{ id: 'rad', html: '복사' }, { id: 'con', html: '전도' }, { id: 'cv', html: '대류' }],
      answer: { r: 'con', b: 'cv', g: 'rad' },
      render: D => stem('그림의 화살표가 나타내는 열의 이동 방법을 찾아 선으로 이으세요.') +
        `<div class="i-cols">
          <section class="i-data">${heatFigure(!D('colorOnlyArrows'))}</section>
          <section class="i-resp">${guide('match')}<div class="i-match" data-match></div></section>
        </div>`
    },

    // 4 ─ 중·수학·선택형 ─ 핵심 정보 강조
    {
      no: 4, id: 'q04', school: '중', subject: '수학', type: 'choice', defect: 'overEmphasis',
      choices: ['−3', fr(1, 2, '+'), '−0.4', fr(1, 3, '−'), '+2'],
      answer: 3,
      render: D => stem(D('overEmphasis')
        ? '<span class="x1">다음 수</span> <span class="x3">중에서</span> <span class="x4">절댓값이</span> <span class="x2">가장</span> <span class="x5">작은</span> <span class="x3">수는</span>?'
        : '다음 수 중에서 <span class="em-key">절댓값이 가장 작은</span> 수는?') +
        `<section class="i-resp narrow">${guide('choice')}<ol class="i-choices num" data-choices></ol></section>`
    },

    // 5 ─ 중·국어·선 잇기 ─ 지문·자료 참조
    {
      no: 5, id: 'q05', school: '중', subject: '국어', type: 'match', defect: 'popupCoversResponse',
      left: [{ id: 'dh', html: '도현' }, { id: 'hy', html: '하윤' }, { id: 'mj', html: '민재' }],
      right: [{ id: 'care', html: '배려심이 있다' }, { id: 'greed', html: '욕심이 많다' }, { id: 'cau', html: '신중하다' }, { id: 'resp', html: '책임감이 있다' }],
      answer: { dh: 'cau', hy: 'resp', mj: 'care' },
      render: D => {
        const passage = `<div class="i-ptext">
          <p class="i-para">세 친구가 뒷산 계곡에 놀러 갔다. 징검다리 몇 개가 물에 잠겨 있었다. 도현이는 먼저 건너려는 친구들을 붙잡고 막대기로 돌을 하나하나 짚어 보았다. “이 돌은 흔들려. 돌아가더라도 다리로 건너자.”</p>
          <p class="i-para">점심을 먹고 나서 하윤이는 과자 봉지를 바람에 놓쳤다. 하윤이는 풀숲 끝까지 따라가 봉지를 주워 왔다. “내가 떨어뜨렸으니 내가 치워야지.”</p>
          <p class="i-para">돌아오는 길에 민재는 신발 끈을 매느라 쩔쩔매는 하윤이를 보았다. 민재는 말없이 하윤이의 가방을 받아 들고 기다려 주었다.</p></div>`;
        const s = stem('글을 읽고, 인물과 그 인물의 성격을 알맞게 선으로 이으세요.');
        if (!D('popupCoversResponse')) {
          return s + `<div class="i-cols wide-left">
            <section class="i-data">${passage}</section>
            <section class="i-resp">${guide('match')}<div class="i-match tight" data-match></div></section></div>`;
        }
        return s + `<section class="i-resp">
            <button type="button" class="i-open">지문 보기</button>
            ${guide('match')}<div class="i-match tight solo" data-match></div></section>
          <div class="i-pop" hidden><div class="i-pop-card">
            <button type="button" class="i-pop-close">닫기 ✕</button>${passage}</div></div>`;
      }
    },

    // 6 ─ 초·수학·단답형 ─ 관련 정보 근접 배치
    {
      no: 6, id: 'q06', school: '초', subject: '수학', type: 'short', defect: 'farApartFigures',
      answer: ['3'],
      render: D => {
        const s = stem('모눈 한 칸의 넓이는 1 cm²입니다. 도형 (가)와 (나)의 넓이의 차는 몇 cm²인가요?');
        const resp = `<section class="i-resp">${guide('short')}
          <p class="i-answer-line"><input class="i-input num" inputmode="numeric" autocomplete="off" aria-label="답" placeholder="숫자"> cm²</p></section>`;
        if (!D('farApartFigures')) {
          return s + `<div class="i-cols"><section class="i-data"><div class="i-figs">${FIG_A}${FIG_B}</div></section>${resp}</div>`;
        }
        return s + `<div class="i-far"><section class="i-data far-a">${FIG_A}</section>${resp.replace('class="i-resp"', 'class="i-resp far-r"')}<section class="i-data far-b">${FIG_B}</section></div>`;
      }
    },

    // 7 ─ 초·사회·단답형 ─ 응답 방식 인지
    {
      no: 7, id: 'q07', school: '초', subject: '사회', type: 'short', defect: 'hiddenInputBlank',
      answer: ['도서관'],
      render: D => stem('안내도에서 학교의 북쪽에 있는 곳은 어디인가요?') +
        `<div class="i-cols">
          <section class="i-data">${TOWN_MAP}</section>
          <section class="i-resp">${D('hiddenInputBlank') ? '' : guide('short')}
            <div class="i-ansbox"><p class="i-ansbox-h">답</p>
            ${D('hiddenInputBlank')
              ? '<p>학교의 북쪽에는 (<input class="i-input inline bare" autocomplete="off" aria-label="답">)이/가 있습니다.</p>'
              : '<p>학교의 북쪽에는 <input class="i-input inline" autocomplete="off" aria-label="답" placeholder="눌러서 쓰기">이/가 있습니다.</p>'}
            </div></section>
        </div>`
    },

    // 8 ─ 중·사회·끌어 놓기 ─ 응답 결과 표시
    {
      no: 8, id: 'q08', school: '중', subject: '사회', type: 'drag', defect: 'dotAfterDrop',
      opts: D => ({ dotInBin: D('dotAfterDrop') }),
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
        `<section class="i-resp">${guide('drag')}
          <div class="i-bank" data-bank aria-label="카드가 있는 곳"></div>
          <div class="i-bins c3">${bin('trop', '열대 기후')}${bin('dry', '건조 기후')}${bin('temp', '온대 기후')}</div>
        </section>`
    },

    // 9 ─ 중·국어·단답형 ─ 결함 없음
    {
      no: 9, id: 'q09', school: '중', subject: '국어', type: 'short', defect: null,
      answer: ['직유법', '직유', '직유표현'],
      render: () => stem('시를 읽고, ㉠에 쓰인 비유법의 이름을 쓰세요.') +
        `<div class="i-cols">
          <section class="i-data i-ptext poem"><p class="i-phead">엄마의 아침</p>
            <p>새벽마다 김이 오르는 부엌에서</p>
            <p>엄마의 손은 <span class="i-smark"><b>㉠</b> <u>바쁜 시계처럼</u></span> 움직인다</p>
            <p>도마 위에 또각또각</p><p>냄비 속에 보글보글</p>
            <p>식탁 위에 차려지는</p><p>따뜻한 하루</p></section>
          <section class="i-resp">${guide('short')}
            <p class="i-answer-line">답: <input class="i-input word" autocomplete="off" aria-label="답" placeholder="눌러서 쓰기"></p></section>
        </div>`
    },

    // 10 ─ 초·수학·끌어 놓기 ─ 결함 없음
    {
      no: 10, id: 'q10', school: '초', subject: '수학', type: 'drag', defect: null,
      cards: [
        { id: 'f34', html: fr(3, 4), ans: 's2' }, { id: 'f23', html: fr(2, 3), ans: 's1' }, { id: 'f56', html: fr(5, 6), ans: 's3' }
      ],
      bins: [{ id: 's1', cap: 1 }, { id: 's2', cap: 1 }, { id: 's3', cap: 1 }],
      render: () => stem('세 분수를 작은 수부터 차례로 빈칸에 끌어다 놓으세요.') +
        `<section class="i-resp">${guide('drag')}
          <div class="i-bank frac-bank" data-bank aria-label="카드가 있는 곳"></div>
          <div class="i-slots">${bin('s1', '가장 작은 수')}<span class="i-lt" aria-hidden="true">&lt;</span>${bin('s2', '두 번째 수')}<span class="i-lt" aria-hidden="true">&lt;</span>${bin('s3', '가장 큰 수')}</div>
        </section>`
    },

    // 11 ─ 중·과학·선택형 ─ 결함 없음
    {
      no: 11, id: 'q11', school: '중', subject: '과학', type: 'choice', defect: null,
      choices: ['A', 'B, C', 'A, D', 'B, D', 'A, C, D'],
      answer: 2,
      render: () => stem('표는 물질 A~D의 밀도를 나타낸 것입니다. 물에 넣었을 때 <span class="em-key">뜨는 물질을 모두</span> 고른 것은?') +
        `<div class="i-cols">
          <section class="i-data"><table class="i-table">
            <thead><tr><th>물질</th><th>밀도(g/cm³)</th></tr></thead>
            <tbody><tr><td>A</td><td>0.8</td></tr><tr><td>B</td><td>1.3</td></tr><tr><td>C</td><td>2.7</td></tr><tr><td>D</td><td>0.5</td></tr></tbody>
          </table><p class="i-note">※ 물의 밀도는 1.0 g/cm³입니다.</p></section>
          <section class="i-resp">${guide('choice')}<ol class="i-choices" data-choices></ol></section>
        </div>`
    },

    // 12 ─ 초·사회·선 잇기 ─ 결함 없음
    {
      no: 12, id: 'q12', school: '초', subject: '사회', type: 'match', defect: null,
      left: [{ id: 'fire', html: '소방서' }, { id: 'health', html: '보건소' }, { id: 'lib', html: '도서관' }, { id: 'police', html: '경찰서' }],
      right: [
        { id: 'book', html: '책을 빌려 주고 읽을 곳을 마련한다' },
        { id: 'rescue', html: '불을 끄고 위험에 빠진 사람을 구한다' },
        { id: 'order', html: '범죄를 막고 교통질서를 지킨다' },
        { id: 'vacc', html: '예방 접종 등 주민의 건강을 돌본다' }
      ],
      answer: { fire: 'rescue', health: 'vacc', lib: 'book', police: 'order' },
      render: () => stem('우리 고장의 공공 기관과 그곳에서 하는 일을 알맞게 선으로 이으세요.') +
        `<section class="i-resp">${guide('match')}<div class="i-match wide-right" data-match></div></section>`
    }
  ];

  window.ITEMS = ITEMS;
})();
