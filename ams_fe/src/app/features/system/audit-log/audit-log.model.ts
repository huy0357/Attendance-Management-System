export interface AuditLog {
  auditId: number;
  actorId: number;
  entityType: string;
  entityId: number;
  action: string;
  oldValueJson: string;
  newValueJson: string;
  createdAt: string;
}

export interface AuditLogFilter {
  entityType?: string;
  action?: string;
  actorId?: number;
  page: number;
  size: number;
  sortBy?: string;
  sortDir?: string;
  searchTerm?: string;
}

export interface PageResponse<T> {
  items?: T[];
  content?: T[];
  data?: T[];
  page: number;
  size: number;
  totalElements?: number;
  totalItems?: number;
  totalPages: number;
  hasNext?: boolean;
  hasPrev?: boolean;
}
