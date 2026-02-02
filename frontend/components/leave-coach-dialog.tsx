'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { Loader2, LogOut } from 'lucide-react';
import { toast } from 'sonner';

interface LeaveCoachDialogProps {
  coachName?: string;
  onSuccess?: () => void;
}

export function LeaveCoachDialog({ coachName, onSuccess }: LeaveCoachDialogProps) {
  const { user, updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleLeave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await api.leaveCoach(user.id, reason);
      
      // Update local state immediately to reflect changes
      await updateUser({ coachId: undefined, coachName: undefined });
      
      toast.success('You have left your coach.');
      setOpen(false);
      
      // Allow parent to handle redirect/reload
      if (onSuccess) onSuccess();
      else window.location.reload();
      
    } catch (err) {
      console.error('Error leaving coach:', err);
      toast.error('Failed to leave coach. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
           variant="ghost" 
           size="sm" 
           className="text-destructive hover:text-destructive hover:bg-destructive/10"
        >
           <LogOut className="h-4 w-4 mr-2" />
           Leave Coach
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Leave Coach</DialogTitle>
          <DialogDescription>
            Are you sure you want to leave your current coach? You will lose access to their training plans.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Reason (Optional)
            </label>
            <Textarea
              id="reason"
              placeholder="Please let us know why you are leaving..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              This feedback will be shared with {coachName || 'your coach'} to help them improve.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleLeave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
