import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubjectsStore } from '../store/subjects.js';
import { listPlans, upsertPlan, deletePlan, reorderPlans } from '../api/plans.js';
import { listSessions } from '../api/sessions.js';
import { formatDuration, formatDateKorean, toDateString } from '../utils/time.js';
import InlineTimeEdit from './InlineTimeEdit.jsx';
import PlanAddModal from './PlanAddModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';

export default function DayPanel({ selectedDate, onDataChange }) {
  const navigate = useNavigate();
  const { subjects, fetchAll: fetchSubjects } = useSubjectsStore();

  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmCopyOpen, setConfirmCopyOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [reorderMode, setReorderMode] = useState(false);

  const dateStr = toDateString(selectedDate);
  const today = toDateString(new Date());
  const isToday = dateStr === today;
  const isFuture = dateStr > today;
  const isPast = dateStr < today;

  useEffect(() => {
    if (!isToday) return;
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, [isToday]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, sessionsRes] = await Promise.all([
        listPlans({ date: dateStr }),
        listSessions({
          from: `${dateStr}T00:00:00.000Z`,
          to: nextDayIso(dateStr),
        }),
      ]);
      setPlans(plansRes.data.plans);
      setSessions(sessionsRes.data.sessions);
    } catch (err) {
      console.error('Load day data error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr]);

  // 집계
  const actualBySub = {};
  sessions.forEach((s) => {
    actualBySub[s.subject_id] = (actualBySub[s.subject_id] || 0) + s.duration_sec;
  });
  const planSet = new Set(plans.map((p) => p.subject_id));

  // 표시 행: plan은 display_order(서버 정렬) 순, 그 뒤에 session만 있는 행
  const planRows = plans.map((p) => ({
    subject_id: p.subject_id,
    name: p.subject_name,
    color: p.subject_color,
    target_sec: p.target_sec,
    actual_sec: actualBySub[p.subject_id] || 0,
    hasPlan: true,
  }));

  const sessionOnlyRows = Object.keys(actualBySub)
    .map(Number)
    .filter((id) => !planSet.has(id))
    .map((id) => {
      const fromSession = sessions.find((s) => s.subject_id === id);
      const fromSubjects = subjects.find((s) => s.id === id);
      return {
        subject_id: id,
        name: fromSession?.subject_name || fromSubjects?.name || '(삭제됨)',
        color: fromSession?.subject_color || fromSubjects?.color || '#9CA3AF',
        target_sec: 0,
        actual_sec: actualBySub[id],
        hasPlan: false,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const displayRows = [...planRows, ...sessionOnlyRows];

  // plan 행끼리 swap → 서버에 일괄 전송
  const movePlan = async (planIndex, direction) => {
    const targetIdx = planIndex + direction;
    if (targetIdx < 0 || targetIdx >= planRows.length) return;

    const newOrder = planRows.map((r) => r.subject_id);
    [newOrder[planIndex], newOrder[targetIdx]] = [newOrder[targetIdx], newOrder[planIndex]];

    try {
      await reorderPlans(dateStr, newOrder);
      await loadData();
      onDataChange?.();
    } catch (err) {
      alert('순서 변경 실패');
    }
  };

  const handleInlineSave = async (subjectId, newSec) => {
    if (newSec === null) {
      await deletePlan(subjectId, dateStr);
    } else {
      await upsertPlan({ subject_id: subjectId, plan_date: dateStr, target_sec: newSec });
    }
    await loadData();
    onDataChange?.();
  };

  const handleStart = (subjectId) => {
    alert(`타이머 시작 (subject_id=${subjectId}) — 5단계에서 구현됩니다`);
  };

  const handleStartAll = () => {
    alert('오늘 학습 시작 — 첫 plan부터 순차 타이머. 5단계에서 구현됩니다.');
  };

  const handleCopyToToday = async () => {
    setConfirmCopyOpen(false);
    try {
      const todayStr = toDateString(new Date());
      for (const p of plans) {
        await upsertPlan({ subject_id: p.subject_id, plan_date: todayStr, target_sec: p.target_sec });
      }
      alert(`${plans.length}개의 계획을 오늘로 복사했습니다`);
      onDataChange?.();
    } catch (err) {
      alert(err.response?.data?.error || '복사 실패');
    }
  };

  const hasAnyPlan = planRows.length > 0;

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* 헤더 */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">
              {formatDateKorean(selectedDate)}
            </h2>
            {isToday && (
              <p className="text-2xl font-mono text-gray-700 mt-1 tabular-nums">
                {currentTime.toLocaleTimeString('ko-KR', { hour12: false })}
              </p>
            )}
            {isPast && <p className="text-xs text-gray-500 mt-1">과거 기록</p>}
            {isFuture && <p className="text-xs text-blue-600 mt-1">미래 계획</p>}
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {planRows.length >= 2 && !isPast && (
              <button
                onClick={() => setReorderMode(!reorderMode)}
                className={`px-2 py-1.5 text-sm rounded transition-colors ${
                  reorderMode ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="순서 변경"
              >
                {reorderMode ? '완료' : '⇅'}
              </button>
            )}
            {!isPast && (
              <button
                onClick={() => setAddModalOpen(true)}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                + 계획
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="p-8 text-center text-gray-500 text-sm">불러오는 중...</div>
        )}

        {!loading && displayRows.length === 0 && (
          <div className="p-8 text-center">
            {isPast ? (
              <p className="text-gray-500 text-sm">기록이 없습니다</p>
            ) : (
              <>
                <p className="text-gray-500 mb-3 text-sm">
                  {isToday ? '오늘 학습 계획이 없습니다' : '학습 계획이 없습니다'}
                </p>
                <button
                  onClick={() => setAddModalOpen(true)}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  계획 추가하기
                </button>
              </>
            )}
          </div>
        )}

        {!loading && displayRows.length > 0 && (
          <div className="divide-y divide-gray-100">
            {displayRows.map((row, displayIndex) => {
              const planIndex = row.hasPlan ? displayIndex : -1;
              const progress = row.target_sec > 0
                ? Math.min(100, (row.actual_sec / row.target_sec) * 100)
                : 0;

              return (
                <div
                  key={row.subject_id}
                  className={`p-3 hover:bg-gray-50 ${!row.hasPlan ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: row.color }}
                    />
                    <span className="flex-1 font-medium text-gray-900 truncate text-sm">
                      {row.name}
                    </span>
                    {!row.hasPlan && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded">
                        기록만
                      </span>
                    )}

                    {reorderMode && row.hasPlan ? (
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => movePlan(planIndex, -1)}
                          disabled={planIndex === 0}
                          className="px-1.5 py-0.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-gray-100"
                          aria-label="위로"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => movePlan(planIndex, 1)}
                          disabled={planIndex === planRows.length - 1}
                          className="px-1.5 py-0.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-gray-100"
                          aria-label="아래로"
                        >
                          ↓
                        </button>
                      </div>
                    ) : (
                      !reorderMode && isToday && row.hasPlan && (
                        <button
                          onClick={() => handleStart(row.subject_id)}
                          className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          시작
                        </button>
                      )
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {row.hasPlan ? (
                      <span className="text-gray-500">
                        목표:{' '}
                        <InlineTimeEdit
                          value={row.target_sec}
                          onChange={(sec) => handleInlineSave(row.subject_id, sec)}
                          disabled={isPast || reorderMode}
                        />
                      </span>
                    ) : (
                      <span className="text-gray-400">계획 없음</span>
                    )}
                    {!isFuture && (
                      <span className="text-gray-700 font-medium">
                        {formatDuration(row.actual_sec)} 학습
                      </span>
                    )}
                  </div>

                  {row.hasPlan && row.target_sec > 0 && !isFuture && (
                    <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${progress}%`, backgroundColor: row.color }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100">
        {isToday && hasAnyPlan && (
          <div className="p-3">
            <button
              onClick={handleStartAll}
              className="w-full py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              ▶ 오늘 학습 시작
            </button>
          </div>
        )}

        {isPast && plans.length > 0 && (
          <div className="p-3">
            <button
              onClick={() => setConfirmCopyOpen(true)}
              className="w-full py-2 text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              이 날의 계획을 오늘로 복사
            </button>
          </div>
        )}
      </div>

      {addModalOpen && (
        <PlanAddModal
          planDate={dateStr}
          existingPlans={plans}
          onClose={() => setAddModalOpen(false)}
          onSaved={() => { loadData(); onDataChange?.(); }}
        />
      )}

      {confirmCopyOpen && (
        <ConfirmDialog
          title="오늘로 복사"
          message={`이 날의 계획 ${plans.length}개를 오늘 날짜로 복사합니다. 오늘 같은 과목 계획이 있으면 덮어씁니다.`}
          confirmText="복사"
          onConfirm={handleCopyToToday}
          onCancel={() => setConfirmCopyOpen(false)}
        />
      )}
    </div>
  );
}

function nextDayIso(dateStr) {
  const d = new Date(dateStr + 'T00:00:00.000Z');
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
