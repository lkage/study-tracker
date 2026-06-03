import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import DayPanel from '../components/DayPanel.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import TimerRecoveryDialog from '../components/TimerRecoveryDialog.jsx';
import { useTimerStore } from '../store/timer.js';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const timerState = useTimerStore((s) => s.state);
  const finishAndSave = useTimerStore((s) => s.finishAndSave);
  const cancel = useTimerStore((s) => s.cancel);
  const prevTimerStateRef = useRef(timerState);

  const [recoveryOpen, setRecoveryOpen] = useState(false);

  // 마운트 시 한 번 refresh
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // 마운트 시 active_timer 있으면 복구 다이얼로그
  useEffect(() => {
    if (timerState) {
      setRecoveryOpen(true);
    }
    // 마운트 시점에만 체크
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 메인 페이지 머무는 동안 타이머 종료 감지
  useEffect(() => {
    if (prevTimerStateRef.current && !timerState) {
      setRefreshKey((k) => k + 1);
    }
    prevTimerStateRef.current = timerState;
  }, [timerState]);

  const refreshAll = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleContinue = () => {
    setRecoveryOpen(false);
    navigate('/timer');
  };

  const handleSaveAndEnd = async () => {
    try {
      await finishAndSave();
      setRecoveryOpen(false);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      alert('저장 실패: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDiscard = () => {
    if (!confirm('진행 중이던 타이머를 버립니다. 학습 시간은 저장되지 않습니다. 계속하시겠습니까?')) return;
    cancel();
    setRecoveryOpen(false);
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-96 flex-shrink-0">
        <DayPanel
          selectedDate={selectedDate}
          onDataChange={refreshAll}
          refreshKey={refreshKey}
        />
      </div>
      <div className="flex-1 p-4 min-w-0">
        <MonthCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          refreshKey={refreshKey}
        />
      </div>

      {recoveryOpen && timerState && (
        <TimerRecoveryDialog
          state={timerState}
          onContinue={handleContinue}
          onSaveAndEnd={handleSaveAndEnd}
          onDiscard={handleDiscard}
        />
      )}
    </div>
  );
}
