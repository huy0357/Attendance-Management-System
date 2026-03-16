export type RequestType = 'LEAVE' | 'OVERTIME' | 'REMOTE' | 'LATE_EARLY';
export type RequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface RequestsResponse {
  requestId: number;
  employeeId: number;
  employeeName: string;
  requestType: RequestType;
  title: string;
  reason: string;
  startDatetime: string;
  endDatetime: string;
  status: RequestStatus;
  approverId?: number;
  approverName?: string;
  decisionNote?: string;
  submittedAt?: string;
}

export interface RequestsUpsertRequest {
  employeeId: number;
  requestType: RequestType;
  title: string;
  reason: string;
  startDatetime: string;
  endDatetime: string;
}

export interface RequestsApprovalRequest {
  approverId: number;
  status: RequestStatus;
  decisionNote?: string;
}
