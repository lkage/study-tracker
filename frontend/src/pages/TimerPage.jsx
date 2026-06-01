import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useTimerStore, useTimerElapsed } from '../store/timer.js';
import { formatDuration } from '../utils/time.js';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function TimerPage() {
  const navigate = useNavigate();
  const state = useTimerStore((s) => s.state);
  const pause = useTimerStore((s) => s.pause);
  const resume = useTimerStore((s) => s.resume);
  const finishAndSave = useTimerStore((s) => s.finishAndSave);
  const cancel = useTimerStore((s) => s.cancel);

  const elapsedSec = useTimerElapsed();

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!state) navigate('/', { replace: true });
  }, [state, navigate]);

  if (!state) return null;

  const isPaused = !!state.paused_at;
  const isFocusLost = isPaused && state.pause_reason === 'focus_lost';

  // 누적 = 이전 + 현재 세션
  const accumulatedBefore = state.accumulated_before_sec || 0;
  const totalSec = accumulatedBefore + elapsedSec;
  const isGoalReached = state.target_sec > 0 && totalSec >= state.target_sec;

  const progress = state.target_sec > 0
    ? Math.min(100, (totalSec / state.target_sec) * 100)
    : 0;

  const handleFinish = async () => {
    setSaving(true);
    try {
      await finishAndSave();
      navigate('/', { replace: true });
    } catch (err) {
      alert('저장 실패: ' + (err.response?.data?.error || err.message));
      setSaving(false);
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

      <div className="flex gap-4">
        {isPaused ? (
          <button
            onClick={resume}
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-lg shadow-sm"
          >
            ▶ 재개
          </button>
        ) : (
          <button
            onClick={() => pause('manual')}
            className="px-8 py-4 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 font-medium text-lg"
          >
            ⏸ 일시정지
          </button>
        )}
        <button
          onClick={handleFinish}
          disabled={saving || elapsedSec < 1}
          className="px-8 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 font-medium text-lg shadow-sm"
        >
          {saving ? '저장 중...' : '■ 종료'}
        </button>
      </div>

      <button
        onClick={() => setConfirmCancel(true)}
        className="mt-10 text-sm text-gray-500 hover:text-gray-700"
      >
        타이머 취소 (저장 안 함)
      </button>

      {state.accumulated_pause_ms > 0 && (
        <p className="mt-4 text-xs text-gray-400">
          누적 일시정지: {formatHMS(Math.floor(state.accumulated_pause_ms / 1000))}
        </p>
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
