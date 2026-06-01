import { useEffect, useRef } from 'react';

export default function ConfirmDialog({ title, message, confirmText = '확인', cancelText = '취소', onConfirm, onCancel, danger = false }) {
  const mouseDownOnBackdropRef = useRef(false);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  const handleBackdropMouseDown = (e) => {
    mouseDownOnBackdropRef.current = e.target === e.currentTarget;
  };
  const handleBackdropMouseUp = (e) => {
    if (mouseDownOnBackdropRef.current && e.target === e.currentTarget) {
      onCancel();
    }
    mouseDownOnBackdropRef.current = false;
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onMouseDown={handleBackdropMouseDown}
      onMouseUp={handleBackdropMouseUp}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 mb-6">{message}</p>

        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-lg ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
