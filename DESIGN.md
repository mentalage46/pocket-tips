---
name: Pocket Tips
description: 개인 개발 노트를 읽는 Markdown 뷰어. 종이 위 잉크처럼 조용하고 평면적인 읽기 화면.
colors:
  ink-blue: "#0969da"
  ink-blue-dark: "#4493f8"
  ink-wash: "#ddf4ff"
  ink-wash-dark: "#122a45"
  paper: "#ffffff"
  paper-soft: "#f6f8fa"
  paper-dark: "#0d1117"
  paper-soft-dark: "#161b22"
  pencil: "#1f2328"
  pencil-light: "#59636e"
  pencil-dark: "#e6edf3"
  pencil-light-dark: "#9198a1"
  rule-line: "#d1d9e0"
  rule-line-dark: "#30363d"
  highlighter: "#fff8c5"
  highlighter-dark: "#3a2f00"
  red-pen: "#d1242f"
typography:
  display:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Apple SD Gothic Neo', Helvetica, Arial, sans-serif"
    fontSize: "2em"
    fontWeight: 600
    lineHeight: 1.3
  headline:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Apple SD Gothic Neo', Helvetica, Arial, sans-serif"
    fontSize: "1.5em"
    fontWeight: 600
    lineHeight: 1.3
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Apple SD Gothic Neo', Helvetica, Arial, sans-serif"
    fontSize: "1.25em"
    fontWeight: 600
    lineHeight: 1.3
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Apple SD Gothic Neo', Helvetica, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  nav:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Apple SD Gothic Neo', Helvetica, Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans KR', 'Apple SD Gothic Neo', Helvetica, Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0.06em"
  code:
    fontFamily: "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace"
    fontSize: "0.875em"
    lineHeight: 1.5
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "40px"
components:
  icon-button:
    backgroundColor: "transparent"
    textColor: "{colors.pencil-light}"
    rounded: "{rounded.md}"
    size: "36px"
  icon-button-hover:
    backgroundColor: "{colors.paper-soft}"
    textColor: "{colors.pencil}"
    rounded: "{rounded.md}"
  search-input:
    backgroundColor: "{colors.paper-soft}"
    textColor: "{colors.pencil}"
    rounded: "{rounded.md}"
    height: "36px"
    padding: "0 12px 0 32px"
  search-input-focus:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.pencil}"
    rounded: "{rounded.md}"
  tree-row:
    backgroundColor: "transparent"
    textColor: "{colors.pencil}"
    rounded: "{rounded.sm}"
    typography: "{typography.nav}"
    height: "30px"
  tree-row-hover:
    backgroundColor: "{colors.paper-soft}"
    textColor: "{colors.pencil}"
    rounded: "{rounded.sm}"
  tree-row-active:
    backgroundColor: "{colors.ink-wash}"
    textColor: "{colors.ink-blue}"
    rounded: "{rounded.sm}"
  copy-button:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.pencil-light}"
    rounded: "{rounded.sm}"
    padding: "2px 8px"
  code-block:
    backgroundColor: "{colors.paper-soft}"
    textColor: "{colors.pencil}"
    rounded: "{rounded.md}"
    padding: "14px 16px"
    typography: "{typography.code}"
  inline-code:
    backgroundColor: "{colors.paper-soft}"
    textColor: "{colors.pencil}"
    rounded: "{rounded.sm}"
    padding: "0.15em 0.4em"
    typography: "{typography.code}"
---

# Design System: Pocket Tips

## Overview

**Creative North Star: "포켓 수첩 (The Pocket Notebook)"**

주머니에서 꺼내 바로 펼치는 개인 수첩입니다. 화면은 종이 한 장이고, 글자는 연필과 잉크입니다. 뷰어의 인터페이스는 수첩의 여백과 탭 색인처럼 본문 곁에 조용히 머물고, 읽는 사람의 시선은 언제나 본문에 있습니다. 분위기는 **조용하고 집중된** 쪽입니다. 장식으로 눈길을 끌지 않고, 1px 경계선과 배경 톤 차이만으로 영역을 나누며, 색은 "여기가 링크다", "지금 여기를 읽고 있다"를 알리는 잉크 블루 한 가지만 씁니다.

밀도는 참고 자료에 맞게 촘촘합니다. 사이드바 트리는 30px 행 높이로 95개 문서를 스크롤 한두 번 안에 담고, 본문은 860px 폭에서 16px/1.6 행간으로 한글 표와 코드 블록을 편하게 읽을 수 있게 둡니다. 라이트와 다크는 같은 구조에 종이 색만 바뀐 두 벌의 수첩이며, 다크에서도 그림자를 쓰지 않고 경계선 색으로만 깊이를 표현합니다.

GitHub의 Markdown 렌더링과 눈에 익은 비율을 공유하지만, 그것을 복제하는 것이 목표는 아닙니다. 문서가 GitHub에서 읽히던 모습과 어긋나지 않으면서, 트리·목차·검색이 수첩의 색인 탭처럼 붙어 있는 것이 이 시스템의 정체성입니다.

**Key Characteristics:**
- 종이 위 연필과 잉크: 흰 종이 배경, 짙은 회색 글자, 잉크 블루 한 가지 강조색
- 경계선 기반 평면: 그림자 없음, 1px 선과 톤 차이로만 구분 (예외는 모바일 드로어 하나)
- 참고 자료 밀도: 좁은 행 높이, 넓지 않은 여백, 긴 표와 코드 블록 우선
- 시스템 서체: 플랫폼 기본 산세리프와 Noto Sans KR, 코드는 시스템 모노스페이스
- 인터페이스는 hover에서만 드러남: 복사 버튼, 헤딩 앵커, 행 배경이 손을 올렸을 때만 나타남

## Colors

종이와 연필의 무채색 위에 잉크 블루 한 방울. 색이 쓰이는 곳은 "이동할 수 있다"와 "지금 여기"뿐입니다.

### Primary
- **잉크 블루 (Ink Blue)** (`ink-blue`): 링크, 브레드크럼의 상위 경로, 트리의 현재 문서 이름, 페이지 목차의 현재 섹션, 검색창 포커스 링. 다크 모드에서는 더 밝은 `ink-blue-dark`로 바뀌어 어두운 종이 위에서도 같은 역할을 합니다.
- **잉크 번짐 (Ink Wash)** (`ink-wash` / `ink-wash-dark`): 트리에서 현재 문서 행의 배경. 잉크 블루가 종이에 연하게 번진 색으로, 강조색을 면으로 써도 되는 유일한 자리입니다.

### Neutral
- **종이 (Paper)** (`paper` / `paper-dark`): 페이지와 사이드바의 기본 배경. 상단 바는 같은 종이색을 88% 불투명도로 깔고 블러를 더해 스크롤되는 본문이 살짝 비칩니다.
- **연한 종이 (Paper Soft)** (`paper-soft` / `paper-soft-dark`): 한 단 들어간 면. 코드 블록, 인라인 코드, 표 머리글, 검색창 바탕, 행 hover 배경. 라이트에서는 흰 종이보다 조금 어둡고, 다크에서는 조금 밝습니다.
- **연필 (Pencil)** (`pencil` / `pencil-dark`): 본문 글자색. 순흑이 아니라 연필심 같은 짙은 회색입니다.
- **옅은 연필 (Pencil Light)** (`pencil-light` / `pencil-light-dark`): 보조 글자. 브레드크럼, 경로 표시, 목차 항목, 아이콘 버튼 기본 상태, 인용문.
- **괘선 (Rule Line)** (`rule-line` / `rule-line-dark`): 모든 경계. 상단 바 밑선, 사이드바 오른쪽 선, 트리 하위 그룹의 세로 안내선, 헤딩 밑줄, 표 격자, 코드 블록 테두리.
- **형광펜 (Highlighter)** (`highlighter` / `highlighter-dark`): 검색 결과의 일치 글자 배경, 앵커로 이동한 헤딩이 1.6초 동안 번쩍이는 색.
- **빨간 펜 (Red Pen)** (`red-pen`): 깨진 링크의 글자색과 점선 취소선. 오류를 알리는 유일한 색이며 다른 용도로 쓰지 않습니다.

### Named Rules
**The One Ink Rule.** 강조색은 잉크 블루 하나입니다. 화면 어디서든 파란 것은 "누르면 이동한다" 또는 "지금 여기"를 뜻하고, 그 두 의미 외에는 파란색을 쓰지 않습니다.

**The Paper Tone Rule.** 면의 구분은 종이와 연한 종이, 두 톤으로만 합니다. 세 번째 회색 면을 만들지 말고, 더 구분이 필요하면 괘선을 긋습니다.

## Typography

**Display Font:** 시스템 산세리프 (-apple-system, Segoe UI, Noto Sans KR, Apple SD Gothic Neo 순)
**Body Font:** Display와 같은 스택
**Label/Mono Font:** 시스템 모노스페이스 (ui-monospace, SF Mono, Menlo, Consolas)

**Character:** 서체를 내려받지 않고 플랫폼이 가진 글꼴을 그대로 씁니다. 한글은 Noto Sans KR 또는 Apple SD Gothic Neo로 떨어지고, 영문 용어와 코드가 섞인 문장에서 모노스페이스가 분명히 구분되도록 코드는 본문보다 한 단계 작게(0.875em) 둡니다.

### Hierarchy
- **Display** (600, 2em, 1.3): 문서 제목(h1). 아래에 괘선을 긋고 0.3em 여백을 둡니다. 모바일에서는 1.6em.
- **Headline** (600, 1.5em, 1.3): 섹션 제목(h2). h1과 같이 밑줄을 긋습니다. 모바일에서는 1.3em.
- **Title** (600, 1.25em / 1.05em, 1.3): 소제목(h3, h4). 밑줄 없음.
- **Body** (400, 16px, 1.6): 본문. 본문 폭은 최대 860px이며 표는 가로 스크롤 컨테이너에 담아 본문 폭을 넘지 않게 합니다.
- **Nav** (400, 14px, 1.6): 사이드바 트리. 폴더 이름은 600. 현재 문서는 600에 잉크 블루.
- **Caption** (400, 13px): 브레드크럼, 페이지 목차, 문서 하단 경로. 보조 정보는 항상 본문보다 작고 옅은 연필색입니다.
- **Label** (400, 11px, 0.06em, 대문자): 페이지 목차의 "이 페이지" 같은 구역 이름. 유일하게 자간을 벌리는 자리입니다.
- **Code** (모노스페이스, 0.875em, 1.5): 인라인 코드와 코드 블록. 코드 블록 안에서는 0.85em.

### Named Rules
**The Heading Rule-Line Rule.** h1과 h2에만 밑줄을 긋습니다. h3 이하는 크기와 굵기로만 구분하며, 밑줄로 위계를 흉내 내지 않습니다.

**The System Font Rule.** 웹폰트를 추가하지 않습니다. 가독성이 부족하면 크기·행간·여백으로 해결합니다.

## Layout

세 단 그리드입니다. 왼쪽 사이드바 290px, 가운데 본문(최대 860px, 좌우 40px 패딩, 단 안에서 가운데 정렬), 오른쪽 페이지 목차 230px. 상단 바는 56px 높이로 고정(sticky)되고, 사이드바와 목차도 상단 바 아래에 고정되어 각자 스크롤됩니다. 본문은 창 전체가 스크롤되며, 헤딩에는 상단 바 높이만큼 `scroll-margin-top`을 두어 앵커 이동 시 제목이 바 아래로 숨지 않습니다.

반응형은 두 단계입니다. 1200px 이하에서 오른쪽 목차가 사라지고 두 단이 됩니다. 900px 이하에서 사이드바가 왼쪽에서 밀려 나오는 드로어(너비 290px 또는 화면의 85%)가 되고, 상단 바에 메뉴 버튼이 나타나며 브랜드 글자는 아이콘만 남습니다. 본문 패딩은 16px로 줄고 헤딩 앵커 기호는 숨깁니다.

간격 리듬은 4의 배수입니다. 트리 행 내부 4px, 요소 사이 8px, 섹션 내부 12px, 구역 패딩 16px, 본문 상단 24px, 본문 좌우 40px. 트리의 하위 그룹은 14px 들여쓰고 9px 지점에 세로 괘선을 그어 계층을 보여 줍니다.

## Elevation & Depth

그림자를 쓰지 않는 평면 시스템입니다. 깊이는 세 가지로만 표현합니다. 괘선(1px 경계), 종이와 연한 종이의 톤 차이, 그리고 상단 바의 반투명 종이와 블러(88% 불투명도, 10px blur)입니다. 다크 모드에서도 같은 원칙이며 그림자를 더하지 않습니다.

### Shadow Vocabulary
- **드로어 그림자** (`box-shadow: 0 8px 24px rgba(31, 35, 40, .12)`, 다크 `rgba(0, 0, 0, .5)`): 900px 이하에서 사이드바 드로어가 열렸을 때만. 본문 위에 떠 있는 유일한 요소이므로 유일한 그림자입니다. 뒤에는 35% 검정 백드롭을 깝니다.

### Named Rules
**The Flat Paper Rule.** 종이 위에 놓인 것은 종이와 같은 높이에 있습니다. 그림자는 종이를 떠난 드로어에만 허용되고, 카드·버튼·입력창·팝오버에는 쓰지 않습니다.

## Shapes

모서리는 작고 일정합니다. 가장 작은 조작 요소(트리 토글, 키보드 키 표시)는 4px, 행·인라인 코드·복사 버튼·검색 결과 항목은 6px, 버튼·검색창·코드 블록·Mermaid 블록은 8px입니다. 원형이나 알약 모양은 쓰지 않으며, 표는 모서리를 깎지 않고 격자선만 긋습니다. 테두리는 항상 1px 괘선색이고, 키보드 키 표시만 아래쪽 2px로 눌리는 느낌을 줍니다.

## Components

모든 컴포넌트의 성격은 **절제되고 조용한** 것입니다. 기본 상태에서는 테두리가 거의 없고, 손을 올렸을 때만 연한 종이 배경이나 괘선이 드러납니다.

### Buttons
- **Shape:** 부드러운 정사각 (8px). 아이콘 버튼은 36×36px.
- **Icon Button (상단 바 메뉴·테마):** 투명 배경, 옅은 연필색 아이콘, 투명 테두리. 
- **Hover / Focus:** 연한 종이 배경, 연필색 아이콘, 1px 괘선 테두리가 나타남. 전환 효과 없이 즉시.
- **Copy Button (코드 블록 우상단):** 종이 배경, 1px 괘선, 12px 글자, 2px 8px 패딩, 6px 모서리. 기본은 투명도 0이고 코드 블록에 hover하거나 버튼이 포커스될 때 0.15초에 걸쳐 나타남. 누르면 글자가 "복사됨"으로 1.5초 바뀜.
- **Tree Toggle:** 22×22px, 배경 없음, 12px 셰브론 아이콘. 펼치면 90도 회전(0.15초 ease).

### Inputs / Fields
- **Search:** 높이 36px, 연한 종이 배경, 1px 괘선, 8px 모서리, 왼쪽에 16px 돋보기 아이콘(32px 안쪽 패딩), 14px 글자. 상단 바 오른쪽에 최대 380px.
- **Focus:** 배경이 흰 종이로 바뀌고 2px 잉크 블루 아웃라인이 테두리 안쪽(-1px)에 생김.
- **Placeholder:** "문서 검색  ( / )". 단축키를 플레이스홀더에 적어 둠.

### Navigation
- **Tree Row:** 높이 30px, 6px 모서리, 14px 글자. 왼쪽에 토글(폴더) 또는 24px 빈 칸(파일), 이름, 오른쪽에 11px 옅은 연필색 문서 수. 폴더 이름은 600.
- **Hover:** 연한 종이 배경.
- **Active (현재 문서):** 잉크 번짐 배경, 잉크 블루 600 글자. 폴더 README가 열리면 폴더 행이 active가 되고 자동으로 펼쳐짐.
- **하위 그룹:** 14px 들여쓰기, 9px 지점 1px 세로 괘선.
- **Breadcrumb:** 13px, 옅은 연필색, "/" 구분자는 50% 투명. 상위 경로는 잉크 블루 링크, 현재 문서는 연필색.
- **Page TOC ("이 페이지"):** 13px, 왼쪽 1px 괘선, 항목은 12px 패딩에 h3는 24px, h4는 36px 들여쓰기. 현재 섹션은 잉크 블루 글자와 2px 잉크 블루 왼쪽 선. 한 줄 넘침은 말줄임.
- **Mobile Drawer:** 사이드바가 고정 위치로 바뀌어 0.2초 ease로 밀려 나옴. 유일하게 그림자를 가짐.

### Cards / Containers
카드는 없습니다. 본문의 담는 요소는 코드 블록 하나입니다.
- **Code Block:** 연한 종이 배경, 1px 괘선, 8px 모서리, 14px 16px 패딩, 가로 스크롤. 우상단에 복사 버튼.
- **Mermaid Block:** 코드 블록과 같은 틀에 흰 종이 배경, 가운데 정렬.
- **Table:** 가로 스크롤 래퍼에 담김. 1px 괘선 격자, 6px 13px 셀 패딩, 머리글은 연한 종이 배경 600, 짝수 행은 연한 종이 60%.
- **Blockquote:** 왼쪽 4px 괘선, 옅은 연필색 글자, 0.2em 1em 패딩.

### Links (Signature)
- **본문 링크:** 잉크 블루, 밑줄 없음, hover에 밑줄.
- **외부 링크:** 글자 뒤에 작은 "↗" (0.75em, 70% 투명)를 붙이고 새 탭으로 엽니다.
- **깨진 링크:** 빨간 펜 색, 점선 취소선, 커서는 help, href 제거.
- **헤딩 앵커 "#":** 헤딩 왼쪽 -1.1em 위치에 400 굵기, 기본 투명. 헤딩 hover 또는 앵커 포커스에서 보임. 모바일에서는 숨김.
- **앵커 도착 효과:** 이동한 헤딩의 배경이 형광펜 색에서 투명으로 1.6초 동안 사라짐.

### Search Results
트리와 최근 목록 자리를 대신해 나타남. 상단에 12px 옅은 연필색 요약("4개 문서", 본문 인덱스 준비 중이면 " · 본문 검색 준비 중…"). 한 문서는 한 묶음이고 그 안의 줄은 모두 독립된 링크입니다. 제목 줄(600)과 경로(12px 옅은 연필), 일치한 헤딩(12px, "# " 접두, 18px 들여쓰기), 일치한 본문 줄(12px, 같은 들여쓰기, 최대 3줄, 90자 창으로 잘라 "…"). 일치 글자는 형광펜 배경 `<mark>`. 키보드로 고른 줄은 연한 종이 배경에 2px 잉크 블루 아웃라인(안쪽 -2px).

### Recent Documents
사이드바 트리 위, 아래쪽 1px 괘선으로 트리와 구분. 머리글은 Label 스타일("최근 본 문서", 11px 대문자 자간 0.06em)과 같은 크기의 "지우기" 텍스트 버튼. 항목은 트리 행과 똑같은 30px 행·6px 모서리·hover·active 처리로, 트리의 연장처럼 보입니다. 최대 5개. 검색 중에는 숨김.

### Prev / Next Pager
문서 본문 끝, 위쪽 1px 괘선 아래 48px 여백에 양 끝 정렬. 각 칸은 Label 스타일의 "← 이전" / "다음 →" 위에 15px 600 잉크 블루 제목. 상자나 화살표 아이콘 없이 글자만으로 만들고, 다음 칸은 오른쪽 정렬. 한 줄 넘침은 말줄임. 원본 .md 링크 푸터는 그 아래 16px.

## Do's and Don'ts

### Do:
- **Do** 색은 잉크 블루 한 가지로 "이동"과 "현재 위치"만 표시한다 (The One Ink Rule).
- **Do** 면 구분은 종이·연한 종이 두 톤과 1px 괘선으로만 한다 (The Paper Tone Rule).
- **Do** 조작 요소는 hover·focus에서만 드러나게 하고, 기본 상태는 본문과 같은 종이 위에 조용히 둔다.
- **Do** 간격은 4px 배수를 지키고, 트리 행 30px, 상단 바 56px, 사이드바 290px, 본문 최대 860px을 유지한다.
- **Do** 라이트와 다크를 같은 토큰 이름으로 짝지어 두고, 다크에서도 그림자 대신 괘선 색을 바꾼다.
- **Do** 한글 헤딩·긴 표·코드 블록이 흔하므로 표는 가로 스크롤 래퍼에, 코드는 복사 버튼과 함께 둔다.

### Don't:
- **Don't** 카드·버튼·입력창·팝오버에 그림자를 쓰지 않는다. 그림자는 모바일 드로어뿐이다 (The Flat Paper Rule).
- **Don't** 웹폰트를 추가하지 않는다. 시스템 서체 스택만 쓴다 (The System Font Rule).
- **Don't** h3 이하 헤딩에 밑줄을 긋지 않는다 (The Heading Rule-Line Rule).
- **Don't** 두 번째 강조색이나 그라데이션, 장식용 아이콘을 더하지 않는다. 빨간 펜은 깨진 링크에만 쓴다.
- **Don't** 원형·알약 모서리를 쓰지 않는다. 모서리는 4·6·8px 중 하나다.
- **Don't** 본문 위에 떠 있는 토스트, 배너, 고정 CTA를 두지 않는다. 읽는 흐름을 가로막는 요소는 이 시스템에 없다.
