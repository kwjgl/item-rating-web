/**
 * 디지털 평가 문항 평정 연구 — 교사 평정 웹앱 (서버 코드)
 * 최종 준거(4준거 14지표) · 평정용 24문항 — 초등 세트 12(E01~E12) · 중등 세트 12(M01~M12)
 *   교사는 기본 정보의 '근무 학교급' 답에 따라 한 세트(12문항)만 평정합니다.
 *
 * [파일 구성]
 *   Code.gs (이 파일, 앱스크립트) — 설정·참여 코드·응답 저장
 *   교사 화면(GitHub Pages)       — index.html + items/ 폴더
 *     items/items.js   : 24문항의 화면(지문·발문·선택지·그림·정답). 문항 내용은 여기에 있습니다.
 *     items/assets/    : 그림 파일 (작업 지시서: items/assets/README.md). 없으면 임시 그림이 보입니다.
 *     items/runtime.js : 플랫폼 틀(연습장·문항 번호·정답 확인)과 응답 조작
 *     items/item.css   : 문항 화면 모양
 *   ※ 결함을 켜고 끄는 기준은 이 파일의 DEFECTS 입니다. 참여 코드를 확인할 때 교사 화면으로 보내고,
 *     그 사람이 본 상태를 시트에 함께 기록합니다. (items/config.js 는 미리보기 페이지 전용 기본값)
 *
 * [처음 설정]
 * 1) script.google.com → 새 프로젝트 → Code.gs에 이 코드 붙여넣기
 * 2) 저장 → 함수 드롭다운에서 setup 선택 → 실행 (권한 허용)
 *    → 응답 시트가 만들어지고 실행 로그에 링크가 나옴
 * 3) 아래 CODE_BATCH에서 코드 개수·묶음 이름을 정하고 generateCodes 실행
 *    → 응답 시트의 codes 탭에 참여 코드가 생김 (세트는 코드가 아니라 기본 정보의 학교급 답으로 정해집니다)
 *    ※ 파일럿과 본조사는 같은 화면이고, 묶음 이름(batch)으로만 구분합니다.
 * 4) 배포 → 새 배포 → 웹 앱 → 실행: 나 / 액세스: 모든 사용자 → 배포
 *    ※ 반드시 '/exec'로 끝나는 웹 앱 URL을 쓸 것 ('/dev' 테스트 URL은 소유자만 열림)
 *    ※ 코드를 고친 뒤에는 배포 관리 → 연필 아이콘 → 버전: 새 버전 → 배포 (URL 유지)
 * 5) STUDY.toolVersion 을 바꿨다면 교사 화면 index.html 의 SERVER.toolVersion 도 똑같이 바꿔 올리세요.
 *    두 값이 다르면 교사 화면이 "조사 화면이 새로 바뀌었습니다"라며 시작을 막습니다.
 *
 * [미리보기 — 참여 코드 불필요, 시트에 test=TRUE로 기록]
 *   교사화면URL?preview=1
 *   결함만 따로 보려면(시트 기록 없음): 교사화면URL/items/?panel=1
 *
 * [응답 시트 구성]
 *   participants : 참여자 한 명당 한 줄 (세트 level, 기본 정보, 소요 시간, 문항 제시 순서, 결함 상태, 마지막 의견)
 *   judgments    : 지표 판단 한 개당 한 줄 (교사 × 문항 × 지표 14개 → 충족/미충족/해당 없음, 근거 요소, 판단 유형)
 *   items        : 문항 한 개당 한 줄 → 조작 로그 + 판단 요약 (결함 탐지 여부, 준거 일치/혼동, 과잉 판단 수)
 *   summary      : summarize 를 실행하면 만들어짐 → 결함 탐지율·준거 일치율·과잉 판단율 (전체·학교급·교사·문항·지표별)
 *   codes        : 참여 코드 관리
 *
 * ※ 문항·준거·결함 설정을 바꾼 뒤에는 toolVersion 을 바꾸고, 필요하면 setup을 다시 실행해 새 시트를 만드세요.
 */

// ===================== 1. 기본 문구 =====================
const STUDY = {
  title: '디지털 평가 문항 평정',
  intro:
    '초·중학교 국어·수학·과학·사회 디지털 평가 문항을 직접 풀어 보고, 문항 화면의 질을 평정하는 조사입니다.\n' +
    '약 20~30분이 걸립니다. 이름 등 선생님을 알아볼 수 있는 정보는 수집하지 않습니다.\n' +
    '문항 화면을 본 시간, 문항을 조작한 횟수 등 응답 과정도 함께 기록됩니다.\n' +
    '중간에 그만두고 싶으시면 언제든 창을 닫으시면 되고, 그 경우 응답은 저장되지 않습니다.',
  deviceNote: '가능하면 태블릿이나 PC(노트북)에서 참여해 주세요. 스마트폰에서는 문항 화면이 작게 보일 수 있습니다.',
  debrief:
    '참여해 주셔서 감사합니다.\n\n' +
    '선생님의 평정은 디지털 평가 문항 화면의 질을 판단하는 준거를 개발하는 데 활용됩니다.\n' +
    '아직 참여하지 않은 선생님들께는 조사 문항의 내용을 알려 주지 말아 주세요.',
  requireInteraction: true,   // true: 문항을 한 번 이상 직접 조작해야 평정 버튼이 열림
  shuffleItems: true,         // true: 참여자마다 문항 제시 순서를 무작위로 섞음

  // 도구 판 — 시트 participants 탭의 tool_version 열에 그대로 기록됩니다.
  // 문항·준거 기술문·결함 설정·화면을 고쳤다면 반드시 바꾸세요. 그래야 분석할 때
  // 어느 자료가 어느 판으로 모인 것인지 가를 수 있습니다.
  // ※ 교사 화면 index.html 의 SERVER.toolVersion 과 글자까지 같아야 합니다.
  toolVersion: '준거14-1',

  // 앱스크립트 웹앱 주소 — 교사 화면(GitHub Pages)이 이 주소로 응답을 보냅니다.
  // 주소가 바뀌면 여기와 index.html 의 SERVER.url 을 함께 고치세요.
  webAppUrl: 'https://script.google.com/macros/s/AKfycbyNy5FZc8_bwkT0knZWVMoC5fBHyTvCW-9uTfU1WD1leMMHB3qF4QZJW29csodM-BNt/exec',

  // 문항 화면의 고정 크기(px). 1280×800(16:10, 11인치 태블릿)으로 그린 뒤 창에 맞춰 통째로 확대·축소합니다.
  // 12문항(items/items.js)과 플랫폼 틀(items/item.css)이 이 크기에 맞춰 설계되어 있으므로 바꾸지 마세요.
  screen: { width: 1280, height: 800 },

  // 창(브라우저)이 작아 문항이 아래 비율보다 작게 줄어들면 진행을 막고 PC로 열도록 안내합니다.
  minWindowWidth: 1000,
  minScale: 0.55,

  // 어느 세트를 평정할지 정하는 기본 정보 문항과, 그 답(차례대로)에 대응하는 세트.
  // DEMO 의 school 선택지가 ['초등학교', '중학교'] 이므로 0 → E(초등), 1 → M(중등).
  levelFrom: { key: 'school', sets: ['E', 'M'] }

  // ※ 예전의 platform 설정(그림으로만 그린 위쪽 띠·번호 칸)은 없앴습니다.
  //   이제 플랫폼 공통 요소(연습장·문항 번호·정답 확인)는 실제로 눌리고, 모든 문항에 똑같이 그려집니다
  //   (items/runtime.js). 평정 대상은 가운데 흰 칸(문항 화면)뿐입니다.
};

// ===================== 2. 평정 설정 =====================
// 평정 단위: 문항마다 지표 14개를 '충족 / 미충족 / 해당 없음' 중 하나로 판단합니다(점수별 기술문 없음).
// '미충족'이면 문항 화면에 번호로 표시된 요소 가운데 근거가 된 요소를 하나 이상 고릅니다.
// 이 근거 요소를 DEFECTS.elements(의도한 결함 요소)와 대조해 결함 탐지·준거 일치·과잉 판단을 가립니다(summarize).
const SURVEY = {
  name: '문항 평정',
  guide:
    '선생님 학교급에 맞는 문항 12개를 하나씩 보여 드립니다.\n' +
    '각 문항을 학생이 된 것처럼 직접 풀어 보신 뒤, 준거별 지표마다 충족 여부를 \'충족\', \'미충족\', \'해당 없음\' 중 하나로 판단해 주세요.\n' +
    '\'미충족\'으로 판단한 지표에는 근거가 된 화면 요소를 골라 주세요. 미충족을 고르면 문항 화면에 요소 번호가 나타납니다.\n' +
    '모든 지표는 그 문항이 측정하려는 능력과 응시 학습자에 비추어 판단해 주세요.\n' +
    '평정 대상은 가운데 흰 칸(문항 화면)입니다. 위쪽 띠와 아래쪽 띠(연습장·문항 번호·정답 확인)는 평가 플랫폼에 공통으로 있는 것이라 평정하지 않습니다.',
  // 준거 4개, 지표 14개(최종 준거). id 는 시트의 indicator_id 열에 남고, DEFECTS.indicator 가 이 id 를 가리킵니다.
  // 이름과 내용은 최종 준거표와 글자까지 같아야 합니다.
  //   short : 평정 칸 위쪽 준거 칸(탭)에 쓰는 짧은 이름
  criteria: [
    {
      key: 'C1', name: '화면 요소의 필요성', short: '필요성',
      indicators: [
        { id: 'I01', name: '정보 선별', text: '화면의 정보는 풀이와 응답에 필요한 것으로 한정된다.' },
        { id: 'I02', name: '장식 절제', text: '주의를 분산시키는 장식 요소는 제시되지 않는다.' },
        { id: 'I03', name: '반복 최소화', text: '같은 정보는 풀이에 도움이 될 때에만 다른 형식으로 반복 제시된다.' }
      ]
    },
    {
      key: 'C2', name: '화면 정보의 명료성', short: '명료성',
      indicators: [
        { id: 'I04', name: '가독성', text: '글자와 시각 자료는 읽기에 적절한 크기·대비·간격으로 제시된다.' },
        { id: 'I05', name: '색 외 구분 단서', text: '색으로 구분되는 정보는 모양·글자·위치로도 구분된다.' },
        { id: 'I06', name: '영역 구분', text: '문두, 지문·자료, 응답 영역은 경계가 시각적으로 구분된다.' },
        { id: 'I07', name: '핵심 정보 강조', text: '풀이에 필요한 핵심 정보는 강조되고, 그 밖의 정보는 강조되지 않는다.' }
      ]
    },
    {
      key: 'C3', name: '관련 정보의 통합성', short: '통합성',
      indicators: [
        { id: 'I08', name: '문두·응답 동시 제시', text: '문두와 응답 영역은 풀이하는 동안 한 화면에 함께 제시된다.' },
        { id: 'I09', name: '지문·자료 참조', text: '지문·자료는 응답 영역이 보이는 상태에서 참조할 수 있게 제시된다.' },
        { id: 'I10', name: '관련 정보 근접 배치', text: '함께 보아야 할 정보는 한 화면 안에서 가까이 제시된다.' }
      ]
    },
    {
      key: 'C4', name: '응답 조작의 용이성', short: '조작',
      indicators: [
        { id: 'I11', name: '응답 방식 인지', text: '응답 조작 방식은 화면 표시나 간단한 안내로 제시된다.' },
        { id: 'I12', name: '조작 간결성', text: '응답 조작은 측정 구인과 무관한 단계 없이 구성된다.' },
        { id: 'I13', name: '조작 대상 크기', text: '터치·클릭 대상은 조작하기에 충분한 크기·간격으로 제시된다.' },
        { id: 'I14', name: '응답 결과 표시', text: '선택·입력한 응답은 즉시 분명하게 표시된다.' }
      ]
    }
  ],
  // 평정 칸 맨 위에 한 번 보여 주는 공통 단서
  indicatorNote: '모든 지표는 이 문항이 측정하려는 능력과 응시 학습자에 비추어 판단합니다.',
  commentLabel: '이 문항에 대해 덧붙일 의견이 있으면 적어 주세요.',
  requireComment: false,
  // 모든 문항의 평정을 마친 뒤 묻는 개방형 질문
  finalQuestions: [
    { key: 'hard', label: '판단하기 어려웠던 지표가 있었다면, 그 지표와 이유를 적어 주세요.', required: false },
    { key: 'use', label: '준거와 지표를 활용하는 것에 대한 의견을 적어 주세요.', required: false }
  ]
};

// ===================== 3. 기본 정보 =====================
// 조사 대상이 초·중학교 교사로 넓어져 '담당 학년'을 '학교급'과 '주 담당 교과'로 바꿨습니다.
// ※ school 의 답으로 평정할 세트가 정해집니다(STUDY.levelFrom). 선택지 차례를 바꾸면 levelFrom.sets 도 함께 바꾸세요.
const DEMO = [
  { key: 'career', label: '교직 경력', choices: ['5년 미만', '5년 이상 10년 미만', '10년 이상 20년 미만', '20년 이상'] },
  { key: 'school', label: '근무 학교급 (이 답에 따라 평정할 문항이 정해집니다)', choices: ['초등학교', '중학교'] },
  { key: 'subject', label: '주로 가르치는 교과', choices: ['초등 담임(여러 교과)', '국어', '수학', '과학', '사회', '그 밖의 교과'], column: true },
  { key: 'cbt', label: '컴퓨터 기반 평가(예: 맞춤형 학업성취도 자율평가)를 시행해 보신 적이 있나요?', choices: ['있다', '없다'] },
  { key: 'digital', label: '수업이나 평가에서 디지털 평가 문항(에듀테크 플랫폼 등)을 얼마나 자주 사용하시나요?',
    choices: ['거의 사용하지 않는다', '한 학기에 몇 번', '한 달에 몇 번', '일주일에 한 번 이상'], column: true },
  { key: 'device', label: '지금 사용하시는 기기', choices: ['태블릿', '노트북·PC', '스마트폰'] }
];

// ===================== 4. 결함 스위치 =====================
/*
 * 세트마다 결함 문항 8개(준거별 2개, 서로 다른 지표 8개). 두 세트는 같은 지표 8개를 같은 결함 방식으로 다루고,
 * 내용만 학교급에 맞게 다릅니다. 문항 id 로 켜고 끕니다. on 을 false 로 바꾸면 그 문항은
 * 14개 지표를 모두 충족하는 판으로 나갑니다. 화면 차이는 items/items.js 에 있습니다.
 * 바꾼 뒤에는 toolVersion 을 바꾸세요(시트의 defect_on 열에도 그 사람이 본 상태가 남습니다).
 *
 *   지표(id)           결함 방식                                         초등   중등
 *   정보 선별          응답 영역 아래 풀이와 무관한 덧붙임 지식 상자            E01    M01
 *   장식 절제          문두 옆, 문두보다 큰 정지 캐릭터                       E02    M02
 *   색 외 구분 단서     그림 요소를 색으로만 구분, 문항도 색 이름으로만 가리킴     E03    M03
 *   핵심 정보 강조      문두 어구마다 다른 강조 → 핵심 조건이 묻힘              E04    M04
 *   지문·자료 참조      지문 팝업이 응답 영역을 덮음(문두는 가리지 않음)          E05    M05
 *   관련 정보 근접 배치  비교할 두 자료를 화면 대각선 끝에 떨어뜨림               E06    M06
 *   응답 방식 인지      입력 칸이 본문 괄호와 똑같이 보이고 안내 없음             E07    M07
 *   응답 결과 표시      칸에 놓은 카드가 글자 없는 작은 점으로만 보임             E08    M08
 */
// indicator = SURVEY 의 지표 id, elements = '의도한 결함 요소'(items/items.js 의 data-el 이름).
// 교사가 '미충족'의 근거로 고른 요소에 이 중 하나가 있으면 결함 탐지, 없으면 과잉 판단으로 봅니다.
//   요소 이름: extra(더 알아보기 상자) · mascot(캐릭터 그림) · data(지문·그림·자료) · resp(선택지·답 칸·선 잇기 칸)
//             stem(문두) · popup(지문 보기 단추) · dataA·dataB(떨어진 두 자료) · bins(카드 놓는 칸) · bank(카드) · guide(안내)
//             direction(국어 지시문 "다음 글을 읽고, 물음에 답하세요.") · other(그 밖의 요소 — 교사 메모로 확인)
const DEFECTS = {
  E01: { on: true, criterion: 'C1', indicator: 'I01', elements: ['extra'] },
  E02: { on: true, criterion: 'C1', indicator: 'I02', elements: ['mascot'] },
  E03: { on: true, criterion: 'C2', indicator: 'I05', elements: ['data', 'resp'] },   // 색으로만 구분한 지층 그림, 색 이름뿐인 선택지
  E04: { on: true, criterion: 'C2', indicator: 'I07', elements: ['stem'] },
  E05: { on: true, criterion: 'C3', indicator: 'I09', elements: ['popup'] },
  E06: { on: true, criterion: 'C3', indicator: 'I10', elements: ['dataA', 'dataB'] },
  E07: { on: true, criterion: 'C4', indicator: 'I11', elements: ['resp'] },
  E08: { on: true, criterion: 'C4', indicator: 'I14', elements: ['bins'] },
  M01: { on: true, criterion: 'C1', indicator: 'I01', elements: ['extra'] },
  M02: { on: true, criterion: 'C1', indicator: 'I02', elements: ['mascot'] },
  M03: { on: true, criterion: 'C2', indicator: 'I05', elements: ['data', 'resp'] },   // 색으로만 구분한 화살표, 색 이름뿐인 잇기 칸
  M04: { on: true, criterion: 'C2', indicator: 'I07', elements: ['stem'] },
  M05: { on: true, criterion: 'C3', indicator: 'I09', elements: ['popup'] },
  M06: { on: true, criterion: 'C3', indicator: 'I10', elements: ['dataA', 'dataB'] },
  M07: { on: true, criterion: 'C4', indicator: 'I11', elements: ['resp'] },
  M08: { on: true, criterion: 'C4', indicator: 'I14', elements: ['bins'] }
};

// ===================== 5. 평정 대상 문항 =====================
/*
 * 24문항의 화면(지문·발문·선택지·그림·정답)은 교사 화면 쪽 items/items.js 에 있습니다.
 * 여기에는 시트 기록에 쓰는 정보만 둡니다. id 는 items.js 의 id 와 같아야 합니다.
 * 각 세트: 교과마다 3문항(결함 2 + 결함 없음 1), 응답 형식마다 3문항, 준거마다 결함 2개는 서로 다른 형식.
 * 정답은 교사 화면이 [정답 확인]과 시트의 correct 열 계산에 함께 씁니다(items.js).
 */
const ITEMS = [
  // 초등 세트
  { id: 'E01', set: 'E', no: 1,  school: '초', subject: '과학', type: 'drag' },
  { id: 'E02', set: 'E', no: 2,  school: '초', subject: '국어', type: 'choice' },
  { id: 'E03', set: 'E', no: 3,  school: '초', subject: '과학', type: 'choice' },
  { id: 'E04', set: 'E', no: 4,  school: '초', subject: '수학', type: 'short' },
  { id: 'E05', set: 'E', no: 5,  school: '초', subject: '국어', type: 'match' },
  { id: 'E06', set: 'E', no: 6,  school: '초', subject: '수학', type: 'short' },
  { id: 'E07', set: 'E', no: 7,  school: '초', subject: '사회', type: 'short' },
  { id: 'E08', set: 'E', no: 8,  school: '초', subject: '사회', type: 'drag' },
  { id: 'E09', set: 'E', no: 9,  school: '초', subject: '국어', type: 'choice' },
  { id: 'E10', set: 'E', no: 10, school: '초', subject: '수학', type: 'drag' },
  { id: 'E11', set: 'E', no: 11, school: '초', subject: '과학', type: 'match' },
  { id: 'E12', set: 'E', no: 12, school: '초', subject: '사회', type: 'match' },
  // 중등 세트
  { id: 'M01', set: 'M', no: 1,  school: '중', subject: '사회', type: 'drag' },
  { id: 'M02', set: 'M', no: 2,  school: '중', subject: '국어', type: 'choice' },
  { id: 'M03', set: 'M', no: 3,  school: '중', subject: '과학', type: 'match' },
  { id: 'M04', set: 'M', no: 4,  school: '중', subject: '수학', type: 'choice' },
  { id: 'M05', set: 'M', no: 5,  school: '중', subject: '국어', type: 'match' },
  { id: 'M06', set: 'M', no: 6,  school: '중', subject: '과학', type: 'short' },
  { id: 'M07', set: 'M', no: 7,  school: '중', subject: '수학', type: 'short' },
  { id: 'M08', set: 'M', no: 8,  school: '중', subject: '사회', type: 'drag' },
  { id: 'M09', set: 'M', no: 9,  school: '중', subject: '국어', type: 'short' },
  { id: 'M10', set: 'M', no: 10, school: '중', subject: '수학', type: 'drag' },
  { id: 'M11', set: 'M', no: 11, school: '중', subject: '과학', type: 'choice' },
  { id: 'M12', set: 'M', no: 12, school: '중', subject: '사회', type: 'match' }
];
const SETS = ['E', 'M'];

// 참여 코드 생성 설정: generateCodes 실행 전에 바꿔 주세요
const CODE_BATCH = {
  count: 6,           // 만들 코드 개수
  batch: '파일럿'      // 묶음 이름 (모집 경로 구분용, 교사 이름과는 무관). 예: '파일럿', '본조사-1'
};

// ===================== 6. 웹앱 =====================
// 교사 화면은 GitHub Pages에서 열리고(index.html), 앱스크립트는 자료만 주고받습니다.

function doGet() {
  return ContentService.createTextOutput('서버가 작동 중입니다. 도구 판: ' + STUDY.toolVersion);
}

/**
 * 교사 화면이 보내는 요청을 받는 곳. 요청 한 번 = 서버 함수 한 번.
 *   보내는 것: { fn: 함수 이름, args: [인자들], toolVersion: 화면 파일의 도구 판 }
 *   돌려주는 것: { result: 함수 결과 } 또는 { error: 'version' | 'unknown' | 'server' }
 * 화면이 서버와 다른 판이면 시작 단계에서 막습니다. 제출(submit)은 막지 않습니다(응답이 사라지므로).
 */
function doPost(e) {
  const API = { getStudy: getStudy, assignParticipant: assignParticipant, submit: submit };
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    if (!Object.prototype.hasOwnProperty.call(API, req.fn)) out = { error: 'unknown' };
    else if (req.fn !== 'submit' && req.toolVersion !== STUDY.toolVersion) out = { error: 'version' };
    else out = { result: API[req.fn].apply(null, req.args || []) };
  } catch (err) {
    Logger.log(err && err.stack || err);
    out = { error: 'server' };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/** 교사 화면에 보낼 기본 설정 (문구·준거·기본 정보). 문항 순서와 결함 상태는 assignParticipant 가 보냅니다. */
function getStudy() {
  return { study: STUDY, survey: SURVEY, demo: DEMO, items: [] };
}

/** 교사 화면에 보낼 결함 상태 { 결함 이름: true/false } */
function clientDefects_() {
  const out = {};
  Object.keys(DEFECTS).forEach(k => { out[k] = !!DEFECTS[k].on; });
  return out;
}

/**
 * 참여 코드 확인
 * - 처음 쓰는 코드: 세트마다 문항 순서를 정하고 기록 (어느 세트를 볼지는 교사 화면이 기본 정보 답으로 정함)
 * - 제출 전 다시 들어온 코드: 같은 순서로 재시작, attempts +1
 * - 제출을 마친 코드: 거절
 * 돌려주는 것: orders = { E: [문항 id…], M: [문항 id…] }, defects = { 문항 id: true/false }
 */
function assignParticipant(preview, code) {
  const stamp = new Date().toISOString();
  if (preview) {
    return { ok: true, pid: newPid_(), orders: makeOrders_(), defects: clientDefects_(),
             test: true, assignedAt: stamp, code: '' };
  }

  code = normalizeCode_(code);
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = SpreadsheetApp.openById(getSheetId_()).getSheetByName('codes');
    const found = findCode_(sh, code);
    if (!found) return { ok: false, reason: 'invalid' };

    // 열 차례: code, batch, status, pid, first_used, attempts, done_at, item_order
    const v = found.values;
    if (v[2] === 'done') return { ok: false, reason: 'done' };

    if (v[2] === 'started') {
      sh.getRange(found.row, 6).setValue(Number(v[5] || 1) + 1);
      return { ok: true, pid: String(v[3]), orders: parseOrders_(v[7]), defects: clientDefects_(),
               test: false, assignedAt: stamp, code: code, resumed: true };
    }

    const pid = newPid_();
    const orders = makeOrders_();
    sh.getRange(found.row, 3, 1, 4).setValues([['started', pid, new Date(), 1]]);
    sh.getRange(found.row, 8).setValue(formatOrders_(orders));
    return { ok: true, pid: pid, orders: orders, defects: clientDefects_(),
             test: false, assignedAt: stamp, code: code };
  } finally {
    lock.releaseLock();
  }
}

/** 응답 저장 */
function submit(r) {
  const ss = SpreadsheetApp.openById(getSheetId_());
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    let batch = '', attempts = '', codeRow = null, codeSheet = null;
    if (!r.test) {
      codeSheet = ss.getSheetByName('codes');
      const found = findCode_(codeSheet, normalizeCode_(r.code));
      if (!found || String(found.values[3]) !== String(r.pid)) return { ok: false, reason: 'invalid' };
      if (found.values[2] === 'done') return { ok: false, reason: 'done' };
      batch = found.values[1];
      attempts = found.values[5];
      codeRow = found.row;
    }

    const byId = itemsById_();
    // 이 참여자가 실제로 본 결함 상태 (배정할 때 받은 값). 없으면 지금 설정으로 채운다.
    const seen = r.defects || clientDefects_();

    // participants
    const finalCols = allFinalKeys_().map(k => (r.final && r.final[k]) || '');
    ss.getSheetByName('participants').appendRow([
      new Date(), r.pid, r.test, r.test ? '' : normalizeCode_(r.code), batch, r.level || '', STUDY.toolVersion, attempts,
      r.assignedAt, r.startedAt, r.finishedAt,
      Math.round((new Date(r.finishedAt) - new Date(r.startedAt)) / 1000),
      r.device.width, r.device.height, r.device.ua
    ].concat(DEMO.map(d => d.choices[r.demo[d.key]]))
     .concat([r.order.join(','), JSON.stringify(seen)])
     .concat(finalCols));

    // judgments (판단 한 개당 한 줄) + items (문항 한 개당 한 줄: 조작 로그와 판단 요약)
    const judgRows = [];
    const itemRows = [];
    const inds = indicatorList_();
    r.items.forEach(it => {
      const def = byId[it.id];
      const df = DEFECTS[it.id] || null;
      const on = df ? !!seen[it.id] : false;
      const intended = on ? df.elements : [];
      const tag = [it.id, def.set, def.no, def.school, def.subject, def.type, on,
                   on ? df.criterion : '', on ? df.indicator : '', on ? indicatorName_(df.indicator) : '', on ? intended.join(',') : ''];
      const els = it.elementMap || {};          // 이 문항 화면의 요소 key → { n, name }
      const sum = { judged: 0, na: 0, unmet: 0, over: 0, mixed: 0, detect: [], review: 0 };
      inds.forEach(ind => {
        const j = (it.judgments || {})[ind.id] || {};
        const v = j.v || '';
        const ev = j.els || [];
        const hitsDefect = v === 'unmet' && ev.some(k => intended.indexOf(k) >= 0);
        const hitsOther = v === 'unmet' && ev.some(k => intended.indexOf(k) < 0);
        const type = v === 'met' ? '충족' : v === 'na' ? '해당 없음' : v === 'unmet' ? (hitsDefect ? '결함 탐지' : '과잉 판단') : '';
        if (v && v !== 'na') sum.judged++;
        if (v === 'na') sum.na++;
        if (v === 'unmet') sum.unmet++;
        if (type === '과잉 판단') sum.over++;
        if (hitsDefect && hitsOther) sum.mixed++;
        if (hitsDefect) sum.detect.push(ind.id);
        if (ev.indexOf('other') >= 0) sum.review++;
        judgRows.push([r.pid, r.test, batch, r.level || ''].concat(tag, [
          it.pos, ind.crit, ind.id, ind.name, LABEL_[v] || '',
          ev.join(','), ev.map(k => (els[k] ? els[k].n + ' ' + els[k].name : k)).join(' / '), j.note || '',
          type, hitsDefect, hitsOther,
          on && v === 'unmet' ? ind.id === df.indicator : '', on && v === 'unmet' ? ind.crit === df.criterion : '',
          ev.indexOf('other') >= 0
        ]));
      });
      // 결함 문항: 탐지했는가, 의도한 지표에서만 판단했는가(준거 일치) / 다른 지표·여러 지표에서 판단했는가(준거 혼동)
      const detected = on ? sum.detect.length > 0 : '';
      let match = '';
      if (on && detected) match = (sum.detect.length === 1 && sum.detect[0] === df.indicator) ? '일치' : '혼동';
      const critOnly = on && detected ? sum.detect.every(id => indicatorCrit_(id) === df.criterion) : '';
      itemRows.push([r.pid, r.test, batch, r.level || ''].concat(tag, [
        it.pos,
        Math.round(it.visibleMs / 100) / 10, it.visits,
        it.firstInteractMs, it.interactions, it.interactions > 0,
        it.passageOpens || 0, it.answerChecks || 0, it.scratchOpens || 0,
        sec_(it.solveMs), sec_(it.firstRatingMs), sec_(it.lastRatingMs), it.lateInteractions || 0,
        it.response == null ? '' : JSON.stringify(it.response),
        it.correct == null ? '' : (it.correct ? 1 : 0),
        sum.judged, sum.na, sum.unmet, sum.over, sum.mixed, sum.review,
        detected, sum.detect.join(','), match, critOnly,
        it.judgmentChanges || 0, it.comment || ''
      ]));
    });
    const js = ss.getSheetByName('judgments');
    js.getRange(js.getLastRow() + 1, 1, judgRows.length, judgRows[0].length).setValues(judgRows);
    const is = ss.getSheetByName('items');
    is.getRange(is.getLastRow() + 1, 1, itemRows.length, itemRows[0].length).setValues(itemRows);

    // 저장이 모두 끝난 뒤에 코드 사용 완료 처리
    if (codeRow) {
      codeSheet.getRange(codeRow, 3).setValue('done');
      codeSheet.getRange(codeRow, 7).setValue(new Date());
    }
  } finally {
    lock.releaseLock();
  }
  return { ok: true };
}

/** ms → 초(소수 한 자리). 기록이 없으면 빈칸 */
function sec_(ms) {
  return ms == null ? '' : Math.round(ms / 100) / 10;
}

// ===================== 7. 시트·코드 준비 =====================
function setup() {
  checkConfig();
  const ss = SpreadsheetApp.create(STUDY.title + ' 응답 ' + Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyyMMdd-HHmm'));
  const p = ss.getSheets()[0];
  p.setName('participants');
  // level = 평정한 세트(E 초등 / M 중등), defects = 이 참여자가 본 결함 상태 {문항 id: true/false}
  p.appendRow([
    'saved_at', 'pid', 'test', 'code', 'batch', 'level', 'tool_version', 'attempts',
    'assigned_at', 'started_at', 'finished_at', 'duration_sec',
    'viewport_w', 'viewport_h', 'user_agent'
  ].concat(DEMO.map(d => d.key))
   .concat(['item_order', 'defects'])
   .concat(allFinalKeys_()));

  // [judgments] 지표 판단 한 개당 한 줄 (교사 × 문항 × 지표 14개)
  //   defect_on = 이 참여자에게 이 문항이 결함 문항이었는가. target_* = 의도한 준거·지표·결함 요소 (결함 없는 문항은 빈칸)
  //   judgment = 충족 / 미충족 / 해당 없음, evidence_keys = 근거 요소 key, evidence = 화면 번호와 이름, note = 교사 메모
  //   judgment_type = 충족 / 해당 없음 / 결함 탐지(근거에 의도한 결함 요소가 있음) / 과잉 판단(근거에 의도한 결함 요소가 없음)
  //   hits_defect·hits_other = 근거에 의도한 결함 요소 / 그 밖의 요소가 들어 있는가 (둘 다 TRUE면 섞인 근거)
  //   on_target_indicator·on_target_criterion = 미충족 판단이 의도한 지표·준거에서 이루어졌는가 (결함 문항만)
  //   needs_review = 근거로 '그 밖의 요소(메모)'를 고름 → 연구자가 메모를 보고 분류를 확인
  ss.insertSheet('judgments').appendRow([
    'pid', 'test', 'batch', 'level', 'item_id', 'set', 'item_no', 'school', 'subject', 'type', 'defect_on',
    'target_criterion', 'target_indicator_id', 'target_indicator', 'target_elements',
    'position', 'criterion', 'indicator_id', 'indicator', 'judgment',
    'evidence_keys', 'evidence', 'note',
    'judgment_type', 'hits_defect', 'hits_other', 'on_target_indicator', 'on_target_criterion', 'needs_review'
  ]);
  // [items] 문항 한 개당 한 줄 — 조작 로그와 판단 요약
  //   visible_sec = 문항 화면을 본 시간 전체, solve_sec = 첫 판단 전 마지막 조작까지(풀이 시간)
  //   passage_opens·answer_checks·scratch_opens = 지문 팝업·정답 확인·연습장을 쓴 횟수, correct = 마지막 응답의 정답 여부
  //   judged = '해당 없음'을 뺀 판단 수, unmet = 미충족 수, over = 과잉 판단 수, mixed = 섞인 근거 수, review = 메모 확인 필요 수
  //   detected = 결함을 탐지했는가(결함 문항만), detect_indicators = 결함 탐지가 나온 지표
  //   criterion_match = 일치(의도한 지표에서만 탐지) / 혼동(다른 지표나 여러 지표에서 탐지), same_criterion_only = 탐지가 모두 의도한 준거 안인가
  ss.insertSheet('items').appendRow([
    'pid', 'test', 'batch', 'level', 'item_id', 'set', 'item_no', 'school', 'subject', 'type', 'defect_on',
    'target_criterion', 'target_indicator_id', 'target_indicator', 'target_elements',
    'position', 'visible_sec', 'visits', 'first_interaction_ms', 'interactions', 'interacted',
    'passage_opens', 'answer_checks', 'scratch_opens',
    'solve_sec', 'first_rating_sec', 'last_rating_sec', 'late_interactions',
    'response', 'correct',
    'judged', 'na', 'unmet', 'over', 'mixed', 'review',
    'detected', 'detect_indicators', 'criterion_match', 'same_criterion_only',
    'judgment_changes', 'comment'
  ]);
  const codes = ss.insertSheet('codes');
  codes.appendRow(['code', 'batch', 'status', 'pid', 'first_used', 'attempts', 'done_at', 'item_order']);
  codes.getRange('A:A').setNumberFormat('@');
  ss.getSheets().forEach(s => s.setFrozenRows(1));

  PropertiesService.getScriptProperties().setProperty('SHEET_ID', ss.getId());
  Logger.log('응답 시트: ' + ss.getUrl());
}

/** CODE_BATCH 설정대로 참여 코드 생성 (헷갈리는 글자 0·O·1·I·L 제외) */
function generateCodes() {
  const sh = SpreadsheetApp.openById(getSheetId_()).getSheetByName('codes');
  const existing = new Set();
  const n = sh.getLastRow() - 1;
  if (n > 0) sh.getRange(2, 1, n, 1).getValues().forEach(r => existing.add(String(r[0])));

  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const rows = [];
  while (rows.length < CODE_BATCH.count) {
    let c = '';
    for (let i = 0; i < 6; i++) c += chars.charAt(Math.floor(Math.random() * chars.length));
    if (existing.has(c)) continue;
    existing.add(c);
    rows.push([c, CODE_BATCH.batch, 'unused', '', '', 0, '', '']);
  }
  sh.getRange(sh.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
  Logger.log(`${CODE_BATCH.batch}: 코드 ${rows.length}개 생성\n` + rows.map(r => r[0]).join('\n'));
}

/**
 * 설정 점검 — setup 이 먼저 부르고, 결함·문항 설정을 고친 뒤 직접 실행해도 됩니다.
 * 세트마다 문항 12개·결함 8개(준거별 2개, 서로 다른 지표)인지, 두 세트가 같은 지표 8개를 다루는지,
 * 결함의 지표 이름이 SURVEY 의 지표와 같은지, levelFrom 이 DEMO 와 맞는지 확인합니다.
 */
function checkConfig() {
  const byId = itemsById_();
  const errs = [];
  const allInds = {};
  SURVEY.criteria.forEach(c => (c.indicators || []).forEach(x => { allInds[x.id] = c.key; }));
  const ELS = ['extra', 'mascot', 'data', 'resp', 'stem', 'popup', 'dataA', 'dataB', 'bins', 'bank', 'guide', 'direction'];
  Object.keys(DEFECTS).forEach(id => (DEFECTS[id].elements || []).forEach(k => {
    if (ELS.indexOf(k) < 0) errs.push(id + ': 알 수 없는 결함 요소 "' + k + '"');
  }));
  const nInd = Object.keys(allInds).length;
  if (nInd !== 14) errs.push('지표가 ' + nInd + '개 (14개여야 함)');
  const indSets = {};
  SETS.forEach(set => {
    const ids = ITEMS.filter(it => it.set === set).map(it => it.id);
    if (ids.length !== 12) errs.push(set + ' 세트 문항이 ' + ids.length + '개 (12개여야 함)');
    const perCrit = {}, inds = {};
    ids.filter(id => DEFECTS[id]).forEach(id => {
      const d = DEFECTS[id];
      if (allInds[d.indicator] !== d.criterion) errs.push(id + ': 지표 "' + d.indicator + '" 가 ' + d.criterion + ' 의 지표가 아님');
      perCrit[d.criterion] = (perCrit[d.criterion] || 0) + 1;
      if (inds[d.indicator]) errs.push(id + ': ' + set + ' 세트 안에서 지표 "' + d.indicator + '" 가 겹침');
      inds[d.indicator] = true;
    });
    SURVEY.criteria.forEach(c => { if (perCrit[c.key] !== 2) errs.push(set + ' 세트 ' + c.key + ': 결함 문항이 ' + (perCrit[c.key] || 0) + '개 (2개여야 함)'); });
    indSets[set] = Object.keys(inds).sort().join(',');
  });
  if (indSets.E !== indSets.M) errs.push('두 세트가 다루는 지표가 다름');
  Object.keys(DEFECTS).forEach(id => { if (!byId[id]) errs.push('DEFECTS 의 ' + id + ' 가 ITEMS 에 없음'); });
  const demo = DEMO.find(d => d.key === STUDY.levelFrom.key);
  if (!demo || demo.choices.length !== STUDY.levelFrom.sets.length) errs.push('STUDY.levelFrom 이 DEMO 의 선택지 수와 맞지 않음');
  if (errs.length) throw new Error('설정 오류:\n' + errs.join('\n'));
  Logger.log('설정 점검 통과: 문항 ' + ITEMS.length + '개(세트 ' + SETS.length + '개), 결함 ' + Object.keys(DEFECTS).length + '개 (켜짐 ' +
             Object.keys(DEFECTS).filter(k => DEFECTS[k].on).length + '개), 지표 ' + nInd + '개');
}

const LABEL_ = { met: '충족', unmet: '미충족', na: '해당 없음' };

/** 지표 목록 (준거 차례대로) [{ id, name, crit }] */
function indicatorList_() {
  const out = [];
  SURVEY.criteria.forEach(c => c.indicators.forEach(x => out.push({ id: x.id, name: x.name, crit: c.key })));
  return out;
}
function indicatorName_(id) { const x = indicatorList_().find(d => d.id === id); return x ? x.name : id; }
function indicatorCrit_(id) { const x = indicatorList_().find(d => d.id === id); return x ? x.crit : ''; }

/**
 * 결함 탐지율·준거 일치율·과잉 판단율을 계산해 summary 탭에 씁니다 (test=TRUE 인 미리보기 응답은 뺍니다).
 *   결함 탐지율 = 결함 문항 평정(교사 × 결함 문항) 가운데 의도한 결함 요소를 근거로 '미충족'을 판단한 비율
 *   준거 일치율 = 결함을 탐지한 평정 가운데 의도한 지표에서만 판단한 비율 (지표 기준). 준거 기준 비율도 함께 적습니다
 *   과잉 판단율 = '해당 없음'을 뺀 전체 지표 판단 가운데 의도한 결함 요소가 아닌 요소만을 근거로 '미충족'을 판단한 비율
 *   ※ 근거에 결함 요소와 다른 요소가 섞이면 결함 탐지로 세고, 섞인 근거 수(mixed)를 따로 적습니다.
 *   ※ '그 밖의 요소(메모)'를 고른 판단(needs_review)은 메모를 읽고 judgments 탭의 judgment_type 을 고친 뒤 다시 실행하세요.
 *      summarize 는 judgments 탭의 judgment_type 열을 그대로 읽어 다시 셉니다.
 */
function summarize() {
  const ss = SpreadsheetApp.openById(getSheetId_());
  const J = readTab_(ss, 'judgments').filter(r => r.test !== true && String(r.test).toUpperCase() !== 'TRUE');
  // 교사 × 문항 단위로 다시 묶는다 (judgment_type 을 연구자가 고쳤을 수 있으므로 items 탭 대신 judgments 에서 계산)
  const byRating = {};
  J.forEach(r => {
    const k = r.pid + '|' + r.item_id;
    const g = byRating[k] || (byRating[k] = { pid: r.pid, level: r.level, item: r.item_id, on: r.defect_on === true || r.defect_on === 'TRUE',
      target: r.target_indicator_id, targetCrit: r.target_criterion, detect: [], judged: 0, over: 0, mixed: 0 });
    if (r.judgment && r.judgment !== '해당 없음') g.judged++;
    if (r.judgment_type === '과잉 판단') g.over++;
    if (r.judgment_type === '결함 탐지') { g.detect.push(r.indicator_id); if (r.hits_other === true || r.hits_other === 'TRUE') g.mixed++; }
  });
  const ratings = Object.keys(byRating).map(k => byRating[k]);
  const rate = (a, b) => (b ? Math.round(a / b * 1000) / 10 : '');
  function stats(rs, label, key) {
    const def = rs.filter(g => g.on);
    const det = def.filter(g => g.detect.length);
    const match = det.filter(g => g.detect.length === 1 && g.detect[0] === g.target);
    const critOnly = det.filter(g => g.detect.every(id => indicatorCrit_(id) === g.targetCrit));
    const judged = rs.reduce((n, g) => n + g.judged, 0), over = rs.reduce((n, g) => n + g.over, 0);
    const mixed = rs.reduce((n, g) => n + g.mixed, 0);
    return [label, key, def.length, det.length, rate(det.length, def.length), match.length, rate(match.length, det.length),
            critOnly.length, rate(critOnly.length, det.length), judged, over, rate(over, judged), mixed];
  }
  const rows = [['구분', '대상', '결함 문항 평정 수', '결함 탐지 수', '결함 탐지율(%)', '준거 일치 수(지표)', '준거 일치율(%)',
                 '같은 준거 안 탐지 수', '준거 수준 일치율(%)', '지표 판단 수(해당 없음 제외)', '과잉 판단 수', '과잉 판단율(%)', '섞인 근거 수']];
  rows.push(stats(ratings, '전체', '전체'));
  SETS.forEach(set => rows.push(stats(ratings.filter(g => g.level === set), '학교급', set === 'E' ? '초등' : '중등')));
  const uniq = xs => xs.filter((x, i) => xs.indexOf(x) === i);
  uniq(ratings.map(g => g.pid)).forEach(pid => rows.push(stats(ratings.filter(g => g.pid === pid), '교사', pid)));
  ITEMS.forEach(it => { const rs = ratings.filter(g => g.item === it.id); if (rs.length) rows.push(stats(rs, '문항', it.id)); });
  // 지표별 과잉 판단 (어느 지표에서 결함이 아닌 요소를 결함으로 보았는가)
  rows.push([]);
  rows.push(['지표별', '지표', '지표 판단 수(해당 없음 제외)', '미충족 수', '결함 탐지 수', '과잉 판단 수', '과잉 판단율(%)', '해당 없음 수']);
  indicatorList_().forEach(ind => {
    const rs = J.filter(r => r.indicator_id === ind.id);
    const judged = rs.filter(r => r.judgment && r.judgment !== '해당 없음').length;
    const over = rs.filter(r => r.judgment_type === '과잉 판단').length;
    rows.push(['지표별', ind.id + ' ' + ind.name, judged, rs.filter(r => r.judgment === '미충족').length,
               rs.filter(r => r.judgment_type === '결함 탐지').length, over, rate(over, judged), rs.filter(r => r.judgment === '해당 없음').length]);
  });
  let sh = ss.getSheetByName('summary');
  if (sh) sh.clear(); else sh = ss.insertSheet('summary');
  const w = Math.max.apply(null, rows.map(r => r.length));
  sh.getRange(1, 1, rows.length, w).setValues(rows.map(r => r.concat(new Array(w - r.length).fill(''))));
  sh.setFrozenRows(1);
  Logger.log('summary 탭을 만들었습니다: 평정 ' + ratings.length + '건');
}

/** 탭을 [{열 이름: 값}] 로 읽는다 */
function readTab_(ss, name) {
  const sh = ss.getSheetByName(name);
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  const v = sh.getRange(1, 1, n + 1, sh.getLastColumn()).getValues();
  const head = v[0];
  return v.slice(1).map(row => { const o = {}; head.forEach((h, i) => { o[h] = row[i]; }); return o; });
}

function allFinalKeys_() {
  return SURVEY.finalQuestions.map(q => q.key);
}

function itemsById_() {
  const byId = {};
  ITEMS.forEach(it => { byId[it.id] = it; });
  return byId;
}

/** 세트마다 문항 순서를 정한다. STUDY.shuffleItems 면 사람마다 순서만 섞는다 → { E: [...], M: [...] } */
function makeOrders_() {
  const out = {};
  SETS.forEach(set => {
    const ids = ITEMS.filter(it => it.set === set).map(it => it.id);
    out[set] = STUDY.shuffleItems ? shuffle_(ids) : ids;
  });
  return out;
}

/** codes 탭 item_order 열: 'E:E03,E01,…|M:M07,…' */
function formatOrders_(orders) {
  return SETS.map(set => set + ':' + orders[set].join(',')).join('|');
}

function parseOrders_(text) {
  const out = {};
  String(text || '').split('|').forEach(part => {
    const k = part.slice(0, part.indexOf(':'));
    if (k) out[k] = part.slice(part.indexOf(':') + 1).split(',').filter(Boolean);
  });
  if (SETS.some(set => !out[set] || !out[set].length)) return makeOrders_();   // 기록이 망가졌으면 새로 정함
  return out;
}

function findCode_(sh, code) {
  const n = sh.getLastRow() - 1;
  if (n < 1 || !code) return null;
  const values = sh.getRange(2, 1, n, 8).getValues();
  const i = values.findIndex(r => String(r[0]) === code);
  return i < 0 ? null : { row: i + 2, values: values[i] };
}

function normalizeCode_(code) {
  return String(code || '').toUpperCase().replace(/\s/g, '');
}

function newPid_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

function getSheetId_() {
  const id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) throw new Error('setup을 먼저 실행해 주세요.');
  return id;
}

function shuffle_(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
