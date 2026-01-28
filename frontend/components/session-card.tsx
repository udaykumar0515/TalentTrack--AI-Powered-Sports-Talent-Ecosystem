'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Session } from '@/lib/types';
import { Calendar, Target, TrendingUp, Trash2, Clock } from 'lucide-react';

interface SessionCardProps {
  session: Session;
  onDelete?: (sessionId: string) => void;
}

export function SessionCard({ session, onDelete }: SessionCardProps) {
  // Handle both backend naming conventions
  const sessionId = session.id || session.sessionId || '';
  const formScore = session.formScore || session.metrics?.formScore || 0;
  const reps = session.reps || session.metrics?.reps || 0;
  const duration = session.durationSec || session.duration || 0;
  const date = session.date || session.timestamp || session.createdAt;
  const athleteName = session.athleteName || '';

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm('Delete this session?')) {
      onDelete(sessionId);
    }
  };

  return (
    <Card className="p-4 border-border/50">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-foreground capitalize">
            {session.exercise.replace('_', ' ')}
          </h3>
          {athleteName && (
            <p className="text-sm text-muted-foreground">{athleteName}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {date && (
            <span className="text-xs text-muted-foreground">
              {formatDate(date)}
            </span>
          )}
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="space-y-1">
          <TrendingUp className="h-4 w-4 text-muted-foreground mx-auto" />
          <p className={`text-lg font-bold ${getScoreColor(formScore)}`}>{formScore}%</p>
          <p className="text-xs text-muted-foreground">Form Score</p>
        </div>
        <div className="space-y-1">
          <Target className="h-4 w-4 text-muted-foreground mx-auto" />
          <p className="text-lg font-bold text-foreground">{reps}</p>
          <p className="text-xs text-muted-foreground">Reps</p>
        </div>
        <div className="space-y-1">
          <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
          <p className="text-lg font-bold text-foreground">{Math.round(duration)}s</p>
          <p className="text-xs text-muted-foreground">Duration</p>
        </div>
      </div>
    </Card>
  );
}
