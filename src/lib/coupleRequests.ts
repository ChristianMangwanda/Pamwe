import { supabase } from './supabase';

// Pausing is a decision the two of you make, so it is a request that the other
// person answers rather than a switch either of you can flip. The screens read
// this file; nothing calls supabase.from('couple_requests') directly, and there
// is nothing to call, because the table takes no writes from the client at all.

export type RequestKind = 'pause' | 'restart';
export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface CoupleRequest {
  id: string;
  couple_id: string;
  kind: RequestKind;
  requested_by: string;
  status: RequestStatus;
  created_at: string;
  responded_at: string | null;
  responded_by: string | null;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn as never, args as never);
  if (error) throw error;
  return data as T;
}

/** Ask to pause, or ask to start again. Idempotent: asking twice returns the
 *  request already waiting rather than failing, because a double tap on a slow
 *  connection is not a different intention. */
export async function askCoupleChange(kind: RequestKind): Promise<CoupleRequest> {
  return rpc<CoupleRequest>('request_couple_change', { p_kind: kind });
}

/** Answer your partner's ask. The database refuses if it was yours. */
export async function respondToRequest(id: string, accept: boolean): Promise<CoupleRequest> {
  return rpc<CoupleRequest>('respond_to_couple_request', { p_id: id, p_accept: accept });
}

/** Take back an ask nobody has answered yet. */
export async function withdrawRequest(id: string): Promise<CoupleRequest> {
  return rpc<CoupleRequest>('withdraw_couple_request', { p_id: id });
}

/** The one open ask of this kind, if there is one. */
export async function pendingRequest(kind: RequestKind): Promise<CoupleRequest | null> {
  const { data, error } = await supabase
    .from('couple_requests')
    .select('*')
    .eq('kind', kind)
    .eq('status', 'pending')
    .maybeSingle();
  if (error) throw error;
  return (data as CoupleRequest | null) ?? null;
}

/** Every open ask, whoever made it. The paused screen and Today both need to
 *  know whether there is something waiting for an answer. */
export async function openRequests(): Promise<CoupleRequest[]> {
  const { data, error } = await supabase
    .from('couple_requests')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as CoupleRequest[]) ?? [];
}

/** Is this ask mine to answer, or mine to withdraw? */
export function isMine(request: CoupleRequest, userId: string | null | undefined): boolean {
  return !!userId && request.requested_by === userId;
}
