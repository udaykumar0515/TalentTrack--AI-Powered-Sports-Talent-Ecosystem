import React from 'react';

// Progress Circle Component
interface ProgressCircleProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  value?: string;
}

export const ProgressCircle: React.FC<ProgressCircleProps> = ({
  percentage,
  size = 80,
  strokeWidth = 6,
  color = '#4A90E2',
  label = '',
  value = ''
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500 ease-in-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">{value}</span>
        </div>
      </div>
      {label && <span className="text-xs text-gray-600 mt-1">{label}</span>}
    </div>
  );
};

// Line Chart Component
interface LineChartProps {
  data: Array<{ name: string; value: number; date?: string }>;
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({
  data,
  width = 300,
  height = 150,
  color = '#4A90E2',
  showDots = true
}) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue || 1;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * (width - 40) + 20;
    const y = height - 20 - ((point.value - minValue) / range) * (height - 40);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="w-full">
      <svg width={width} height={height} className="overflow-visible">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
          <line
            key={index}
            x1="20"
            y1={20 + ratio * (height - 40)}
            x2={width - 20}
            y2={20 + ratio * (height - 40)}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        ))}
        
        {/* Line */}
        <polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="drop-shadow-sm"
        />
        
        {/* Dots */}
        {showDots && data.map((point, index) => {
          const x = (index / (data.length - 1)) * (width - 40) + 20;
          const y = height - 20 - ((point.value - minValue) / range) * (height - 40);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill={color}
              stroke="white"
              strokeWidth="2"
              className="hover:r-6 transition-all duration-200"
            />
          );
        })}
        
        {/* Y-axis labels */}
        {[0, 0.5, 1].map((ratio, index) => {
          const value = minValue + ratio * range;
          return (
            <text
              key={index}
              x="10"
              y={height - 20 - ratio * (height - 40) + 4}
              fontSize="10"
              fill="#6b7280"
              textAnchor="end"
            >
              {Math.round(value)}
            </text>
          );
        })}
      </svg>
    </div>
  );
};

// Bar Chart Component
interface BarChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  width?: number;
  height?: number;
  maxValue?: number;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  width = 300,
  height = 150,
  maxValue
}) => {
  if (data.length === 0) return null;

  const calculatedMaxValue = maxValue || Math.max(...data.map(d => d.value));
  const barWidth = (width - 40) / data.length - 10;

  return (
    <div className="w-full">
      <svg width={width} height={height} className="overflow-visible">
        {/* Bars */}
        {data.map((item, index) => {
          const barHeight = (item.value / calculatedMaxValue) * (height - 40);
          const x = 20 + index * (barWidth + 10);
          const y = height - 20 - barHeight;
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={item.color || '#4A90E2'}
                rx="4"
                className="hover:opacity-80 transition-opacity duration-200"
              />
              {/* Value label */}
              <text
                x={x + barWidth / 2}
                y={y - 5}
                fontSize="10"
                fill="#374151"
                textAnchor="middle"
                fontWeight="500"
              >
                {item.value}
              </text>
              {/* Name label */}
              <text
                x={x + barWidth / 2}
                y={height - 5}
                fontSize="10"
                fill="#6b7280"
                textAnchor="middle"
              >
                {item.name}
              </text>
            </g>
          );
        })}
        
        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio, index) => (
          <line
            key={index}
            x1="20"
            y1={20 + ratio * (height - 40)}
            x2={width - 20}
            y2={20 + ratio * (height - 40)}
            stroke="#f3f4f6"
            strokeWidth="1"
          />
        ))}
      </svg>
    </div>
  );
};

// Performance Trend Chart
interface PerformanceTrendProps {
  sessions: Array<{ date: string; formScore: number; exercise: string }>;
}

export const PerformanceTrend: React.FC<PerformanceTrendProps> = ({ sessions }) => {
  const last7Sessions = sessions.slice(-7);
  const chartData = last7Sessions.map((session, index) => ({
    name: `Day ${index + 1}`,
    value: session.formScore,
    date: session.date
  }));

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Form Score Trend (Last 7 Sessions)</h3>
      <LineChart data={chartData} color="#00A896" />
    </div>
  );
};

// Exercise Distribution Chart
interface ExerciseDistributionProps {
  sessions: Array<{ exercise: string; formScore: number }>;
}

export const ExerciseDistribution: React.FC<ExerciseDistributionProps> = ({ sessions }) => {
  const exerciseCounts = sessions.reduce((acc, session) => {
    acc[session.exercise] = (acc[session.exercise] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const chartData = Object.entries(exerciseCounts).map(([exercise, count]) => ({
    name: exercise.charAt(0).toUpperCase() + exercise.slice(1),
    value: count,
    color: exercise === 'squat' ? '#4A90E2' : exercise === 'deadlift' ? '#00A896' : '#FF6B6B'
  }));

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Exercise Distribution</h3>
      <BarChart data={chartData} />
    </div>
  );
};

// Weekly Progress Chart
interface WeeklyProgressProps {
  weeklyData: Array<{ week: string; sessions: number; avgScore: number }>;
}

export const WeeklyProgress: React.FC<WeeklyProgressProps> = ({ weeklyData }) => {
  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Weekly Progress</h3>
      <div className="space-y-3">
        {weeklyData.map((week, index) => (
          <div key={index} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{week.week}</span>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Sessions:</span>
                <span className="text-sm font-medium">{week.sessions}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">Avg Score:</span>
                <ProgressCircle 
                  percentage={week.avgScore} 
                  size={30} 
                  strokeWidth={3}
                  color="#4A90E2"
                  value={`${week.avgScore}%`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
