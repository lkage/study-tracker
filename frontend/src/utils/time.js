// 초 → "1:30" (1시간 30분), "0:45" (45분)
export function formatDuration(sec) {
  if (!sec || sec <= 0) return '0:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

// "1:30" → 5400 초. 잘못된 형식은 null
export function parseDuration(str) {
  const m = str.match(/^(\d+):(\d{1,2})$/);
  if (!m) return null;
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  if (minutes >= 60) return null;
  const total = hours * 3600 + minutes * 60;
  return total > 0 ? total : null;
}

// YYYY-MM-DD 형식 (로컬 시간 기준)
export function toDateString(date) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// "2026년 6월 1일 (월)" 같은 표시
const DAYS = ['일', '월', '화', '수', '목', '금', '토'];
export function formatDateKorean(date) {
  const d = new Date(date);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${DAYS[d.getDay()]})`;
}
