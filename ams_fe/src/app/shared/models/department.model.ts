/**
 * FE interfaces matching BE DepartmentDto.
 * DepartmentController uses DepartmentDto for both request body and response.
 * GET /api/departments/tree returns List<DepartmentDto> with nested children.
 * GET /api/departments returns Spring Page<DepartmentDto>.
 */

export interface DepartmentDto {
    departmentId: number;
    departmentName: string;
    departmentCode: string;
    parentDepartmentId: number | null;
    parentDepartmentName: string | null;
    isActive: boolean;
    createdAt: string | null;
    updatedAt: string | null;
    children: DepartmentDto[];
}

/** Request body for POST /api/departments and PUT /api/departments/{id}. */
export interface DepartmentRequest {
    departmentName: string;
    departmentCode: string;
    parentDepartmentId?: number | null;
    isActive?: boolean;
}
