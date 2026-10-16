# Pocket Tips 📚

> 개발 관련 핵심 팁과 체크리스트 모음

문서 본문은 [`docs/`](./docs/README.md) 아래에 있습니다. 카테고리별 목차와 Quick Links는 [docs/README.md](./docs/README.md)를 참고하세요.

## 📖 Markdown Viewer

저장소 루트의 `index.html`은 `docs/` 아래의 Markdown을 폴더 트리와 함께 읽을 수 있는 정적 뷰어입니다. 빌드 도구나 npm 의존성 없이 동작합니다.

```sh
npm run dev        # manifest.json 생성 + http://localhost:8080 에서 서비스
```

| 명령                  | 설명                                                        |
| --------------------- | ----------------------------------------------------------- |
| `npm run build`       | `docs/`를 스캔해 폴더 트리·제목·헤딩을 `manifest.json`으로 생성 |
| `npm run serve`       | 의존성 없는 로컬 서버. 요청마다 manifest를 다시 만들어 새 문서를 바로 반영 |
| `npm run check-links` | 모든 상대 링크와 `#앵커`가 실제 문서·헤딩을 가리키는지 검사    |
| `npm test`            | 경로·링크·슬러그 유틸과 manifest 생성 단위 테스트              |

`file://`로 `index.html`을 직접 열면 브라우저가 `fetch`를 차단하므로, 로컬 서버나 GitHub Pages(루트에서 배포) 같은 정적 호스팅에서 열어야 합니다.

### 뷰어 기능

- **폴더 트리**: `docs/`의 디렉터리 구조를 그대로 표시합니다. 폴더의 `README.md`가 있으면 폴더 이름을 눌렀을 때 그 문서가 열리고, 펼침 상태는 브라우저에 저장됩니다.
- **링크 변환**: 문서 안의 `./x.md`, `../y/z.md#헤딩`, `./폴더/` 같은 상대 링크는 뷰어 라우트(`#/경로/파일.md?id=헤딩`)로 바뀌고, 외부 링크는 새 탭에서 열립니다. 깨진 링크는 빨간 취소선으로 표시됩니다.
- **헤딩 앵커**: GitHub과 같은 규칙으로 한글 헤딩 id를 만들어 `#저항과-정전용량` 같은 기존 앵커가 그대로 동작합니다.
- **검색**: 제목·경로·헤딩은 즉시, 본문은 첫 검색 때 문서 전체를 받아 메모리에서 검색합니다. 본문 일치 줄은 해당 섹션 앵커로 연결됩니다. `/`로 검색창 이동, `↑` `↓` `Enter`로 결과 선택.
- **이전·다음 문서**: 트리 순서(폴더 README → 하위 문서)로 문서 하단에 이전·다음 링크를 둡니다. `[` `]` 키로도 이동합니다.
- **최근 본 문서**: 마지막으로 본 5개를 사이드바 위에 표시합니다. 브라우저 localStorage에 저장됩니다.
- **그 외**: 오른쪽 "이 페이지" 목차, 브레드크럼, 코드 하이라이트와 복사 버튼, Mermaid 다이어그램, 다크 모드, 모바일 레이아웃.

### 구조

```
index.html              뷰어 진입점
assets/core.js          경로·라우트·링크 변환·읽기 순서 순수 함수 (브라우저와 Node가 공유)
assets/search.js        제목·헤딩·본문 검색 순수 함수
assets/viewer.js        트리, 라우팅, 렌더링, 검색 UI, 이전·다음, 최근 문서
assets/viewer.css       스타일
scripts/build-manifest.mjs   manifest.json 생성
scripts/serve.mjs            로컬 정적 서버
scripts/check-links.mjs      링크·앵커 검사
manifest.json           생성 파일 (커밋해 두어야 정적 호스팅에서 동작)
docs/                   Markdown 문서
```

## ✍️ 문서 추가하기

1. `docs/<카테고리>/` 아래에 `.md` 파일을 추가합니다. 첫 번째 `# 제목`이 트리와 검색에 표시되는 제목이 됩니다.
2. 해당 폴더의 `README.md`와 [docs/README.md](./docs/README.md)에 링크를 추가합니다.
3. `npm run build`로 `manifest.json`을 갱신하고, `npm run check-links`로 링크를 확인합니다.
