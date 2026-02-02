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
import { Loader2, UserPlus, CheckCircle } from 'lucide-react';
import { Coach } from '@/lib/types';
import { toast } from 'sonner';
interface RequestCoachDialogProps {
  coach: Coach;
  onSuccess?: () => void;
  disabled?: boolean;
  isPending?: boolean;
}

export function RequestCoachDialog({ coach, onSuccess, disabled, isPending }: RequestCoachDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleRequest = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await api.submitCoachRequest({
        athleteId: user.id,
        currentCoachId: (user as any).coachId || 'none',
        newCoachId: coach.id,
        reason: reason,
      });

      toast.success('Request sent successfully!');
      setOpen(false);
      setReason('');
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error requesting coach:', err);
      toast.error('Failed to send request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // CHECK: If request is pending (either from props or optimistic update), show "Request Sent" and disable interaction.
  if (isPending) {
    return (
        <Button disabled className="w-full bg-green-100 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-700 opacity-100 cursor-not-allowed">
            <CheckCircle className="h-4 w-4 mr-2" /> Request Sent
        </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={disabled} className="w-full">
          {disabled ? (
            <>
               <UserPlus className="h-4 w-4 mr-2" /> Request Sent
            </>
          ) : (
             <>
               <UserPlus className="h-4 w-4 mr-2" /> Request Coach
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request to join {coach.name || coach.username}'s Team</DialogTitle>
          <DialogDescription>
            Send a request to this coach. You can add an optional note to introduce yourself.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                {(coach.name || coach.username || 'C').charAt(0).toUpperCase()}
             </div>
             <div>
                <h4 className="font-semibold">{coach.name || coach.username}</h4>
                <p className="text-sm text-muted-foreground">{coach.specialization || 'Coach'}</p>
             </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="reason" className="text-sm font-medium">
              Note (Optional)
            </label>
            <Textarea
              id="reason"
              placeholder="Hi, I'm a sprinter looking to improve my start..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRequest} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
