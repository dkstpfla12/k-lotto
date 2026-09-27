# K 로또 통계

로또 6/45 전 회차 통계 웹사이트. 서버 없이 브라우저에서 Google 시트 게시 CSV를 읽어 계산합니다.

- 배포: GitHub Pages (main 브랜치 push 시 GitHub Actions로 자동 배포)
- 기술: Vite + React + TypeScript, HashRouter, Recharts, papaparse
- 디자인: KRDS(대한민국 디지털 정부 디자인 시스템) 디자인 토큰 · Pretendard GOV 서체(`krds-uiux` 패키지). 공식 배너·정부 상징·기본 테마는 사용하지 않습니다.

## 개발

```bash
npm install
npm run dev        # http://localhost:5173/k-lotto/
npm test           # 계산 함수 검증 (tests/calc.test.ts, 기대값은 Python 원본 로직으로 산출)
npm run build      # dist/
```

## 구조

| 경로 | 내용 |
|---|---|
| `src/data/` | CSV 주소·파서·로더(세션 캐시)·계산 함수(`calc.ts`) |
| `src/components/` | 공통 레이아웃(상단 메뉴·시세 띠·푸터), UI 부품, 차트 |
| `src/pages/` | 홈, 합계 분석, 번호 빈도, 미출현, 패턴, 내 번호, 회차 조회 |
| `tests/` | 계산 검증 테스트와 고정 데이터 |

과거 통계일 뿐, 다음 회차 당첨 확률과는 무관합니다.
