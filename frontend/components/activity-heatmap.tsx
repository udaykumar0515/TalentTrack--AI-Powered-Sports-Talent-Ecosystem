'use client';

import { useMemo } from 'react';

interface ActivityHeatmapProps {
  activity: Record<string, number>; // { "YYYY-MM-DD": count }
  totalSessions: number;
  streak: number;
}

export function ActivityHeatmap({ activity, totalSessions, streak }: ActivityHeatmapProps) {
  const { weeks, months } = useMemo(() => {
    const today = new Date();
    const weeksData: { date: Date; count: number }[][] = [];
    const monthsData: { name: string; week: number }[] = [];
    
    // Generate 52 weeks (1 year) of data
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 364); // Go back ~52 weeks
    
    // Adjust to start on Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    let currentMonth = -1;
    let currentWeek = 0;
    
    for (let week = 0; week < 53; week++) {
      const weekData: { date: Date; count: number }[] = [];
      
      for (let day = 0; day < 7; day++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (week * 7) + day);
        
        if (date > today) {
          weekData.push({ date, count: -1 }); // Future date marker
        } else {
          const dateStr = date.toISOString().split('T')[0];
          const count = activity[dateStr] || 0;
          weekData.push({ date, count });
        }
        
        // Track month labels
        if (date.getMonth() !== currentMonth && date <= today) {
          currentMonth = date.getMonth();
          monthsData.push({
            name: date.toLocaleDateString('en-US', { month: 'short' }),
            week: week
          });
        }
      }
      
      weeksData.push(weekData);
    }
    
    return { weeks: weeksData, months: monthsData };
  }, [activity]);

  const getColorClass = (count: number): string => {
    if (count === -1) return 'bg-transparent'; // Future
    if (count === 0) return 'bg-muted/30';
    if (count === 1) return 'bg-emerald-300 dark:bg-emerald-800';
    if (count === 2) return 'bg-emerald-400 dark:bg-emerald-700';
    if (count >= 3) return 'bg-emerald-500 dark:bg-emerald-500';
    return 'bg-muted/30';
  };

  const dayNames = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <span className="text-2xl font-bold text-foreground">{totalSessions}</span>
            <span className="text-sm text-muted-foreground ml-2">total sessions</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-foreground">{streak}</span>
            <span className="text-sm text-muted-foreground ml-2">day streak</span>
          </div>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span>Less</span>
          <div className="w-3 h-3 rounded-sm bg-muted/30" />
          <div className="w-3 h-3 rounded-sm bg-emerald-300 dark:bg-emerald-800" />
          <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
          <div className="w-3 h-3 rounded-sm bg-emerald-500" />
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* Month labels */}
          <div className="relative h-6 mb-1">
            {months.map((month, i) => (
              <div
                key={`${month.name}-${i}`}
                className="text-xs text-muted-foreground absolute top-0"
                style={{ 
                  left: `${month.week * 14}px`
                }}
              >
                {month.name}
              </div>
            ))}
          </div>

          <div className="flex">
            {/* Day labels */}
            <div className="flex flex-col mr-2 gap-[2px]">
              {dayNames.map((day, i) => (
                <div key={i} className="h-3 text-xs text-muted-foreground flex items-center">
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div className="flex gap-[2px]">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-[2px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`w-3 h-3 rounded-sm ${getColorClass(day.count)} ${day.count > 0 ? 'cursor-pointer' : ''}`}
                      title={day.count >= 0 
                        ? `${day.date.toLocaleDateString()}: ${day.count} session${day.count !== 1 ? 's' : ''}`
                        : ''
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
