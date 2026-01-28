'use client';

import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface PerformanceRingProps {
  title: string;
  score: number;
  maxScore?: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function PerformanceRing({
  title,
  score,
  maxScore = 100,
  label,
  size = 'md',
  className,
}: PerformanceRingProps) {
  const percentage = (score / maxScore) * 100;
  
  const sizes = {
    sm: { ring: 80, stroke: 6, text: 'text-xl' },
    md: { ring: 120, stroke: 8, text: 'text-3xl' },
    lg: { ring: 160, stroke: 10, text: 'text-4xl' },
  };

  const { ring, stroke, text } = sizes[size];
  const radius = (ring - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getScoreColor = (pct: number) => {
    if (pct >= 90) return 'text-success stroke-success';
    if (pct >= 75) return 'text-primary stroke-primary';
    if (pct >= 60) return 'text-warning stroke-warning';
    return 'text-destructive stroke-destructive';
  };

  const scoreColor = getScoreColor(percentage);

  return (
    <Card className={cn('p-6', className)}>
      <h3 className="text-sm font-medium text-muted-foreground mb-4">{title}</h3>
      <div className="flex flex-col items-center">
        <div className="relative" style={{ width: ring, height: ring }}>
          <svg className="transform -rotate-90" width={ring} height={ring}>
            {/* Background circle */}
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={radius}
              className="stroke-muted/20"
              strokeWidth={stroke}
              fill="none"
            />
            {/* Progress circle */}
            <circle
              cx={ring / 2}
              cy={ring / 2}
              r={radius}
              className={cn('transition-all duration-1000 ease-out', scoreColor)}
              strokeWidth={stroke}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={cn('font-bold', text, scoreColor)}>
              {Math.round(percentage)}
            </span>
            <span className="text-xs text-muted-foreground mt-1">
              {label || 'Score'}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
