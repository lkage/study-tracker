import { useState, useEffect, useRef } from 'react';
import ColorPicker from './ColorPicker.jsx';
import { useSubjectsStore } from '../store/subjects.js';

export default function SubjectModal({ subject, onClose }) {
  const create = useSubjectsStore((s) => s.create);
  const update = useSubjectsStore((s) => s.update);

  const isEdit = !!subject;
  const [name, setName] = useState(subject?.name || '');
  const [color, setColor] = useState(subject?.color || '#3B82F6');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const mouseDownOnBackdropRef = useRef(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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

    if (!name.trim()) {
      setError('과목 이름을 입력해주세요');
      return;
    }

    setLoading(true);
    try {
      if (isEdit) {
        await update(subject.id, { name: name.trim(), color });
      } else {
        await create({ name: name.trim(), color });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || '저장에 실패했습니다');
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          {isEdit ? '과목 수정' : '새 과목'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이름</label>
            <input
              type="text"
              required
              maxLength={100}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="예: 웹프로그래밍"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">색상</label>
            <ColorPicker value={color} onChange={setColor} />
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
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
