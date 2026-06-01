import { useState, useEffect, useMemo, useRef } from 'react';
import { listSessions } from '../api/sessions.js';
import { listPlans } from '../api/plans.js';
import { toDateString } from '../utils/time.js';

const INTENSITY_BG = ['#ffffff', '#eff6ff', '#dbeafe', '#bfdbfe', '#93c5fd'];

export default function MonthCalendar({ selectedDate, onSelectDate, refreshKey = 0 }) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(selectedDate);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [sessions, setSessions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  const containerRef = useRef(null);
  const lastWheelRef = useRef(0);

  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const monthEnd = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const fromStr = toDateString(monthStart);
        const toStr = toDateString(monthEnd);
        const [sRes, pRes] = await Promise.all([
          listSessions({
            from: monthStart.toISOString(),
            to: monthEnd.toISOString(),
          }),
          listPlans({ from: fromStr, to: toStr }),
        ]);
        if (!cancelled) {
          setSessions(sRes.data.sessions);
          setPlans(pRes.data.plans);
        }
      } catch (err) {
        console.error('Month load error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth.getTime(), refreshKey]);

  const dailyData = useMemo(() => {
    const map = {};
    const getOrCreate = (dateStr, subjectId, name, color) => {
      if (!map[dateStr]) map[dateStr] = { totalSec: 0, subjects: [] };
      let entry = map[dateStr].subjects.find((x) => x.id === subjectId);
      if (!entry) {
        entry = {
          id: subjectId, name, color,
          hasSession: false, hasPlan: false,
          displayOrder: Infinity,
        };
        map[dateStr].subjects.push(entry);
      }
      return entry;
    };

    sessions.forEach((s) => {
      const dateStr = toDateString(new Date(s.started_at));
      const entry = getOrCreate(dateStr, s.subject_id, s.subject_name, s.subject_color);
      entry.hasSession = true;
      map[dateStr].totalSec += s.duration_sec;
    });

    plans.forEach((p) => {
      const dateStr = p.plan_date.substring(0, 10);
      const entry = getOrCreate(dateStr, p.subject_id, p.subject_name, p.subject_color);
      entry.hasPlan = true;
      entry.displayOrder = p.display_order;
    });

    // 정렬: plan 있는 게 먼저, plan 행끼리는 display_order, 나머지는 이름순
    Object.values(map).forEach((d) => {
      d.subjects.sort((a, b) => {
        if (a.hasPlan && !b.hasPlan) return -1;
        if (!a.hasPlan && b.hasPlan) return 1;
        if (a.hasPlan && b.hasPlan) return a.displayOrder - b.displayOrder;
        return a.name.localeCompare(b.name);
      });
    });

    return map;
  }, [sessions, plans]);

  const calendarCells = useMemo(() => {
    const firstDay = new Date(monthStart);
    firstDay.setDate(firstDay.getDate() - firstDay.getDay());
    const cells = [];
    const cursor = new Date(firstDay);
    for (let i = 0; i < 42; i++) {
      cells.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth.getTime()]);

  const todayStr = toDateString(new Date());
  const selectedStr = toDateString(selectedDate);

  const getIntensity = (totalSec) => {
    if (totalSec <= 0) return 0;
    if (totalSec < 30 * 60) return 1;
    if (totalSec < 60 * 60) return 2;
    if (totalSec < 2 * 60 * 60) return 3;
    return 4;
  };

  const prevMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  const goToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
    onSelectDate(now);
  };

  const navigateDays = (delta) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    if (d.getMonth() !== viewMonth.getMonth() || d.getFullYear() !== viewMonth.getFullYear()) {
      setViewMonth(new Date(d.getFullYear(), d.getMonth(), 1));
    }
    onSelectDate(d);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e) => {
      e.preventDefault();
      const now = Date.now();
      if (now - lastWheelRef.current < 300) return;
      lastWheelRef.current = now;
      if (e.deltaY > 0) nextMonth();
      else if (e.deltaY < 0) prevMonth();
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth]);

  useEffect(() => {
    const handler = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      if (e.key === 'PageDown') { e.preventDefault(); nextMonth(); }
      else if (e.key === 'PageUp') { e.preventDefault(); prevMonth(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); navigateDays(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); navigateDays(1); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); navigateDays(-7); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); navigateDays(7); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, viewMonth]);

  return (
    <div ref={containerRef} className="bg-white rounded-lg border border-gray-200 h-full flex flex-col relative">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="이전 달">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <h2 className="text-lg font-bold text-gray-900 min-w-[8em] text-center">
            {viewMonth.getFullYear()}년 {viewMonth.getMonth() + 1}월
          </h2>
          <button onClick={nextMonth} className="p-1.5 hover:bg-gray-100 rounded-lg" aria-label="다음 달">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>학습</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full border border-blue-500 bg-transparent" />
              <span>계획만</span>
            </div>
          </div>
          <button onClick={goToday} className="px-3 py-1 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
            오늘
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 border-b border-gray-100">
        {['일', '월', '화', '수', '목', '금', '토'].map((d, i) => (
          <div
            key={d}
            className={`p-2 text-center text-xs font-medium ${
              i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-500'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 grid-rows-6 flex-1 gap-px bg-gray-100 min-h-0">
        {calendarCells.map((cellDate) => {
          const cellStr = toDateString(cellDate);
          const isCurrentMonth = cellDate.getMonth() === viewMonth.getMonth();
          const isToday = cellStr === todayStr;
          const isSelected = cellStr === selectedStr;
          const dayOfWeek = cellDate.getDay();

          const data = dailyData[cellStr];
          const totalSec = data?.totalSec || 0;
          const subjects = data?.subjects || [];
          const intensity = getIntensity(totalSec);
          const bgColor = INTENSITY_BG[intensity];

          const visibleSubjects = subjects.slice(0, 3);
          const moreCount = subjects.length - visibleSubjects.length;

          return (
            <button
              key={cellStr}
              onClick={() => onSelectDate(cellDate)}
              style={{ backgroundColor: bgColor }}
              className={`
                p-2 text-left flex flex-col gap-1 min-h-0 transition-colors
                hover:brightness-95 relative overflow-hidden
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${isSelected ? 'ring-2 ring-blue-500 ring-inset z-10' : ''}
                ${isToday && !isSelected ? 'ring-2 ring-amber-400 ring-inset' : ''}
              `}
            >
              <span
                className={`text-sm font-semibold ${
                  dayOfWeek === 0 ? 'text-red-500' :
                  dayOfWeek === 6 ? 'text-blue-500' :
                  'text-gray-800'
                }`}
              >
                {cellDate.getDate()}
              </span>

              <div className="flex-1 flex flex-col gap-0.5 overflow-hidden w-full">
                {visibleSubjects.map((s) => {
                  const isPlanOnly = !s.hasSession && s.hasPlan;
                  return (
                    <div key={s.id} className="flex items-center gap-1 w-full min-w-0" title={s.name}>
                      {isPlanOnly ? (
                        <span
                          className="w-2 h-2 rounded-full border-[1.5px] flex-shrink-0"
                          style={{ borderColor: s.color }}
                        />
                      ) : (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: s.color }}
                        />
                      )}
                      <span
                        className={`text-[14px] truncate leading-tight ${
                          isPlanOnly ? 'text-gray-500 italic' : 'text-gray-800 font-medium'
                        }`}
                      >
                        {s.name}
                      </span>
                    </div>
                  );
                })}
                {moreCount > 0 && (
                  <span className="text-[12px] text-gray-500 leading-tight">+{moreCount}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="absolute inset-0 bg-white/40 flex items-center justify-center pointer-events-none">
          <span className="text-sm text-gray-500">불러오는 중...</span>
        </div>
      )}
    </div>
  );
}
