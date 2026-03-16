/**
 * Generic pagination response types matching BE response shapes.
 *
 * AccountController uses custom PageResponse<T> → items field.
 * DepartmentController uses Spring Page<T> → content field.
 */

/** Matches BE custom PageResponse<T> (used by AccountController, EmployeeController). */
export interface PageResponse<T> {
    items: T[];
    page: number;
    size: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}

/** Matches Spring Data Page<T> (used by DepartmentController.getAll). */
export interface SpringPage<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}
