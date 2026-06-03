import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubjectsStore } from '../store/subjects.js';
import { listPlans, upsertPlan, deletePlan, reorderPlans } from '../api/plans.js';
import { listSessions, deleteSession } from '../api/sessions.js';
import { useTimerStore } from '../store/timer.js';
import { formatDuration, formatDateKorean, toDateString } from '../utils/time.js';
import InlineTimeEdit from './InlineTimeEdit.jsx';
import PlanAddModal from './PlanAddModal.jsx';
import ConfirmDialog from './ConfirmDialog.jsx';
import DeletePlanDialog from './DeletePlanDialog.jsx';

export default function DayPanel({ selectedDate, onDataChange, refreshKey = 0 }) {
  const navigate = useNavigate();
  const { subjects, fetchAll: fetchSubjects } = useSubjectsStore();
  const timerState = useTimerStore((s) => s.state);
  const startTimer = useTimerStore((s) => s.start);

  const [plans, setPlans] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmCopyOpen, setConfirmCopyOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editMode, setEditMode] = useState(false);

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
      const dayStart = new Date(dateStr + 'T00:00:00');
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [plansRes, sessionsRes] = await Promise.all([
        listPlans({ date: dateStr }),
        listSessions({
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
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

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateStr, refreshKey]);

  const actualBySub = {};
  sessions.forEach((s) => {
    actualBySub[s.subject_id] = (actualBySub[s.subject_id] || 0) + s.duration_sec;
  });
  const planSet = new Set(plans.map((p) => p.subject_id));

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

  const handleDeleteConfirm = async (mode) => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    try {
      const deleteSessionsForTarget = async () => {
        const targetSessions = sessions.filter((s) => s.subject_id === target.subject_id);
        await Promise.all(targetSessions.map((s) => deleteSession(s.id)));
      };

      if (mode === 'plan') {
        await deletePlan(target.subject_id, dateStr);
      } else if (mode === 'sessions') {
        await deleteSessionsForTarget();
      } else if (mode === 'both') {
        const tasks = [];
        if (target.hasPlan) tasks.push(deletePlan(target.subject_id, dateStr));
        if (target.actualSec > 0) tasks.push(deleteSessionsForTarget());
        await Promise.all(tasks);
      }
      await loadData();
      onDataChange?.();
    } catch (err) {
      alert(err.response?.data?.error || '삭제 실패');
    }
  };

  const handleStart = (row) => {
    if (timerState) {
      if (confirm('이미 진행 중인 타이머가 있습니다. 그쪽으로 이동하시겠습니까?')) {
        navigate('/timer');
      }
      return;
    }
    startTimer(
      { id: row.subject_id, name: row.name, color: row.color },
      row.target_sec,
      row.actual_sec
    );
    navigate('/timer');
  };

  const handleStartAll = () => {
    if (planRows.length === 0) return;
    const firstIncomplete = planRows.find((r) => r.actual_sec < r.target_sec);
    if (!firstIncomplete) {
      alert('🎉 오늘의 모든 목표를 이미 달성했습니다!');
      return;
    }
    handleStart(firstIncomplete);
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
  const trashIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6"/>
      <path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/>
      <line x1="10" y1="11" x2="10" y2="17"/>
      <line x1="14" y1="11" x2="14" y2="17"/>
    </svg>
  );

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
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
            {displayRows.length >= 1 && !isPast && (
              <button
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  editMode ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="편집"
              >
                {editMode ? '완료' : '편집'}
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

                    {/* plan 행 + 편집모드: ↑↓🗑️ */}
                    {editMode && row.hasPlan && (
                      <div className="flex gap-0.5 items-center">
                        {planRows.length >= 2 && (
                          <>
                            <button
                              onClick={() => movePlan(planIndex, -1)}
                              disabled={planIndex === 0}
                              className="px-1.5 py-0.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-gray-100"
                              title="위로"
                            >↑</button>
                            <button
                              onClick={() => movePlan(planIndex, 1)}
                              disabled={planIndex === planRows.length - 1}
                              className="px-1.5 py-0.5 text-sm bg-gray-100 hover:bg-gray-200 rounded disabled:opacity-30 disabled:hover:bg-gray-100"
                              title="아래로"
                            >↓</button>
                          </>
                        )}
                        <button
                          onClick={() => setDeleteTarget({
                            subject_id: row.subject_id,
                            name: row.name,
                            actualSec: row.actual_sec,
                            hasPlan: true,
                          })}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded ml-1"
                          title="삭제"
                        >
                          {trashIcon}
                        </button>
                      </div>
                    )}

                    {/* 기록만 행 + 편집모드: 🗑️ */}
                    {editMode && !row.hasPlan && (
                      <button
                        onClick={() => setDeleteTarget({
                          subject_id: row.subject_id,
                          name: row.name,
                          actualSec: row.actual_sec,
                          hasPlan: false,
                        })}
                        className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="세션 삭제"
                      >
                        {trashIcon}
                      </button>
                    )}

                    {/* 일반 모드: plan 행에만 시작 버튼 */}
                    {!editMode && isToday && row.hasPlan && (
                      <button
                        onClick={() => handleStart(row)}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        시작
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    {row.hasPlan ? (
                      <span className="text-gray-500">
                        목표:{' '}
                        <InlineTimeEdit
                          value={row.target_sec}
                          onChange={(sec) => handleInlineSave(row.subject_id, sec)}
                          disabled={isPast || editMode}
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

      {/* 삭제 다이얼로그 — plan 유무에 따라 분기 */}
      {deleteTarget && deleteTarget.hasPlan && (
        <DeletePlanDialog
          name={deleteTarget.name}
          actualSec={deleteTarget.actualSec}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}

      {deleteTarget && !deleteTarget.hasPlan && (
        <ConfirmDialog
          title="세션 삭제"
          message={`${deleteTarget.name}의 오늘 ${formatDuration(deleteTarget.actualSec)} 학습 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`}
          confirmText="삭제"
          danger
          onConfirm={() => handleDeleteConfirm('sessions')}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
