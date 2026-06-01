import { useState, useCallback } from 'react';
import DayPanel from '../components/DayPanel.jsx';
import MonthCalendar from '../components/MonthCalendar.jsx';

export default function DashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshKey, setRefreshKey] = useState(0);

  // 좌측 패널에서 데이터 변경되면 달력도 갱신
  const refreshAll = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      <div className="w-96 flex-shrink-0">
        <DayPanel
          selectedDate={selectedDate}
          onDataChange={refreshAll}
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
