export type RequestType = 'LEAVE' | 'OVERTIME' | 'REMOTE' | 'LATE_EARLY';
export type RequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type RequestApprovalStatus = 'APPROVED' | 'REJECTED';

export interface RequestsResponse {
  requestId: number;
  employeeId: number | null;
  employeeName: string | null;
  requestType: RequestType;
  title: string | null;
  reason: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  status: RequestStatus;
  approverId?: number | null;
  approverName?: string | null;
  decisionNote?: string | null;
  submittedAt?: string | null;
}

export interface RequestsUpsertRequest {
  employeeId: number;
  requestType: RequestType;
  title: string;
  reason?: string;
  startDatetime: string;
  endDatetime: string;
}

export interface RequestsApprovalRequest {
  approverId: number;
  status: RequestApprovalStatus;
  decisionNote?: string;
}
