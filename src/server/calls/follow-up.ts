export type FollowUpStatus = 'pending' | 'contacted' | 'resolved' | 'closed'
export type CallStatus = 'new' | 'in_progress' | 'completed' | 'contacted' | 'closed'

const ALLOWED: Record<FollowUpStatus, FollowUpStatus[]> = {
  pending: ['contacted', 'resolved', 'closed'],
  contacted: ['resolved', 'closed', 'contacted'],
  resolved: ['closed', 'resolved'],
  closed: ['closed'],
}

export function applyFollowUpTransition(
  current: FollowUpStatus,
  next: FollowUpStatus
): { follow_up_status: FollowUpStatus; status: CallStatus } {
  const allowed = ALLOWED[current] || ['contacted', 'resolved', 'closed']
  const follow_up_status = allowed.includes(next) ? next : current
  const statusMap: Record<FollowUpStatus, CallStatus> = {
    pending: 'new',
    contacted: 'in_progress',
    resolved: 'completed',
    closed: 'closed',
  }
  return { follow_up_status, status: statusMap[follow_up_status] }
}
