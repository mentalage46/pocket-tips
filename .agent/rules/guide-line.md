---
trigger: always_on
---

# Pocket Tips

- 모든 문서는 `docs/` 아래에 둔다. 루트 `README.md`는 뷰어 사용법만 다루고, 문서 목차는 `docs/README.md`가 담당한다.

- 폴더 내의 md 파일 추가 될 때마다 각 폴더의 README 파일에 해당 링크 추가

- `docs/README.md` 또한 해당 링크 및 설명 추가

- 문서를 추가·이동·삭제한 뒤에는 `npm run build`로 `manifest.json`을 갱신하고 `npm run check-links`로 링크와 앵커를 확인한다.
