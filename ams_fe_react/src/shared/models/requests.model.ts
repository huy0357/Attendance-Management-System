export interface RequestDto {
  requestId: number;
  employeeId: number;
  employeeName: string;
  requestType: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  startDate: string;
  endDate: string;
  reason: string;
  createdAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  note: string | null;
}

export interface CreateRequestPayload {
  requestType: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface ReviewRequestPayload {
  status: 'APPROVED' | 'REJECTED';
  note?: string;
}
