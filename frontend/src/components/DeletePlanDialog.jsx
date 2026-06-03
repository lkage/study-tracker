import { formatDuration } from '../utils/time.js';

export default function DeletePlanDialog({ name, actualSec, onCancel, onConfirm }) {
  const hasSessions = actualSec > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">삭제</h2>
        <p className="text-sm text-gray-600 mb-5">
          <strong>{name}</strong> · 무엇을 삭제할까요?
        </p>

        <div className="space-y-2 mb-5">
          <button
            onClick={() => onConfirm('plan')}
            className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="font-medium text-gray-900">계획만 삭제</div>
            <div className="text-xs text-gray-500 mt-1">학습 기록은 유지됩니다</div>
          </button>

          <button
            onClick={() => onConfirm('sessions')}
            disabled={!hasSessions}
            className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <div className="font-medium text-gray-900">세션만 삭제</div>
            <div className="text-xs text-gray-500 mt-1">
              {hasSessions
                ? `오늘 ${formatDuration(actualSec)} 학습 기록 제거 · 계획 유지`
                : '삭제할 세션이 없습니다'}
            </div>
          </button>

          <button
            onClick={() => onConfirm('both')}
            className="w-full text-left px-4 py-3 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
          >
            <div className="font-medium text-red-700">모두 삭제</div>
            <div className="text-xs text-red-600 mt-1">
              {hasSessions
                ? '계획과 오늘 학습 기록 둘 다 제거'
                : '계획 제거 (오늘 학습 기록 없음)'}
            </div>
          </button>
        </div>

        <button
          onClick={onCancel}
          className="w-full px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
        >
          취소
        </button>
      </div>
    </div>
  );
}
