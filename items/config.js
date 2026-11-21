/*
 * 평정용 문항 설정 — 준거·지표와 결함 스위치
 * ------------------------------------------------------------
 * 델파이 조사 뒤 준거가 바뀌면 이 파일만 고치면 됩니다.
 *
 * 1) 결함을 끄고 켜기: defects.<이름>.on 을 true / false 로 바꾼다.
 *    끄면 그 문항은 14개 지표를 모두 충족하는 '결함 없는 판'으로 그려진다.
 * 2) 지표 이름이 바뀌면: indicators 의 name 을 고치고, defects 의 indicator 가
 *    같은 id 를 가리키는지 확인한다.
 * 3) 브라우저 주소로 잠시 바꿔 보기 (파일은 그대로):
 *      ?clean=1            모든 결함 끄기
 *      ?off=bigMascot      그 결함만 끄기 (쉼표로 여러 개)
 *      ?on=bigMascot       그 결함만 켜기
 *      ?item=5             5번 문항부터 보기
 *      ?panel=1            문항 화면 밖에 연구자 설정 칸 열기
 */
window.ITEM_CONFIG = {
  version: '최종 준거(4준거 14지표) · 평정용 12문항 v1',

  criteria: [
    { id: 'C1', name: '화면 요소의 필요성' },
    { id: 'C2', name: '화면 정보의 명료성' },
    { id: 'C3', name: '관련 정보의 통합성' },
    { id: 'C4', name: '응답 조작의 용이성' }
  ],

  // 공통 단서: 모든 지표는 해당 문항이 측정하려는 능력과 응시 학습자에 비추어 판단한다.
  indicators: [
    { id: 'I01', criterion: 'C1', name: '정보 선별', text: '화면의 정보는 풀이와 응답에 필요한 것으로 한정된다.', example: '흥미 유발 문장' },
    { id: 'I02', criterion: 'C1', name: '장식 절제', text: '주의를 분산시키는 장식 요소는 제시되지 않는다.', example: '움직이는 배경 효과' },
    { id: 'I03', criterion: 'C1', name: '반복 최소화', text: '같은 정보는 풀이에 도움이 될 때에만 다른 형식으로 반복 제시된다.', example: '지문을 그대로 옮긴 만화' },
    { id: 'I04', criterion: 'C2', name: '가독성', text: '글자와 시각 자료는 읽기에 적절한 크기·대비·간격으로 제시된다.', example: '작은 글자' },
    { id: 'I05', criterion: 'C2', name: '색 외 구분 단서', text: '색으로 구분되는 정보는 모양·글자·위치로도 구분된다.', example: '색으로만 구분되는 그래프 계열' },
    { id: 'I06', criterion: 'C2', name: '영역 구분', text: '문두, 지문·자료, 응답 영역은 경계가 시각적으로 구분된다.', example: '경계 없이 붙어 있는 지문·선택지' },
    { id: 'I07', criterion: 'C2', name: '핵심 정보 강조', text: '풀이에 필요한 핵심 정보는 강조되고, 그 밖의 정보는 강조되지 않는다.', example: '강조되지 않은 부정어, 정답에만 쓴 굵은 글씨' },
    { id: 'I08', criterion: 'C3', name: '문두·응답 동시 제시', text: '문두와 응답 영역은 풀이하는 동안 한 화면에 함께 제시된다.', example: '스크롤하면 화면 밖으로 밀려나는 문두' },
    { id: 'I09', criterion: 'C3', name: '지문·자료 참조', text: '지문·자료는 응답 영역이 보이는 상태에서 참조할 수 있게 제시된다.', example: '탭을 전환해야 볼 수 있는 지문' },
    { id: 'I10', criterion: 'C3', name: '관련 정보 근접 배치', text: '함께 보아야 할 정보는 한 화면 안에서 가까이 제시된다.', example: '멀리 떨어진 그래프와 범례' },
    { id: 'I11', criterion: 'C4', name: '응답 방식 인지', text: '응답 조작 방식은 화면 표시나 간단한 안내로 제시된다.', example: '잇는 방식이 표시되지 않는 선 잇기' },
    { id: 'I12', criterion: 'C4', name: '조작 간결성', text: '응답 조작은 측정 구인과 무관한 단계 없이 구성된다.', example: '답 하나를 위한 여러 번의 끌어다 놓기' },
    { id: 'I13', criterion: 'C4', name: '조작 대상 크기', text: '터치·클릭 대상은 조작하기에 충분한 크기·간격으로 제시된다.', example: '간격이 좁은 선택지' },
    { id: 'I14', criterion: 'C4', name: '응답 결과 표시', text: '선택·입력한 응답은 즉시 분명하게 표시된다.', example: '끌어다 놓은 뒤 칸을 벗어나 보이는 조각' }
  ],

  // 결함 스위치. item 은 문항 번호, indicator 는 위 indicators 의 id.
  defects: {
    infoTrivia: {
      on: true, item: 1, indicator: 'I01',
      what: '응답 영역 아래에 풀이에 쓰이지 않는 교과 덧붙임 지식 상자("더 알아보기")를 둔다.'
    },
    bigMascot: {
      on: true, item: 2, indicator: 'I02',
      what: '문두 옆에 문두 글자보다 시각적 무게가 큰 정지 캐릭터 그림을 둔다.'
    },
    colorOnlyArrows: {
      on: true, item: 3, indicator: 'I05',
      what: '그림 속 화살표 셋을 색으로만 구분하고, 잇기 칸도 색 이름으로만 가리킨다. (끄면 ㉠㉡㉢ 기호가 붙는다)'
    },
    overEmphasis: {
      on: true, item: 4, indicator: 'I07',
      what: '문두의 거의 모든 어구를 서로 다른 방식으로 강조해 핵심 조건이 묻힌다. (끄면 핵심 조건만 강조)'
    },
    popupCoversResponse: {
      on: true, item: 5, indicator: 'I09',
      what: '지문을 [지문 보기] 팝업으로만 볼 수 있고, 팝업이 문두 아래의 응답 영역을 덮는다. 문두는 가리지 않는다.'
    },
    farApartFigures: {
      on: true, item: 6, indicator: 'I10',
      what: '서로 비교해야 하는 도형 (가)와 (나)를 화면 왼쪽 위와 오른쪽 아래에 떨어뜨려 둔다. (끄면 나란히)'
    },
    hiddenInputBlank: {
      on: true, item: 7, indicator: 'I11',
      what: '입력 칸이 본문 괄호와 똑같이 보이고 입력 안내가 없다. (끄면 입력 칸 표시와 안내가 생긴다)'
    },
    dotAfterDrop: {
      on: true, item: 8, indicator: 'I14',
      what: '칸에 놓은 카드가 글자 없이 작은 점으로만 남아 무엇을 놓았는지 보이지 않는다. (터치 범위는 그대로)'
    }
  }
};
