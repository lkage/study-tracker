import { useEffect, useState } from 'react';
import { useSubjectsStore } from '../store/subjects.js';
import SubjectModal from '../components/SubjectModal.jsx';
import ConfirmDialog from '../components/ConfirmDialog.jsx';

export default function SubjectsPage() {
  const { subjects, loading, error, fetchAll, remove } = useSubjectsStore();

  const [modalSubject, setModalSubject] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const openCreateModal = () => {
    setModalSubject(null);
    setModalOpen(true);
  };

  const openEditModal = (subject) => {
    setModalSubject(subject);
    setModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove(deleteTarget.id);
    } catch (err) {
      alert(err.response?.data?.error || '삭제에 실패했습니다');
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">📚 과목</h1>
          <p className="text-gray-600 mt-1">학습할 과목을 관리합니다</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          + 새 과목
        </button>
      </div>

      {loading && (
        <div className="text-center text-gray-500 py-8">불러오는 중...</div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg mb-4">
          {error}
        </div>
      )}

      {!loading && subjects.length === 0 && (
        <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-200">
          <p className="text-gray-500 mb-4">아직 과목이 없습니다</p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            첫 과목 추가하기
          </button>
        </div>
      )}

      {subjects.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-100">
          {subjects.map((subject) => (
            <div
              key={subject.id}
              className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="font-medium text-gray-900">{subject.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEditModal(subject)}
                  className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg transition-colors"
                  title="수정"
                >
                  ✏️
                </button>
                <button
                  onClick={() => setDeleteTarget(subject)}
                  className="p-2 text-gray-500 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors"
                  title="삭제"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <SubjectModal
          subject={modalSubject}
          onClose={() => setModalOpen(false)}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="과목 삭제"
          message={`'${deleteTarget.name}' 과목을 삭제하시겠습니까? 이 과목의 모든 학습 기록도 함께 삭제됩니다.`}
          confirmText="삭제"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
