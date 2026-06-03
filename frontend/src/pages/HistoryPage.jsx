import { useState, useEffect, useMemo } from 'react';
import { useSubjectsStore } from '../store/subjects.js';
import { listSessions, deleteSession } from '../api/sessions.js';
import { toDateString } from '../utils/time.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

const PERIOD_OPTIONS = [
  { value: '1w', label: '최근 1주' },
  { value: '4w', label: '최근 4주' },
  { value: 'custom', label: '사용자 선택' },
];

function formatKoreanDuration(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0 && m > 0) return `${h}시간 ${m}분`;
  if (h > 0) return `${h}시간`;
  if (m > 0) return `${m}분`;
  return `${sec}초`;
}

function formatKoreanTime(date) {
  return `${date.getHours()}시 ${String(date.getMinutes()).padStart(2, '0')}분`;
}

function getPeriodRange(periodValue, customFrom, customTo) {
  const today = new Date();

  if (periodValue === '1w') {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (periodValue === '4w') {
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 27);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  if (periodValue === 'custom') {
    if (!customFrom || !customTo) return null;
    const start = new Date(customFrom + 'T00:00:00');
    const end = new Date(customTo + 'T00:00:00');
    end.setDate(end.getDate() + 1); // 종료일 포함
    return { from: start.toISOString(), to: end.toISOString() };
  }
  return null;
}

export default function HistoryPage() {
  const { subjects, fetchAll: fetchSubjects } = useSubjectsStore();
  const [period, setPeriod] = useState('4w');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 27);
    return toDateString(d);
  });
  const [customTo, setCustomTo] = useState(() => toDateString(new Date()));
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  const loadSessions = async () => {
    const range = getPeriodRange(period, customFrom, customTo);
    if (!range) {
      setSessions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await listSessions(range);
      setSessions(res.data.sessions);
    } catch (err) {
      console.error('Load sessions error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, customFrom, customTo]);

  const filteredSessions = useMemo(() => {
    if (subjectFilter === 'all') return sessions;
    return sessions.filter((s) => s.subject_id === parseInt(subjectFilter, 10));
  }, [sessions, subjectFilter]);

  const totalSec = filteredSessions.reduce((sum, s) => sum + s.duration_sec, 0);

  const bySubject = useMemo(() => {
    const map = {};
    filteredSessions.forEach((s) => {
      if (!map[s.subject_id]) {
        map[s.subject_id] = {
          id: s.subject_id,
          name: s.subject_name,
          color: s.subject_color,
          total: 0,
        };
      }
      map[s.subject_id].total += s.duration_sec;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filteredSessions]);

  const grouped = useMemo(() => {
    const map = {};
    filteredSessions.forEach((s) => {
      const date = new Date(s.started_at);
      const dateStr = date.toLocaleDateString('ko-KR', {
        year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
      });
      if (!map[dateStr]) map[dateStr] = { sessions: [], dateObj: date };
      map[dateStr].sessions.push(s);
    });
    return Object.entries(map)
      .map(([dateStr, data]) => ({ dateStr, sessions: data.sessions, dateObj: data.dateObj }))
      .sort((a, b) => b.dateObj - a.dateObj);
  }, [filteredSessions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSession(deleteTarget.id);
      setDeleteTarget(null);
      await loadSessions();
    } catch (err) {
      alert('삭제 실패: ' + (err.response?.data?.error || err.message));
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">학습 기록</h1>

      {/* 필터 */}
      <div className="flex flex-wrap gap-3 mb-6 items-center">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {period === 'custom' && (
          <>
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              max={customTo}
            />
            <span className="text-gray-500 text-sm">~</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
              min={customFrom}
              max={toDateString(new Date())}
            />
          </>
        )}

        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">과목: 전체</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 mb-6">
        <div className="text-sm text-gray-500 mb-1">총 학습 시간</div>
        <div className="text-3xl font-bold text-gray-900 mb-3">
          {totalSec > 0 ? formatKoreanDuration(totalSec) : '0분'}
        </div>
        {bySubject.length > 0 && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm pt-3 border-t border-gray-100">
            {bySubject.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                <span className="text-gray-700">{s.name}</span>
                <span className="text-gray-500">{formatKoreanDuration(s.total)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 세션 리스트 */}
      {loading && (
        <div className="text-center py-12 text-gray-500">불러오는 중...</div>
      )}

      {!loading && grouped.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
          이 기간에 학습 기록이 없습니다.
        </div>
      )}

      {!loading && grouped.length > 0 && (
        <div className="space-y-6">
          {grouped.map(({ dateStr, sessions: daysSessions }) => {
            const dayTotal = daysSessions.reduce((sum, s) => sum + s.duration_sec, 0);
            return (
              <div key={dateStr}>
                <div className="flex items-baseline justify-between mb-2 px-1">
                  <h2 className="text-sm font-medium text-gray-700">{dateStr}</h2>
                  <span className="text-xs text-gray-500">{formatKoreanDuration(dayTotal)}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {daysSessions.map((s) => (
                    <SessionRow
                      key={s.id}
                      session={s}
                      onDelete={() => setDeleteTarget(s)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="세션 삭제"
          message={`${deleteTarget.subject_name} ${formatKoreanDuration(deleteTarget.duration_sec)} 세션을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmText="삭제"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

function SessionRow({ session, onDelete }) {
  const start = new Date(session.started_at);
  const end = new Date(session.ended_at);

  return (
    <div className="flex items-center gap-3 p-4 hover:bg-gray-50">
      <div
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: session.subject_color }}
      />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 truncate">{session.subject_name}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {formatKoreanTime(start)} ~ {formatKoreanTime(end)} · {formatKoreanDuration(session.duration_sec)}
        </div>
        {session.memo && (
          <div className="text-xs text-gray-600 mt-1 truncate">📝 {session.memo}</div>
        )}
      </div>
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-600 p-1"
        title="삭제"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
          <line x1="10" y1="11" x2="10" y2="17"/>
          <line x1="14" y1="11" x2="14" y2="17"/>
        </svg>
      </button>
    </div>
  );
}
