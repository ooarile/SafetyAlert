const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";           // 13.3 x 7.5
pres.author = "Safety";
pres.title = "세이프티 알람 전송 시스템";

const W = 13.33, H = 7.5, M = 0.62;

const C = {
  ink:    "12181D",
  panel:  "1B242C",
  amber:  "F2A93B",
  red:    "E5484D",
  green:  "4CC38A",
  white:  "FFFFFF",
  soft:   "F2F5F7",
  softer: "F8FAFB",
  dark:   "1B242C",
  body:   "3E4C58",
  muted:  "6B7A87",
  line:   "D8DFE5",
  onDark: "E3E9EE",
  onDarkMuted: "8B9AA6",
};

const F = "Malgun Gothic";
let page = 0;

function darkSlide() {
  const s = pres.addSlide();
  s.background = { color: C.ink };
  return s;
}

function lightSlide(kicker, title) {
  const s = pres.addSlide();
  s.background = { color: C.white };
  page += 1;
  s.addText(kicker, {
    x: M, y: 0.46, w: 8, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, bold: true, color: C.amber, charSpacing: 1.2,
  });
  s.addText(title, {
    x: M, y: 0.76, w: W - M * 2 - 0.6, h: 0.72, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 27, bold: true, color: C.dark,
  });
  s.addText(String(page), {
    x: W - M - 0.6, y: H - 0.62, w: 0.6, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10, color: C.muted, align: "right",
  });
  return s;
}

function card(s, x, y, w, h, fill) {
  s.addShape(pres.ShapeType.roundRect, {
    x, y, w, h, rectRadius: 0.06,
    fill: { color: fill || C.soft }, line: { color: fill || C.soft, width: 0 },
  });
}

function numCircle(s, x, y, label, bg, fg) {
  const d = 0.4;
  s.addShape(pres.ShapeType.ellipse, {
    x, y, w: d, h: d, fill: { color: bg || C.amber }, line: { color: bg || C.amber, width: 0 },
  });
  s.addText(label, {
    x, y, w: d, h: d, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, bold: true, color: fg || C.ink, align: "center", valign: "middle",
  });
}

/* ── 1. 표지 ───────────────────────────────────────────── */
{
  const s = darkSlide();
  s.addShape(pres.ShapeType.ellipse, {
    x: W - 3.5, y: -1.5, w: 5.4, h: 5.4,
    fill: { color: C.amber, transparency: 88 }, line: { width: 0 },
  });
  s.addText("안전 알람 연동 제안", {
    x: M + 0.3, y: 2.28, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, bold: true, color: C.amber, charSpacing: 1.6,
  });
  s.addText("세이프티 알람 전송 시스템", {
    x: M + 0.3, y: 2.72, w: 10, h: 1.0, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 42, bold: true, color: C.white,
  });
  s.addText("폐쇄망 환경에서 안전 이벤트를 현장 단말까지 즉시 전달합니다", {
    x: M + 0.3, y: 3.86, w: 9.4, h: 0.44, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 16, color: C.onDarkMuted,
  });
  s.addText("소개 및 아키텍처  ·  2026.09  ·  v1.0", {
    x: M + 0.3, y: 5.9, w: 8, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, color: C.onDarkMuted, charSpacing: 0.8,
  });
  s.addNotes("폐쇄망 고객사에 안전 알람 전달 기능을 납품하기 위한 소개 자료입니다.");
}

/* ── 2. 한 장 요약 ─────────────────────────────────────── */
{
  const s = lightSlide("한 장 요약", "인터넷 없이, 사내망만으로 알람을 전달합니다");
  const stats = [
    { n: "0", u: "건", t: "외부망 연결", d: "인터넷·클라우드에 의존하지 않습니다" },
    { n: "2", u: "종", t: "수신 단말", d: "PC 상주 앱과 Android 단말" },
    { n: "24", u: "시간", t: "미수신 보관", d: "재접속 시 놓친 알람을 이어받습니다" },
  ];
  const cw = 3.82, gap = 0.36;
  stats.forEach((v, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 1.92, cw, 2.16, C.soft);
    s.addText(
      [
        { text: v.n, options: { fontSize: 52, bold: true, color: C.dark } },
        { text: " " + v.u, options: { fontSize: 15, bold: true, color: C.amber } },
      ],
      { x: x + 0.34, y: 2.16, w: cw - 0.68, h: 0.86, isTextBox: true, margin: 0, fontFace: F }
    );
    s.addText(v.t, {
      x: x + 0.34, y: 3.08, w: cw - 0.68, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 14, bold: true, color: C.dark,
    });
    s.addText(v.d, {
      x: x + 0.34, y: 3.42, w: cw - 0.68, h: 0.52, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, color: C.muted,
    });
  });

  card(s, M, 4.42, W - M * 2, 1.62, C.ink);
  s.addText("감지된 안전 이벤트를 고객사 내부에 설치한 알람 서버가 받아, PC와 현장 단말로 즉시 밀어 넣습니다.", {
    x: M + 0.44, y: 4.76, w: W - M * 2 - 0.88, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 16, bold: true, color: C.white,
  });
  s.addText("모든 구간이 고객사 망 안에서 끝납니다. 외부 서비스 계정, 인터넷 회선, 방화벽 상시 예외가 필요하지 않습니다.", {
    x: M + 0.44, y: 5.22, w: W - M * 2 - 0.88, h: 0.4, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 12.5, color: C.onDarkMuted,
  });
  s.addNotes("핵심 메시지: 외부망 의존 없이 동작한다는 점이 이 구성의 존재 이유입니다.");
}

/* ── 3. 배경 ───────────────────────────────────────────── */
{
  const s = lightSlide("배경", "감지는 되고 있으나, 사람에게 닿는 경로가 없습니다");
  const lw = 5.9;
  card(s, M, 1.92, lw, 3.14, C.soft);
  s.addText("지금의 공백", {
    x: M + 0.42, y: 2.22, w: lw - 0.84, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 16, bold: true, color: C.dark,
  });
  s.addText(
    [
      { text: "안전 이벤트가 감지되어도 확인 경로가 대시보드 하나뿐입니다", options: { bullet: true, breakLine: true } },
      { text: "화면을 보고 있지 않으면 인지가 늦어집니다", options: { bullet: true, breakLine: true } },
      { text: "담당자가 자리를 비우면 전달이 끊깁니다", options: { bullet: true, breakLine: true } },
      { text: "현장 작업자는 대시보드 앞에 있지 않습니다", options: { bullet: true } },
    ],
    {
      x: M + 0.42, y: 2.72, w: lw - 0.84, h: 2.7, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13.5, color: C.body, paraSpaceAfter: 12, lineSpacingMultiple: 1.1,
    }
  );

  const rx = M + lw + 0.42, rw = W - M * 2 - lw - 0.42;
  s.addText("알람 채널에 필요한 세 가지", {
    x: rx, y: 1.92, w: rw, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 16, bold: true, color: C.dark,
  });
  const needs = [
    { k: "즉시성", d: "이벤트 감지 후 수 초 내에 단말에 도달" },
    { k: "상시성", d: "화면이 꺼져 있어도 수신, 앱을 열어둘 필요 없음" },
    { k: "폐쇄성", d: "인터넷 없이 고객사 망 안에서만 동작" },
  ];
  needs.forEach((v, i) => {
    const y = 2.5 + i * 1.14;
    numCircle(s, rx, y, String(i + 1));
    s.addText(v.k, {
      x: rx + 0.58, y: y - 0.02, w: rw - 0.58, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 14.5, bold: true, color: C.dark,
    });
    s.addText(v.d, {
      x: rx + 0.58, y: y + 0.32, w: rw - 0.58, h: 0.56, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 12, color: C.muted,
    });
  });
  s.addNotes("대시보드는 남습니다. 알람은 대시보드를 보지 않는 시간을 메우는 보조 채널입니다.");
}

/* ── 4. AS-IS ──────────────────────────────────────────── */
{
  const s = lightSlide("AS-IS", "Teams 기반 알림은 폐쇄망에서 성립하지 않습니다");
  const items = [
    { t: "클라우드 전용", d: "Teams는 Microsoft 365 클라우드 서비스로만 제공됩니다. 사내에 설치하는 Teams 서버 제품은 존재하지 않습니다." },
    { t: "인터넷 접속이 전제", d: "Microsoft가 제시하는 네트워크 준비 항목의 첫 번째가 전 사업장의 인터넷 접속과 M365 엔드포인트 개방입니다." },
    { t: "부분 허용 불가", d: "필요한 도메인만 골라 여는 선택적 허용을 Microsoft가 지원하지 않습니다. 공개된 엔드포인트 전체를 열어야 합니다." },
    { t: "예외 목록이 계속 바뀜", d: "허용 대상 목록이 정기적으로 갱신됩니다. 방화벽 예외가 1회 작업이 아니라 상시 운영 부담이 됩니다." },
  ];
  const cw = 5.9, ch = 1.44;
  items.forEach((v, i) => {
    const x = M + (i % 2) * (cw + 0.42);
    const y = 1.92 + Math.floor(i / 2) * (ch + 0.34);
    card(s, x, y, cw, ch, C.soft);
    numCircle(s, x + 0.36, y + 0.34, String(i + 1), C.red, C.white);
    s.addText(v.t, {
      x: x + 0.94, y: y + 0.32, w: cw - 1.3, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 14.5, bold: true, color: C.dark,
    });
    s.addText(v.d, {
      x: x + 0.94, y: y + 0.68, w: cw - 1.3, h: 0.66, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, color: C.body, lineSpacingMultiple: 1.05,
    });
  });

  card(s, M, 5.5, W - M * 2, 0.92, C.ink);
  s.addText("인터넷이 차단된 고객사 망에서 Teams는 알람 채널이 될 수 없습니다. 예외를 열더라도 외부망 연동이 상시 유지되어야 합니다.", {
    x: M + 0.44, y: 5.74, w: W - M * 2 - 0.88, h: 0.44, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13.5, bold: true, color: C.white,
  });
  s.addNotes("고객사 IT팀이 반박할 수 있는 지점이라 다음 장에 공식 문서 근거를 붙였습니다.");
}

/* ── 5. 근거 ───────────────────────────────────────────── */
{
  const s = lightSlide("확인 근거", "Microsoft 공식 문서로 확인한 내용입니다");
  const rows = [
    ["사내 설치형 Teams 제품", "없습니다. 사내 설치형 통합 커뮤니케이션 제품은 Skype for Business Server SE이며 Teams와는 다른 별개 제품입니다.", "Microsoft Tech Community"],
    ["인터넷 접속 요구", "네트워크 준비 확인 항목 1번이 전 사업장의 인터넷 접속입니다. 더해 M365 엔드포인트의 TCP 포트와 IP 개방을 요구합니다.", "Microsoft Learn — Prepare your network for Teams"],
    ["일부만 허용 가능 여부", "불가합니다. 원문은 “Microsoft does not support selective allow-listing” 이며, 전체 엔드포인트 허용을 요구합니다.", "Microsoft Learn — M365 network connectivity principles"],
  ];
  const colX = [M, M + 3.0, M + 9.3], colW = [2.86, 6.18, 2.68];
  const head = ["확인 항목", "확인 내용", "출처"];
  head.forEach((h, i) => {
    s.addText(h, {
      x: colX[i], y: 1.94, w: colW[i], h: 0.28, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11, bold: true, color: C.amber, charSpacing: 0.8,
    });
  });
  rows.forEach((r, i) => {
    const y = 2.34 + i * 1.28;
    card(s, M - 0.16, y - 0.1, W - M * 2 + 0.32, 1.12, i % 2 === 0 ? C.softer : C.white);
    s.addText(r[0], {
      x: colX[0], y: y + 0.06, w: colW[0], h: 0.66, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13, bold: true, color: C.dark,
    });
    s.addText(r[1], {
      x: colX[1], y: y + 0.04, w: colW[1], h: 0.86, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, color: C.body, lineSpacingMultiple: 1.05,
    });
    s.addText(r[2], {
      x: colX[2], y: y + 0.06, w: colW[2], h: 0.7, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 10.5, color: C.muted,
    });
  });
  s.addText("2026년 9월 확인.  Skype for Business Server 2015 / 2019 는 2025년 10월 지원이 종료되었습니다.", {
    x: M, y: 6.32, w: W - M * 2, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 10.5, color: C.muted, italic: true,
  });
  s.addNotes("출처 URL: learn.microsoft.com/microsoftteams/prepare-network, learn.microsoft.com/microsoft-365/enterprise/microsoft-365-network-connectivity-principles");
}

/* ── 6. TO-BE 아키텍처 ─────────────────────────────────── */
{
  const s = lightSlide("TO-BE", "고객사 망 안에 알람 서버를 두는 구성입니다");

  // 폐쇄망 경계
  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 1.86, w: 9.62, h: 3.08, rectRadius: 0.04,
    fill: { color: C.softer }, line: { color: C.line, width: 1.25, dashType: "dash" },
  });
  s.addText("고객사 폐쇄망  ·  인터넷 연결 없음", {
    x: M + 0.3, y: 2.02, w: 5, h: 0.26, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, bold: true, color: C.muted,
  });

  const box = (x, y, w, h, title, sub, fill, tc, sc) => {
    s.addShape(pres.ShapeType.roundRect, {
      x, y, w, h, rectRadius: 0.07,
      fill: { color: fill }, line: { color: fill, width: 0 },
      shadow: { type: "outer", color: "8B9AA6", blur: 6, offset: 1, angle: 90, opacity: 0.22 },
    });
    s.addText(title, {
      x: x + 0.16, y: y + 0.24, w: w - 0.32, h: 0.32, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13, bold: true, color: tc, align: "center",
    });
    s.addText(sub, {
      x: x + 0.16, y: y + 0.58, w: w - 0.32, h: 0.46, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 10.5, color: sc, align: "center",
    });
  };

  box(M + 0.34, 2.62, 2.5, 1.16, "세이프티 백엔드", "이벤트 감지", C.white, C.dark, C.muted);
  box(M + 3.62, 2.62, 2.5, 1.16, "알람 서버", "ntfy · TCP 8080", C.ink, C.white, C.onDarkMuted);
  box(M + 6.9, 2.0, 2.34, 1.16, "PC 트레이 앱", "상주 · 자동 실행", C.white, C.dark, C.muted);
  box(M + 6.9, 3.52, 2.34, 1.16, "Android 단말", "ntfy 앱", C.white, C.dark, C.muted);

  const arrow = (x, y, w, color) =>
    s.addShape(pres.ShapeType.line, {
      x, y, w, h: 0, line: { color, width: 1.75, endArrowType: "triangle" },
    });
  arrow(M + 2.92, 3.2, 0.62, C.dark);
  s.addText("HTTP POST\n토큰 인증", {
    x: M + 2.6, y: 3.3, w: 1.28, h: 0.5, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 9, color: C.muted, align: "center",
  });

  s.addShape(pres.ShapeType.line, {
    x: M + 6.2, y: 3.2, w: 0.34, h: 0, line: { color: C.amber, width: 1.75 },
  });
  s.addShape(pres.ShapeType.line, {
    x: M + 6.54, y: 2.58, w: 0, h: 1.24, line: { color: C.amber, width: 1.75 },
  });
  arrow(M + 6.54, 2.58, 0.34, C.amber);
  arrow(M + 6.54, 3.82, 0.34, C.amber);
  s.addText("WebSocket 상시 연결", {
    x: M + 5.62, y: 4.0, w: 2.1, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 9, color: C.amber, align: "center",
  });

  // 차단된 외부망
  const ox = M + 10.02;
  s.addShape(pres.ShapeType.roundRect, {
    x: ox, y: 2.62, w: 2.06, h: 1.16, rectRadius: 0.07,
    fill: { color: C.white }, line: { color: C.line, width: 1.25, dashType: "dash" },
  });
  s.addText("인터넷\nMicrosoft 365", {
    x: ox + 0.1, y: 2.86, w: 1.86, h: 0.7, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, color: C.muted, align: "center",
  });
  s.addText("연결 없음", {
    x: ox, y: 3.92, w: 2.06, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, bold: true, color: C.red, align: "center",
  });

  // 폐쇄망과 외부망 사이가 끊겨 있음을 명시
  s.addText("✕", {
    x: M + 9.62, y: 3.02, w: 0.4, h: 0.36, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 17, bold: true, color: C.red, align: "center", valign: "middle",
  });

  s.addText("알람 서버는 고객사 서버에 Docker 컨테이너로 설치됩니다. 단말은 서버에 상시 연결을 유지하고, 알람이 발생하면 서버가 그 연결로 밀어 넣습니다.", {
    x: M, y: 5.44, w: W - M * 2, h: 0.44, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 12, color: C.body,
  });
  s.addNotes("단말이 주기적으로 물어보는 방식이 아니라 서버가 밀어 넣는 방식이라 지연이 없습니다.");
}

/* ── 7. 구성 요소 ──────────────────────────────────────── */
{
  const s = lightSlide("구성 요소", "새로 들어가는 것은 알람 서버 한 대입니다");
  const rows = [
    ["알람 서버 (ntfy)", "알람 중계", "고객사 서버 · Docker", "TCP 8080 수신"],
    ["세이프티 백엔드", "이벤트 감지 및 발송", "고객사 서버", "HTTP POST · 토큰"],
    ["PC 트레이 앱", "상시 수신 및 알림 표시", "알람 수신 PC", "WebSocket"],
    ["Android ntfy 앱", "상시 수신 및 알림 표시", "현장 단말", "WebSocket"],
  ];
  const cx = [M, M + 3.5, M + 6.2, M + 9.6], cwid = [3.3, 2.6, 3.3, 2.4];
  ["구성 요소", "역할", "설치 위치", "통신"].forEach((h, i) => {
    s.addText(h, {
      x: cx[i], y: 1.96, w: cwid[i], h: 0.28, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11, bold: true, color: C.amber, charSpacing: 0.8,
    });
  });
  rows.forEach((r, i) => {
    const y = 2.4 + i * 0.86;
    card(s, M - 0.16, y - 0.12, W - M * 2 + 0.32, 0.74, i % 2 === 0 ? C.softer : C.white);
    r.forEach((cell, j) => {
      s.addText(cell, {
        x: cx[j], y: y + 0.04, w: cwid[j], h: 0.44, isTextBox: true, margin: 0,
        fontFace: F, fontSize: 12.5, bold: j === 0, color: j === 0 ? C.dark : C.body,
      });
    });
  });

  card(s, M, 6.02, W - M * 2, 0.86, C.soft);
  s.addText("PC 앱은 .NET 자체 포함 단일 실행 파일입니다. 고객사 PC에 런타임을 따로 설치할 필요가 없고, 외부 패키지 의존이 없습니다.", {
    x: M + 0.42, y: 6.24, w: W - M * 2 - 0.84, h: 0.42, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 12, color: C.body,
  });
  s.addNotes("폐쇄망에서 런타임 설치와 패키지 내려받기가 불가능한 점을 고려한 설계입니다.");
}

/* ── 8. 전송 흐름 ──────────────────────────────────────── */
{
  const s = lightSlide("전송 흐름", "감지에서 알림까지 네 단계입니다");
  const steps = [
    { t: "감지", d: "백엔드가 안전 이벤트를 판정합니다" },
    { t: "발송", d: "알람 서버로 제목·본문·우선순위를 보냅니다" },
    { t: "중계", d: "서버가 구독 중인 단말 전체로 밀어 넣습니다" },
    { t: "표시", d: "PC와 단말에 알림과 경고음이 뜹니다" },
  ];
  const cw = 2.86, gap = 0.32;
  steps.forEach((v, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 1.94, cw, 1.72, C.soft);
    numCircle(s, x + 0.32, 2.2, String(i + 1));
    s.addText(v.t, {
      x: x + 0.86, y: 2.2, w: cw - 1.16, h: 0.32, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 15, bold: true, color: C.dark,
    });
    s.addText(v.d, {
      x: x + 0.32, y: 2.76, w: cw - 0.64, h: 0.76, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, color: C.body, lineSpacingMultiple: 1.05,
    });
    if (i < 3) {
      s.addShape(pres.ShapeType.line, {
        x: x + cw + 0.05, y: 2.8, w: 0.22, h: 0,
        line: { color: C.amber, width: 1.75, endArrowType: "triangle" },
      });
    }
  });

  s.addText("우선순위 정책", {
    x: M, y: 4.06, w: 6, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 16, bold: true, color: C.dark,
  });
  const pr = [
    ["넘어짐 감지", "5", "방해금지 모드를 무시하고 울립니다", C.red],
    ["위험구역 침입", "4", "소리와 함께 표시합니다", C.amber],
    ["안전모 미착용", "3", "기본 알림으로 표시합니다", C.muted],
  ];
  pr.forEach((r, i) => {
    const y = 4.56 + i * 0.66;
    card(s, M - 0.16, y - 0.1, W - M * 2 + 0.32, 0.58, i % 2 === 0 ? C.softer : C.white);
    s.addShape(pres.ShapeType.roundRect, {
      x: M, y: y - 0.02, w: 0.42, h: 0.42, rectRadius: 0.1,
      fill: { color: r[3] }, line: { width: 0 },
    });
    s.addText(r[1], {
      x: M, y: y - 0.02, w: 0.42, h: 0.42, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13, bold: true, color: C.white, align: "center", valign: "middle",
    });
    s.addText(r[0], {
      x: M + 0.62, y: y + 0.04, w: 3.0, h: 0.34, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13, bold: true, color: C.dark,
    });
    s.addText(r[2], {
      x: M + 3.8, y: y + 0.04, w: 7.8, h: 0.34, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 12, color: C.body,
    });
  });
  s.addNotes("우선순위 5는 안드로이드 방해금지 모드를 무시합니다. 야간 근무 시 중요한 차이입니다.");
}

/* ── 9. 지원 단말 ──────────────────────────────────────── */
{
  const s = lightSlide("지원 단말", "iOS는 실시간 수신이 불가능합니다");
  const dev = [
    { t: "PC 트레이 앱", ok: "수신 가능", c: C.green,
      d: "화면이 꺼져 있어도 받습니다. 프로그램이 실행 중이어야 하며, 부팅 시 자동 실행으로 등록합니다." },
    { t: "Android", ok: "수신 가능", c: C.green,
      d: "앱이 백그라운드에 있어도 받습니다. 상시 연결 설정과 배터리 최적화 해제가 반드시 필요합니다." },
    { t: "iPhone · iPad", ok: "수신 불가", c: C.red,
      d: "애플이 앱의 상시 백그라운드 연결을 금지합니다. 우회하려면 애플 푸시 서버를 거쳐야 하고 이는 인터넷을 요구합니다." },
  ];
  const cw = 3.82, gap = 0.36;
  dev.forEach((v, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 1.94, cw, 2.72, i === 2 ? C.softer : C.soft);
    s.addText(v.t, {
      x: x + 0.34, y: 2.2, w: cw - 0.68, h: 0.34, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 16, bold: true, color: C.dark,
    });
    s.addShape(pres.ShapeType.roundRect, {
      x: x + 0.34, y: 2.68, w: 1.34, h: 0.36, rectRadius: 0.18,
      fill: { color: v.c }, line: { width: 0 },
    });
    s.addText(v.ok, {
      x: x + 0.34, y: 2.68, w: 1.34, h: 0.36, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, bold: true, color: C.white, align: "center", valign: "middle",
    });
    s.addText(v.d, {
      x: x + 0.34, y: 3.22, w: cw - 0.68, h: 1.2, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, color: C.body, lineSpacingMultiple: 1.08,
    });
  });

  card(s, M, 4.98, W - M * 2, 1.14, C.ink);
  s.addText("제안 단계에서 알람 수신 단말을 Android로 확정해 주십시오.", {
    x: M + 0.44, y: 5.22, w: W - M * 2 - 0.88, h: 0.34, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 14, bold: true, color: C.white,
  });
  s.addText("iOS 제약은 우회 방법이 없습니다. 도입 후에 발견되면 단말을 새로 구매해야 합니다.", {
    x: M + 0.44, y: 5.6, w: W - M * 2 - 0.88, h: 0.34, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 12, color: C.onDarkMuted,
  });
  s.addNotes("iOS는 우회 불가입니다. 계약 전에 반드시 합의해야 하는 항목입니다.");
}

/* ── 10. 보안 ──────────────────────────────────────────── */
{
  const s = lightSlide("보안 설계", "기본은 전면 차단, 필요한 권한만 엽니다");
  const sec = [
    { t: "기본 차단", d: "모든 토픽에 대한 접근을 기본 거부로 두고, 지정한 계정에만 권한을 부여합니다." },
    { t: "권한 분리", d: "발송 계정은 쓰기 전용, 수신 계정은 읽기 전용입니다. 현장 단말은 알람을 보낼 수 없습니다." },
    { t: "토큰 발행", d: "백엔드는 발행 토큰으로만 알람을 보냅니다. 비밀번호를 코드나 설정에 두지 않습니다." },
    { t: "설치 시 자동 검증", d: "설치 스크립트가 익명 발행과 수신 계정 발행이 실제로 차단되는지 확인하고 결과를 출력합니다." },
  ];
  const cw = 5.9, ch = 1.32;
  sec.forEach((v, i) => {
    const x = M + (i % 2) * (cw + 0.42);
    const y = 1.94 + Math.floor(i / 2) * (ch + 0.32);
    card(s, x, y, cw, ch, C.soft);
    numCircle(s, x + 0.36, y + 0.3, "✓", C.green, C.white);
    s.addText(v.t, {
      x: x + 0.94, y: y + 0.28, w: cw - 1.3, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 14.5, bold: true, color: C.dark,
    });
    s.addText(v.d, {
      x: x + 0.94, y: y + 0.64, w: cw - 1.3, h: 0.58, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, color: C.body, lineSpacingMultiple: 1.05,
    });
  });

  s.addText("전송 구간 암호화에 대하여", {
    x: M, y: 5.16, w: 6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, bold: true, color: C.dark,
  });
  s.addText("고객사 망 내부 통신이므로 기본 구성은 평문 HTTP입니다. 사설 인증서는 안드로이드가 신뢰하지 않을 수 있고 PC마다 인증서를 설치해야 해 일정이 늘어납니다. HTTPS가 요건이라면 사내 인증서 기반으로 별도 구성이 가능합니다.", {
    x: M, y: 5.54, w: W - M * 2, h: 0.86, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 12, color: C.body, lineSpacingMultiple: 1.08,
  });
  s.addNotes("HTTPS 요건이 나오면 인증서 만료 관리가 유지보수 항목으로 추가된다는 점을 함께 설명하십시오.");
}

/* ── 11. 도입 절차 및 검증 ─────────────────────────────── */
{
  const s = lightSlide("도입 절차", "설치는 스크립트 1회 실행으로 끝납니다");
  const ph = [
    { t: "사전 확인", d: "Docker 설치 여부\n방화벽 8080 허용\nAPK 설치 허용" },
    { t: "서버 설치", d: "반입 파일 복사\n스크립트 1회 실행\n계정·토큰 자동 생성" },
    { t: "단말 배포", d: "PC 상주 앱 설치\n현장 단말 앱 설치\n배터리 설정 적용" },
    { t: "현장 검증", d: "실제 이벤트 발생\n단말 도달 확인\n장애 복구 확인" },
  ];
  const cw = 2.86, gap = 0.32;
  ph.forEach((v, i) => {
    const x = M + i * (cw + gap);
    card(s, x, 1.94, cw, 2.0, C.soft);
    numCircle(s, x + 0.32, 2.18, String(i + 1));
    s.addText(v.t, {
      x: x + 0.86, y: 2.18, w: cw - 1.16, h: 0.32, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 15, bold: true, color: C.dark,
    });
    s.addText(v.d, {
      x: x + 0.32, y: 2.74, w: cw - 0.64, h: 1.02, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, color: C.body, lineSpacingMultiple: 1.14,
    });
    if (i < 3) {
      s.addShape(pres.ShapeType.line, {
        x: x + cw + 0.05, y: 2.9, w: 0.22, h: 0,
        line: { color: C.amber, width: 1.75, endArrowType: "triangle" },
      });
    }
  });

  s.addText("사전 검증을 마친 항목", {
    x: M, y: 4.32, w: 6, h: 0.32, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 16, bold: true, color: C.dark,
  });
  const done = [
    "권한 차단 — 수신 계정과 익명의 알람 발송이 실제로 거부됨",
    "한글 무손실 — 제목과 본문의 한글·특수문자가 그대로 전달됨",
    "재접속 이어받기 — 끊긴 동안 발생한 알람을 재연결 시 수신",
    "장애 복구 — 서버 중단 후 재기동 시 단말이 자동 재연결",
    "설정 오류 안내 — 주소·계정·토픽 오류를 원인별로 구분해 알림",
    "부팅 자동 실행 — PC 재시작 후 상주 앱이 자동 기동",
  ];
  done.forEach((t, i) => {
    const x = M + (i % 2) * 6.32;
    const y = 4.84 + Math.floor(i / 2) * 0.54;
    s.addText("✓", {
      x, y, w: 0.28, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13, bold: true, color: C.green,
    });
    s.addText(t, {
      x: x + 0.3, y, w: 5.9, h: 0.34, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 11.5, color: C.body,
    });
  });
  s.addNotes("검증 항목은 실제 서버를 세워 확인한 결과입니다. 현장 검증은 고객사 환경에서 다시 수행합니다.");
}

/* ── 12. 제약 및 다음 단계 ─────────────────────────────── */
{
  const s = darkSlide();
  s.addText("짚고 넘어갈 것", {
    x: M, y: 0.66, w: 8, h: 0.28, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 11, bold: true, color: C.amber, charSpacing: 1.2,
  });
  s.addText("제안서에 명시할 제약", {
    x: M, y: 0.98, w: 10, h: 0.62, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 27, bold: true, color: C.white,
  });

  const lim = [
    "iOS 단말은 실시간 알람 수신이 불가능합니다",
    "전달은 최선 노력 방식이며 자동 재발송이나 에스컬레이션이 없습니다",
    "수신 여부와 확인 여부를 추적할 수 없습니다",
    "PC 알람은 상주 프로그램이 실행 중일 때만 동작합니다",
  ];
  lim.forEach((t, i) => {
    const y = 1.92 + i * 0.62;
    s.addText("—", {
      x: M, y, w: 0.3, h: 0.3, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 13, color: C.amber,
    });
    s.addText(t, {
      x: M + 0.36, y, w: 11.4, h: 0.36, isTextBox: true, margin: 0,
      fontFace: F, fontSize: 14, color: C.onDark,
    });
  });

  s.addShape(pres.ShapeType.roundRect, {
    x: M, y: 4.5, w: W - M * 2, h: 0.94, rectRadius: 0.06,
    fill: { color: C.panel }, line: { width: 0 },
  });
  s.addText("알람은 보조 채널로 포지셔닝하십시오. 도달 보장이 계약 요건이라면 대시보드와 무전을 주 경로로 두어야 합니다.", {
    x: M + 0.44, y: 4.76, w: W - M * 2 - 0.88, h: 0.42, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13.5, bold: true, color: C.amber,
  });

  s.addText("다음 단계", {
    x: M, y: 5.72, w: 6, h: 0.3, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 13, bold: true, color: C.white,
  });
  s.addText("고객사 IT팀과 세 가지를 확인합니다 — 서버의 Docker 설치 여부, 단말에서 서버로의 8080 인바운드 허용, 현장 단말의 앱 설치 허용 여부. 이 중 하나라도 막히면 해당 경로가 통째로 사라지므로 설치 일정 전에 확정해야 합니다.", {
    x: M, y: 6.08, w: W - M * 2, h: 0.86, isTextBox: true, margin: 0,
    fontFace: F, fontSize: 12, color: C.onDarkMuted, lineSpacingMultiple: 1.1,
  });
  s.addNotes("사전 확인 3종이 통과하지 못하면 구성 자체가 성립하지 않습니다.");
}

pres.writeFile({ fileName: process.argv[2] || "safety-alarm-intro.pptx" }).then((f) => {
  console.log("생성 완료:", f);
});
