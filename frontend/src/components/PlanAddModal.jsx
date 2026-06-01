import { useState, useEffect, useRef } from 'react';
import { useSubjectsStore } from '../store/subjects.js';
import { upsertPlan } from '../api/plans.js';
import ColorPicker from './ColorPicker.jsx';

export default function PlanAddModal({ planDate, existingPlans = [], onClose, onSaved }) {
  const { subjects, fetchAll, create: createSubject } = useSubjectsStore();

  const [query, setQuery] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const inputRef = useRef(null);
  const mouseDownOnBackdropRef = useRef(false);

  useEffect(() => {
    fetchAll();
    inputRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const trimmed = query.trim();
  const matches = trimmed
    ? subjects.filter((s) => s.name.toLowerCase().includes(trimmed.toLowerCase()))
    : [];
  const exactMatch = subjects.find((s) => s.name === trimmed);
  const isNewSubject = trimmed && !exactMatch;
  const existingPlan = exactMatch
    ? existingPlans.find((p) => p.subject_id === exactMatch.id)
    : null;

  const handleSelectExisting = (subject) => {
    setQuery(subject.name);
    inputRef.current?.focus();
  };

  // 백드롭 클릭으로 닫기 — mousedown과 mouseup 둘 다 백드롭에서 발생해야 닫음
  const handleBackdropMouseDown = (e) => {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };
  const handleBackdropMouseUp = (e) => {
    if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
      onClose();
    }
    mouseDownOnBackdropRef.current = false;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!trimmed) {
      setError('과목명을 입력해주세요');
      return;
    }

    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;

    if (m >= 60) {
      setError('분은 0~59 사이여야 합니다');
      return;
    }
    const targetSec = h * 3600 + m * 60;
    if (targetSec <= 0) {
      setError('목표 시간을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      let subjectId;
      if (exactMatch) {
        subjectId = exactMatch.id;
      } else {
        const newSubject = await createSubject({ name: trimmed, color });
        subjectId = newSubject.id;
      }

      await upsertPlan({
        subject_id: subjectId,
        plan_date: planDate,
        target_sec: targetSec,
      });

      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '저장에 실패했습니다');
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">학습 계획 추가</h2>
        <p className="text-sm text-gray-500 mb-4">{planDate}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">과목명</label>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={100}
              placeholder="예: 웹프로그래밍"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            {trimmed && (
              <div className="mt-1 border border-gray-200 rounded-lg bg-gray-50 max-h-40 overflow-y-auto divide-y divide-gray-100">
                {matches.map((s) => {
                  const planForThis = existingPlans.find((p) => p.subject_id === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleSelectExisting(s)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100"
                    >
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                      <span className="truncate">{s.name}</span>
                      {exactMatch?.id === s.id && (
                        <span className="ml-auto text-xs text-blue-600 flex-shrink-0">선택됨</span>
                      )}
                      {planForThis && exactMatch?.id !== s.id && (
                        <span className="ml-auto text-xs text-amber-600 flex-shrink-0">계획 있음</span>
                      )}
                    </button>
                  );
                })}

                {isNewSubject && (
                  <div className="px-3 py-2 text-sm text-blue-700 bg-blue-50">
                    + 새 과목 <strong>"{trimmed}"</strong>으로 등록됩니다
                  </div>
                )}

                {matches.length === 0 && !isNewSubject && (
                  <div className="px-3 py-2 text-sm text-gray-400">결과 없음</div>
                )}
              </div>
            )}

            {existingPlan && (
              <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                이 과목은 이미 계획이 있습니다 (목표 {Math.floor(existingPlan.target_sec / 3600)}h {Math.floor((existingPlan.target_sec % 3600) / 60)}m). 저장하면 덮어씁니다.
              </p>
            )}
          </div>

          {isNewSubject && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                색상 <span className="text-gray-500 text-xs">(새 과목)</span>
              </label>
              <ColorPicker value={color} onChange={setColor} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">목표 시간</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="23"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                placeholder="0"
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">시간</span>
              <input
                type="number"
                min="0"
                max="59"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                placeholder="30"
                className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">분</span>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              취소
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
