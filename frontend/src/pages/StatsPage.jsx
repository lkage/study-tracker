import { useState, useEffect, useMemo } from 'react';
import { listSessions } from '../api/sessions.js';
import { toDateString, formatDuration } from '../utils/time.js';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from 'recharts';

const PERIOD_OPTIONS = [
  { value: '1w', label: '최근 1주' },
  { value: '4w', label: '최근 4주' },
  { value: '12w', label: '최근 12주' },
];

function getPeriodRange(periodValue) {
  const today = new Date();
  let days = 28;
  if (periodValue === '1w') days = 7;
  else if (periodValue === '12w') days = 84;

  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (days - 1));
  return {
    from: start.toISOString(),
    to: end.toISOString(),
    startDate: start,
    endDate: end,
    days,
  };
}

export default function StatsPage() {
  const [period, setPeriod] = useState('4w');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const range = useMemo(() => getPeriodRange(period), [period]);

  useEffect(() => {
    setLoading(true);
    listSessions({ from: range.from, to: range.to })
      .then((res) => setSessions(res.data.sessions))
      .catch((err) => console.error('Load sessions error:', err))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  // ── 통계 ──
  const stats = useMemo(() => {
    const totalSec = sessions.reduce((sum, s) => sum + s.duration_sec, 0);

    const studyDateSet = new Set(
      sessions.map((s) => toDateString(new Date(s.started_at)))
    );
    const studyDaysCount = studyDateSet.size;
    const avgPerStudyDay = studyDaysCount > 0 ? Math.floor(totalSec / studyDaysCount) : 0;

    const subjectTotals = {};
    sessions.forEach((s) => {
      if (!subjectTotals[s.subject_id]) {
        subjectTotals[s.subject_id] = {
          id: s.subject_id,
          name: s.subject_name,
          color: s.subject_color,
          total: 0,
        };
      }
      subjectTotals[s.subject_id].total += s.duration_sec;
    });
    const subjectList = Object.values(subjectTotals).sort((a, b) => b.total - a.total);
    const topSubject = subjectList[0] || null;

    // streak: 오늘부터 거꾸로 연속 학습 일수
    let streak = 0;
    const cursor = new Date();
    while (studyDateSet.has(toDateString(cursor))) {
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }

    return { totalSec, studyDaysCount, avgPerStudyDay, subjectList, topSubject, streak };
  }, [sessions]);

  // 일별 데이터 (0 포함 모든 날짜)
  const dailyData = useMemo(() => {
    const map = {};
    const cursor = new Date(range.startDate);
    while (cursor < range.endDate) {
      const ds = toDateString(cursor);
      map[ds] = {
        date: ds,
        label: `${cursor.getMonth() + 1}/${cursor.getDate()}`,
        minutes: 0,
      };
      cursor.setDate(cursor.getDate() + 1);
    }
    sessions.forEach((s) => {
      const ds = toDateString(new Date(s.started_at));
      if (map[ds]) map[ds].minutes += s.duration_sec / 60;
    });
    return Object.values(map).map((d) => ({
      ...d,
      minutes: Math.round(d.minutes),
    }));
  }, [sessions, range.startDate, range.endDate]);

  // 요일별 평균
  const dayOfWeekData = useMemo(() => {
    const sums = [0, 0, 0, 0, 0, 0, 0];
    const counts = [0, 0, 0, 0, 0, 0, 0];

    dailyData.forEach((d) => {
      const dow = new Date(d.date + 'T00:00:00').getDay();
      sums[dow] += d.minutes;
      counts[dow] += 1;
    });

    const labels = ['일', '월', '화', '수', '목', '금', '토'];
    return labels.map((day, i) => ({
      day,
      avgMinutes: counts[i] > 0 ? sums[i] / counts[i] : 0,
    }));
  }, [dailyData]);

  const pieData = stats.subjectList.map((s) => ({
    name: s.name,
    value: s.total,
    color: s.color,
  }));

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">학습 통계</h1>

      {/* 기간 */}
      <div className="mb-6">
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          {PERIOD_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="총 학습 시간"
          value={stats.totalSec > 0 ? formatDuration(stats.totalSec) : '0분'}
        />
        <StatCard
          label="학습한 날들의 평균 학습 시간"
          value={stats.avgPerStudyDay > 0 ? formatDuration(stats.avgPerStudyDay) : '-'}
          sub={`${stats.studyDaysCount}일 학습`}
        />
        <StatCard
          label="Top 과목"
          value={stats.topSubject?.name || '-'}
          sub={stats.topSubject ? formatDuration(stats.topSubject.total) : ''}
          color={stats.topSubject?.color}
        />
        <StatCard
          label="연속 학습"
          value={`${stats.streak}일`}
          sub={stats.streak > 0 ? '오늘까지 이어짐' : '오늘 학습 시작!'}
        />
      </div>

      {loading && (
        <div className="text-center py-12 text-gray-500">불러오는 중...</div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500 bg-white border border-gray-200 rounded-lg">
          이 기간에 학습 기록이 없습니다.
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-6">
          {/* 일별 추이 */}
          <ChartCard title="일별 학습 시간 (분)">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  interval={range.days > 14 ? Math.floor(range.days / 8) : 0}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value) => [formatDuration(value * 60) || "0분", "학습 시간"]}
                />
                <Bar dataKey="minutes" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 과목별 분포 + 요일별 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="과목별 분포">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatDuration(value)} />
                </PieChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="요일별 평균 학습 시간 (분)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => [formatDuration(value * 60) || "0분", "평균"]} />
                  <Bar dataKey="avgMinutes" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        {color && (
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: color }}
          />
        )}
        <div className="text-lg font-bold text-gray-900 truncate">{value}</div>
      </div>
      {sub && <div className="text-xs text-gray-400 mt-1 truncate">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h2 className="text-sm font-medium text-gray-700 mb-3">{title}</h2>
      {children}
    </div>
  );
}
