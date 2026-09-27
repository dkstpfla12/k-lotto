/** Google 시트 `LOTTO_DATA_API` "웹에 게시" CSV 주소 (docs/WEB_SPEC.md 3절) */
const BASE =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgvEYfl063X0XzTIi7IXNq-EiUGBY6CIOPGZz6bDtf46H4bHCL2q22gTHuaAueBmZob6MRkHIJOHOK/pub?single=true&output=csv&gid='

export const SOURCES = {
  draw: BASE + '1953774850',
  draw_stats: BASE + '1009708128',
  number_status: BASE + '1037086401',
} as const
