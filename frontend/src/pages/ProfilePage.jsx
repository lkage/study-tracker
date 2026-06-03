import { useState } from 'react';
import { useAuthStore } from '../store/auth.js';
import { updateProfile, changePassword } from '../api/auth.js';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">프로필 설정</h1>

      <ProfileSection user={user} updateUser={updateUser} />
      <PasswordSection />
    </div>
  );
}

function ProfileSection({ user, updateUser }) {
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success' | 'error', text }

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!nickname.trim()) {
      setMsg({ type: 'error', text: '닉네임을 입력하세요' });
      return;
    }
    if (nickname === user?.nickname) {
      setMsg({ type: 'error', text: '닉네임이 변경되지 않았습니다' });
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({ nickname: nickname.trim() });
      updateUser({ nickname: res.data.user.nickname });
      setMsg({ type: 'success', text: '닉네임이 변경되었습니다' });
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || '변경 실패' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
    >
      <h2 className="text-lg font-bold text-gray-900">기본 정보</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
        <input
          type="email"
          value={user?.email || ''}
          disabled
          className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">이메일은 변경할 수 없습니다</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
        <input
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {msg && (
        <div
          className={`px-3 py-2 rounded-lg text-sm ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  const reset = () => {
    setCurrent('');
    setNext('');
    setConfirm('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);

    if (!current || !next || !confirm) {
      setMsg({ type: 'error', text: '모든 필드를 입력하세요' });
      return;
    }
    if (next.length < 8) {
      setMsg({ type: 'error', text: '새 비밀번호는 8자 이상이어야 합니다' });
      return;
    }
    if (next !== confirm) {
      setMsg({ type: 'error', text: '새 비밀번호 확인이 일치하지 않습니다' });
      return;
    }
    if (current === next) {
      setMsg({ type: 'error', text: '새 비밀번호가 현재 비밀번호와 같습니다' });
      return;
    }

    setSaving(true);
    try {
      await changePassword({ current_password: current, new_password: next });
      setMsg({ type: 'success', text: '비밀번호가 변경되었습니다' });
      reset();
    } catch (err) {
      setMsg({ type: 'error', text: err.response?.data?.error || '변경 실패' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-gray-200 rounded-lg p-5 space-y-4"
    >
      <h2 className="text-lg font-bold text-gray-900">비밀번호 변경</h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">현재 비밀번호</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 (8자 이상)</label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">새 비밀번호 확인</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {msg && (
        <div
          className={`px-3 py-2 rounded-lg text-sm ${
            msg.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 text-sm font-medium"
        >
          {saving ? '변경 중...' : '비밀번호 변경'}
        </button>
      </div>
    </form>
  );
}
