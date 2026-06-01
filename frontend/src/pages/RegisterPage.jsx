import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register, login } from '../api/auth.js';
import { useAuthStore } from '../store/auth.js';

// sessionStorage로 임시 입력 보존 (탭 닫으면 사라짐)
const DRAFT_KEY = 'register_draft';

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  // sessionStorage에서 임시 입력 복원
  const [email, setEmail] = useState(() => {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
    return draft.email || '';
  });
  const [nickname, setNickname] = useState(() => {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
    return draft.nickname || '';
  });
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 입력 중간에 sessionStorage 동기화 (비밀번호 제외 — 보안)
  useEffect(() => {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ email, nickname }));
  }, [email, nickname]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다');
      return;
    }

    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다');
      return;
    }

    setLoading(true);
    try {
      await register({ email, password, nickname });

      // 가입 직후 자동 로그인
      const res = await login({ email, password });
      setAuth(res.data.token, res.data.user);

      // 임시 데이터 정리
      sessionStorage.removeItem(DRAFT_KEY);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '회원가입에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">📚 Study Tracker</h1>
        <p className="text-gray-500 mb-6">회원가입</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이메일
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              닉네임
            </label>
            <input
              type="text"
              required
              maxLength={50}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 (8자 이상)
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호 확인
            </label>
            <input
              type="password"
              required
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
          >
            {loading ? '처리 중...' : '회원가입'}
          </button>
        </form>

        <p className="text-sm text-gray-600 mt-6 text-center">
          이미 계정이 있으신가요?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
