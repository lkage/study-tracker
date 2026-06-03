export default function TimerRecoveryDialog({ state, onContinue, onSaveAndEnd, onDiscard }) {
  const startedAt = new Date(state.started_at);

  // 마지막 활동 시점 (paused면 paused_at, 아니면 현재 — 하지만 그러면 자고 일어난 시간도 카운트되므로
  // 안전하게 paused_at이 있을 때만 그 시점으로, 없으면 현재 사용하되 경고)
  const lastActivity = state.paused_at ? new Date(state.paused_at) : new Date();

  const totalMs = lastActivity.getTime() - startedAt.getTime() - (state.accumulated_pause_ms || 0);
  const learnedSec = Math.max(0, Math.floor(totalMs / 1000));

  const fmt = (d) => d.toLocaleTimeString('ko-KR', { hour12: false });
  const dateStr = startedAt.toLocaleDateString('ko-KR', {
    month: 'short', day: 'numeric', weekday: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="text-2xl">⏱️</div>
          <h2 className="text-xl font-bold text-gray-900">진행 중이던 타이머</h2>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          이전에 종료하지 않은 학습 타이머가 있습니다. 어떻게 처리하시겠어요?
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-5 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: state.subject_color }}
            />
            <span className="font-bold text-gray-900">{state.subject_name}</span>
          </div>
          <div className="text-gray-600">
            <span className="text-gray-400">시작:</span> {dateStr} {fmt(startedAt)}
          </div>
          {state.paused_at && (
            <div className="text-gray-600">
              <span className="text-gray-400">마지막 활동:</span> {fmt(lastActivity)}
            </div>
          )}
          <div className="text-gray-900 font-medium pt-1 border-t border-gray-200">
            학습한 시간: <strong>{formatHMS(learnedSec)}</strong>
          </div>
        </div>

        {!state.paused_at && (
          <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded">
            ⚠️ 일시정지 기록이 없습니다. "저장 후 종료"를 선택하면 시작 시점부터 지금까지 전부 학습으로 기록됩니다.
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={onContinue}
            className="px-3 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            이어서 계속
          </button>
          <button
            onClick={onSaveAndEnd}
            className="px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
          >
            저장 후 종료
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            버리기
          </button>
        </div>
      </div>
    </div>
  );
}

function formatHMS(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
