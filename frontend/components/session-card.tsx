'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Session } from '@/lib/types';
import { Calendar, Target, TrendingUp, Trash2, AlertTriangle } from 'lucide-react';

interface SessionCardProps {
  session: Session;
  onDelete?: (sessionId: string) => void;
}

export function SessionCard({ session, onDelete }: SessionCardProps) {
  // Handle both backend naming conventions
  const sessionId = session.id || session.sessionId || '';
  const formScore = session.formScore || session.metrics?.formScore || 0;
  const reps = session.reps || session.metrics?.reps || 0;
  const date = session.date || session.timestamp || session.createdAt;
  const risk = session.risk || 'Low';
  const athleteName = session.athleteName || '';

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-destructive';
  };

  const getRiskVariant = (riskLevel: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (riskLevel) {
      case 'High':
        return 'destructive';
      case 'Medium':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDelete && confirm('Delete this session?')) {
      onDelete(sessionId);
    }
  };

  return (
    <Link href={`/sessions/${sessionId}`}>
      <Card className="group p-4 border-border/50 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all cursor-pointer">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors capitalize">
              {session.exercise.replace('_', ' ')}
            </h3>
            {athleteName && (
              <p className="text-sm text-muted-foreground">{athleteName}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {risk !== 'Low' && (
              <Badge variant={getRiskVariant(risk)} className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {risk}
              </Badge>
            )}
            {onDelete && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
            <Calendar className="h-4 w-4 text-muted-foreground mx-auto" />
            <p className="text-sm font-medium text-foreground">
              {date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
            </p>
            <p className="text-xs text-muted-foreground">Date</p>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-sm text-primary group-hover:underline">View Details →</p>
        </div>
      </Card>
    </Link>
  );
}
