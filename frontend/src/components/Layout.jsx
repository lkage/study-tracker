import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store/auth.js';

const sidebarItems = [
  { to: '/history', label: '기록', icon: '📅' },
  { to: '/stats', label: '통계', icon: '📈' },
  { to: '/subjects', label: '과목', icon: '📚' },
];

export default function Layout() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [avatarMenuOpen, setAvatarMenuOpen] = useState(false);
  const avatarRef = useRef(null);

  // 아바타 외부 클릭 시 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) {
        setAvatarMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ESC로 사이드바 닫기
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        setAvatarMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = () => {
    clearAuth();
    navigate('/login');
  };

  const handleNav = (path) => {
    setSidebarOpen(false);
    navigate(path);
  };

  // 이니셜 (닉네임 첫 글자)
  const initial = user?.nickname?.charAt(0) || '?';

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4 sticky top-0 z-30">
        {/* 좌측: 햄버거 + 로고 */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="메뉴 열기"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link to="/" className="text-lg font-bold text-gray-900">
            📚 Study Tracker
          </Link>
        </div>

        {/* 우측: 아바타 */}
        <div className="relative" ref={avatarRef}>
          <button
            onClick={() => setAvatarMenuOpen(!avatarMenuOpen)}
            className="w-9 h-9 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors flex items-center justify-center"
            aria-label="사용자 메뉴"
          >
            {initial}
          </button>

          {avatarMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="font-medium text-gray-900 text-sm truncate">{user?.nickname}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                로그아웃
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 사이드바 (오버레이) */}
      {sidebarOpen && (
        <>
          {/* 백드롭 */}
          <div
            className="fixed inset-0 bg-black/30 z-40"
            onClick={() => setSidebarOpen(false)}
          />
          {/* 슬라이드 패널 */}
          <aside className="fixed top-0 left-0 h-full w-64 bg-white shadow-xl z-50 flex flex-col animate-slide-in">
            <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
              <span className="font-semibold text-gray-900">메뉴</span>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg"
                aria-label="닫기"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <nav className="flex-1 p-3 space-y-1">
              <button
                onClick={() => handleNav('/')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <span>🏠</span>
                <span>홈</span>
              </button>
              {sidebarItems.map((item) => (
                <button
                  key={item.to}
                  onClick={() => handleNav(item.to)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>
        </>
      )}

      {/* 콘텐츠 */}
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
