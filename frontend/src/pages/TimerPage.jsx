import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTimerStore, useTimerElapsed } from '../store/timer.js';
import { listPlans } from '../api/plans.js';
import { listSessions } from '../api/sessions.js';
import { formatDuration, toDateString } from '../utils/time.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

function playGoalSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    [0, 0.25, 0.5].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.3);
      osc.start(ctx.currentTime + delay);
      osc.stop(ctx.currentTime + delay + 0.3);
    });
  } catch {
    // ignore
  }
}

export default function TimerPage() {
  const navigate = useNavigate();
  const state = useTimerStore((s) => s.state);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const finishAndSave = useTimerStore((s) => s.finishAndSave);
  const finishAndStartNext = useTimerStore((s) => s.finishAndStartNext);
  const cancel = useTimerStore((s) => s.cancel);

  const elapsedSec = useTimerElapsed();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [busy, setBusy] = useState(null);
  const [showGoalAlert, setShowGoalAlert] = useState(false);
  const [goalNotified, setGoalNotified] = useState(false);

  useEffect(() => {
    if (!state) navigate('/', { replace: true });
  }, [state, navigate]);

  useEffect(() => {
    if (!state) {
      setGoalNotified(false);
      return;
    }
    const before = state.accumulated_before_sec || 0;
    setGoalNotified(state.target_sec > 0 && before >= state.target_sec);
    setShowGoalAlert(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.started_at]);

  const accumulatedBefore = state?.accumulated_before_sec || 0;
  const totalSec = accumulatedBefore + elapsedSec;
  const isGoalReached = !!state && state.target_sec > 0 && totalSec >= state.target_sec;

  useEffect(() => {
    if (isGoalReached && !goalNotified) {
      setGoalNotified(true);
      setShowGoalAlert(true);
      playGoalSound();
    }
  }, [isGoalReached, goalNotified]);

  if (!state) return null;

  const isPaused = !!state.paused_at;
  const isFocusLost = isPaused && state.pause_reason === 'focus_lost';
  const progress = state.target_sec > 0
    ? Math.min(100, (totalSec / state.target_sec) * 100)
    : 0;

  const handleFinish = async () => {
    setBusy('finish');
    try {
      await finishAndSave();
      navigate('/', { replace: true });
    } catch (err) {
      alert('저장 실패: ' + (err.response?.data?.error || err.message));
      setBusy(null);
    }
  };

  const handleFinishAndNext = async () => {
    setBusy('next');
    try {
      const currentSubjectId = state.subject_id;

      // 1. plans + sessions 조회 (현재 세션은 아직 저장 전)
      const todayStr = toDateString(new Date());
      const dayStart = new Date(todayStr + 'T00:00:00');
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const [plansRes, sessionsRes] = await Promise.all([
        listPlans({ date: todayStr }),
        listSessions({
          from: dayStart.toISOString(),
          to: dayEnd.toISOString(),
        }),
      ]);

      const todayPlans = plansRes.data.plans;
      const todaySessions = sessionsRes.data.sessions;

      const actualBySub = {};
      todaySessions.forEach((s) => {
        actualBySub[s.subject_id] = (actualBySub[s.subject_id] || 0) + s.duration_sec;
      });

      // 2. 현재 과목 제외, 미달성 plan 첫 번째
      const nextPlan = todayPlans
        .filter((p) => p.subject_id !== currentSubjectId)
        .find((p) => (actualBySub[p.subject_id] || 0) < p.target_sec);

      if (!nextPlan) {
        // 다음 plan 없음 → 일반 종료
        await finishAndSave();
        alert('🎉 오늘 남은 미달성 과목이 없습니다!');
        navigate('/', { replace: true });
        return;
      }

      // 3. atomic 호출 — state가 null 되는 순간 없음
      await finishAndStartNext(
        { id: nextPlan.subject_id, name: nextPlan.subject_name, color: nextPlan.subject_color },
        nextPlan.target_sec,
        actualBySub[nextPlan.subject_id] || 0
      );
      setBusy(null);
    } catch (err) {
      alert('처리 실패: ' + (err.response?.data?.error || err.message));
      setBusy(null);
    }
  };

  const handleCancelConfirm = () => {
    cancel();
    setConfirmCancel(false);
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-8">
      <div className="flex items-center gap-3 mb-12">
        <div
          className="w-5 h-5 rounded-full"
          style={{ backgroundColor: state.subject_color }}
        />
        <h1 className="text-3xl font-bold text-gray-900">{state.subject_name}</h1>
      </div>

      <div className="text-8xl font-mono font-bold text-gray-900 tabular-nums mb-2 leading-none">
        {formatHMS(elapsedSec)}
      </div>
      <p className="text-sm text-gray-500 mb-6">현재 세션</p>

      {state.target_sec > 0 && (
        <>
          <p className="text-gray-700 mb-3">
            목표 {formatDuration(state.target_sec)} · 누적 <strong>{formatHMS(totalSec)}</strong> · {Math.floor(progress)}%
            {isGoalReached && <span className="ml-2 text-green-600 font-bold">✓ 목표 달성</span>}
          </p>
          <div className="w-96 h-3 bg-gray-200 rounded-full overflow-hidden mb-10">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                backgroundColor: isGoalReached ? '#10B981' : state.subject_color,
              }}
            />
          </div>
        </>
      )}

      {state.target_sec === 0 && (
        <>
          {accumulatedBefore > 0 && (
            <p className="text-gray-700 mb-10">
              오늘 누적: <strong>{formatHMS(totalSec)}</strong>
            </p>
          )}
          {accumulatedBefore === 0 && <div className="mb-10" />}
        </>
      )}

      {isFocusLost && (
        <div className="mb-8 px-5 py-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-lg max-w-md text-center">
          ⚠️ 다른 작업으로 전환되어 자동으로 일시정지되었습니다.<br />
          <span className="text-sm text-amber-700">재개 버튼을 눌러 계속하세요.</span>
        </div>
      )}

      {isPaused && !isFocusLost && (
        <div className="mb-8 px-5 py-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg max-w-md text-center text-sm">
          일시정지됨
        </div>
      )}

      <div className="flex gap-3 flex-wrap justify-center">
        {isPaused ? (
          <button
            onClick={resume}
            disabled={busy !== null}
            className="px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 font-medium text-lg shadow-sm"
          >
            ▶ 재개
          </button>
        ) : (
          <button
            onClick={() => pause('manual')}
            disabled={busy !== null}
            className="px-6 py-4 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 disabled:opacity-50 font-medium text-lg"
          >
            ⏸ 일시정지
          </button>
        )}
        <button
          onClick={handleFinish}
          disabled={busy !== null || elapsedSec < 1}
          className="px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium text-lg shadow-sm"
        >
          {busy === 'finish' ? '저장 중...' : '■ 종료'}
        </button>
        <button
          onClick={handleFinishAndNext}
          disabled={busy !== null || elapsedSec < 1}
          className="px-6 py-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 font-medium text-lg shadow-sm"
        >
          {busy === 'next' ? '처리 중...' : '⏭ 다음 과목으로'}
        </button>
      </div>

      <button
        onClick={() => setConfirmCancel(true)}
        disabled={busy !== null}
        className="mt-10 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50"
      >
        타이머 취소 (저장 안 함)
      </button>

      {state.accumulated_pause_ms > 0 && (
        <p className="mt-4 text-xs text-gray-400">
          누적 일시정지: {formatHMS(Math.floor(state.accumulated_pause_ms / 1000))}
        </p>
      )}

      {showGoalAlert && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 text-center">
            <div className="text-5xl mb-3">🎯</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">목표 시간 달성!</h2>
            <p className="text-gray-600 mb-6">
              <strong>{state.subject_name}</strong> 목표 시간 {formatDuration(state.target_sec)}을(를) 달성하셨습니다.
            </p>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => { setShowGoalAlert(false); handleFinishAndNext(); }}
                disabled={busy !== null}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 font-medium"
              >
                ⏭ 다음 과목으로
              </button>
              <button
                onClick={() => { setShowGoalAlert(false); handleFinish(); }}
                disabled={busy !== null}
                className="px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium"
              >
                여기서 종료
              </button>
              <button
                onClick={() => setShowGoalAlert(false)}
                className="px-4 py-2.5 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 font-medium"
              >
                더 학습
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmCancel && (
        <ConfirmDialog
          title="타이머 취소"
          message="진행 중인 타이머를 취소합니다. 지금까지의 학습 시간은 저장되지 않습니다."
          confirmText="취소하기"
          cancelText="계속"
          danger
          onConfirm={handleCancelConfirm}
          onCancel={() => setConfirmCancel(false)}
        />
      )}
    </div>
  );
}

function formatHMS(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
