import { useState, useEffect, useRef } from 'react';
import { formatDuration, parseDuration } from '../utils/time.js';

/**
 * 클릭하면 H:MM 형식으로 인라인 편집 가능한 시간 표시.
 * props:
 *   value: number (초). null/0이면 "미설정"
 *   onChange: (newSec | null) => Promise<void>   null이면 삭제 의미
 *   disabled: boolean
 */
export default function InlineTimeEdit({ value, onChange, disabled = false }) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const startEdit = () => {
    if (disabled) return;
    setInput(value && value > 0 ? formatDuration(value) : '');
    setError('');
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError('');
  };

  const submit = async () => {
    setError('');
    const trimmed = input.trim();

    // 빈 입력 → 삭제
    if (!trimmed) {
      setSaving(true);
      try {
        await onChange(null);
        setEditing(false);
      } catch (err) {
        setError(err.response?.data?.error || '저장 실패');
      } finally {
        setSaving(false);
      }
      return;
    }

    const sec = parseDuration(trimmed);
    if (sec === null) {
      setError('H:MM 형식 (예: 1:30)');
      return;
    }

    setSaving(true);
    try {
      await onChange(sec);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.error || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    } else if (e.key === 'Escape') {
      cancel();
    }
  };

  if (editing) {
    return (
      <div className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={submit}
          disabled={saving}
          placeholder="1:30"
          className={`w-16 px-2 py-0.5 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      disabled={disabled}
      className="text-sm text-gray-600 hover:text-blue-600 hover:underline cursor-pointer disabled:cursor-default disabled:hover:no-underline disabled:hover:text-gray-600"
      title="클릭하여 수정"
    >
      {value && value > 0 ? formatDuration(value) : '미설정'}
    </button>
  );
}
