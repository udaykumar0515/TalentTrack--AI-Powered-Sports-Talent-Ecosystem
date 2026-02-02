'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { CoachChangeRequest } from '@/lib/types';
import { useAuth } from '@/lib/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Check, X, User } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export function CoachRequestsList() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<CoachChangeRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectRequestId, setRejectRequestId] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const response = await api.getCoachChangeRequests(user.id);
      setRequests(response.requests);
    } catch (err) {
      console.error('Error fetching requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user]);

  const handleApprove = async (requestId: string) => {
    if (!user) return;
    setProcessingId(requestId);
    try {
      await api.approveCoachRequest(requestId, user.id);
      toast.success('Athlete approved!');
      setRequests(requests.filter(r => r.id !== requestId));
    } catch (err) {
      console.error('Error approving request:', err);
      toast.error('Failed to approve request.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectClick = (requestId: string) => {
    setRejectRequestId(requestId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const confirmReject = async () => {
      if (!user || !rejectRequestId) return;
      setProcessingId(rejectRequestId);
      try {
        await api.rejectCoachRequest(rejectRequestId, user.id, rejectReason);
        toast.success('Request rejected.');
        setRequests(requests.filter(r => r.id !== rejectRequestId));
        setRejectDialogOpen(false);
      } catch (err) {
        console.error('Error rejecting request:', err);
        toast.error('Failed to reject request.');
      } finally {
        setProcessingId(null);
      }
  };

  if (isLoading) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>;
  }

  if (requests.length === 0) {
    return (
      <Card className="p-6 text-center text-muted-foreground">
        <p>No pending coaching requests.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((request) => (
        <Card key={request.id} className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-start gap-4">
               <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <User className="h-5 w-5" />
               </div>
               <div>
                 <h4 className="font-semibold">Request from {request.athleteName || request.athleteId}</h4>
                 <p className="text-sm text-muted-foreground">
                   {new Date(request.created_at).toLocaleDateString()}
                 </p>
                 {request.reason && (
                   <div className="mt-2 text-sm bg-muted/50 p-2 rounded-md italic">
                     "{request.reason}"
                   </div>
                 )}
               </div>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleRejectClick(request.id)}
                disabled={processingId === request.id}
              >
                 {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4 mr-1" />}
                 Reject
              </Button>
              <Button 
                size="sm"
                onClick={() => handleApprove(request.id)}
                disabled={processingId === request.id}
              >
                {processingId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1" />}
                Approve
              </Button>
            </div>
          </div>
        </Card>
      ))}

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Reject Request</DialogTitle>
                <DialogDescription>
                    You can optionally provide a reason for rejecting this athlete's request.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <label className="text-sm font-medium mb-2 block">Reason (Optional)</label>
                <Textarea 
                    placeholder="e.g. Currently at full team capacity..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                />
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                <Button variant="destructive" onClick={confirmReject}>Reject Request</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
