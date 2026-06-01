import { useState, useCallback, useEffect, useRef } from 'react';
import DayPanel from '../components/DayPanel.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';
import { useTimerStore } from '../store/timer.js';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  const timerState = useTimerStore((s) => s.state);
  const prevTimerStateRef = useRef(timerState);

  // 마운트 시 한 번 refresh (timer 종료 후 메인 복귀 포함)
  useEffect(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  // 페이지에 머무는 동안 timer 종료를 감지 (드문 케이스)
  useEffect(() => {
    if (prevTimerStateRef.current && !timerState) {
      setRefreshKey((k) => k + 1);
    }
    prevTimerStateRef.current = timerState;
  }, [timerState]);

  const refreshAll = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

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
    </div>
  );
}
