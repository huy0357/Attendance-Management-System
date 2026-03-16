import { Component, OnInit } from '@angular/core';
import {
  DepartmentOverview,
  HrmService,
  OrgDepartment,
  OrgEmployee,
  TransferEmployeePayload,
} from '../hrm.service';

interface MoveDetails {
  employeeId: string;
  employeeName: string;
  fromDeptId: string;
  fromDeptName: string;
  toDeptId: string;
  toDeptName: string;
}

@Component({
  standalone: false,
  selector: 'app-org-chart',
  templateUrl: './org-chart.component.html',
  styleUrls: ['./org-chart.component.scss'],
})
export class OrgChartComponent implements OnInit {
  zoom = 100;
  fullscreen = false;
  searchQuery = '';

  draggedEmployeeId: string | null = null;
  showConfirmModal = false;
  moveDetails: MoveDetails | null = null;

  employees: OrgEmployee[] = [];
  departments: OrgDepartment[] = [];
  departmentOverviews: DepartmentOverview[] = [];

  readonly rootEmployeeId = 'ceo';
  readonly minZoom = 50;
  readonly maxZoom = 150;
  readonly zoomStep = 10;
  readonly dropZoneOrder = ['operations', 'sales', 'hr', 'executive'];
  readonly overviewOrder = ['executive', 'operations', 'sales', 'hr'];

  readonly transferImpacts: string[] = [
    'Reporting structure will be updated',
    'Access permissions may change',
    'Current projects will be reassigned',
    'Notification will be sent to all stakeholders',
  ];

  constructor(private hrmService: HrmService) {}

  ngOnInit(): void {
    this.hrmService.getOrgChart().subscribe((data) => {
      this.employees = data;
    });

    this.hrmService.getDepartments().subscribe((data) => {
      this.departments = data;
      this.loadDepartmentOverviews();
    });
  }

  loadDepartmentOverviews(): void {
    this.departmentOverviews = [];
    for (const dept of this.departments) {
      this.hrmService.getDepartmentOverview(dept.id).subscribe((overview) => {
        this.departmentOverviews = [...this.departmentOverviews, overview];
      });
    }
  }

  zoomIn(): void {
    this.zoom = Math.min(this.maxZoom, this.zoom + this.zoomStep);
  }

  zoomOut(): void {
    this.zoom = Math.max(this.minZoom, this.zoom - this.zoomStep);
  }

  toggleFullscreen(): void {
    this.fullscreen = !this.fullscreen;
  }

  clearSearch(): void {
    this.searchQuery = '';
  }

  handleDragStart(employeeId: string): void {
    this.draggedEmployeeId = employeeId;
  }

  handleDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  handleDrop(targetDepartmentId: string): void {
    if (!this.draggedEmployeeId) return;
    const employee = this.getEmployeeById(this.draggedEmployeeId);
    if (!employee || employee.departmentId === targetDepartmentId) {
      this.draggedEmployeeId = null;
      return;
    }

    this.moveDetails = {
      employeeId: employee.id,
      employeeName: employee.name,
      fromDeptId: employee.departmentId,
      fromDeptName: employee.departmentName,
      toDeptId: targetDepartmentId,
      toDeptName: this.getDepartmentName(targetDepartmentId),
    };
    this.showConfirmModal = true;
  }

  confirmMove(): void {
    if (!this.draggedEmployeeId || !this.moveDetails) return;

    const payload: TransferEmployeePayload = {
      employeeId: this.moveDetails.employeeId,
      fromDepartmentId: this.moveDetails.fromDeptId,
      toDepartmentId: this.moveDetails.toDeptId,
      effectiveDate: new Date().toISOString().split('T')[0],
    };

    this.hrmService.transferEmployee(payload).subscribe(() => {
      this.employees = this.employees.map((emp) =>
        emp.id === this.draggedEmployeeId
          ? {
              ...emp,
              departmentId: this.moveDetails?.toDeptId || emp.departmentId,
              departmentName: this.moveDetails?.toDeptName || emp.departmentName,
            }
          : emp,
      );
      this.loadDepartmentOverviews();
      this.resetMove();
    });
  }

  cancelMove(): void {
    this.resetMove();
  }

  private resetMove(): void {
    this.showConfirmModal = false;
    this.draggedEmployeeId = null;
    this.moveDetails = null;
  }

  getEmployeeById(employeeId: string): OrgEmployee | undefined {
    return this.employees.find((emp) => emp.id === employeeId);
  }

  hasSubordinates(employee: OrgEmployee): boolean {
    return !!employee.subordinates && employee.subordinates.length > 0;
  }

  getEmployeeCardClass(employee: OrgEmployee): string {
    if (this.draggedEmployeeId === employee.id) {
      return 'opacity-50 scale-95 border-gray-200';
    }
    if (this.isEmployeeHighlighted(employee)) {
      return 'border-blue-600 ring-2 ring-blue-300';
    }
    return 'border-gray-200';
  }

  isEmployeeHighlighted(employee: OrgEmployee): boolean {
    if (!this.searchQuery) return false;
    const query = this.searchQuery.toLowerCase();
    return employee.name.toLowerCase().includes(query) || employee.title.toLowerCase().includes(query);
  }

  getDepartmentName(deptId: string): string {
    const dept = this.departments.find((item) => item.id === deptId);
    return dept ? dept.name : 'Department';
  }

  getDepartmentsByOrder(order: string[]): OrgDepartment[] {
    const ordered: OrgDepartment[] = [];
    for (const deptId of order) {
      const dept = this.departments.find((item) => item.id === deptId);
      if (dept) ordered.push(dept);
    }
    return ordered;
  }

  getDepartmentMemberCount(deptId: string): number {
    let count = 0;
    for (const emp of this.employees) {
      if (emp.departmentId === deptId) count += 1;
    }
    return count;
  }

  getDepartmentTopMembers(deptId: string, limit: number): string[] {
    const names: string[] = [];
    for (const emp of this.employees) {
      if (emp.departmentId === deptId && names.length < limit) {
        names.push(emp.name);
      }
    }
    return names;
  }

  getDepartmentExtraCount(deptId: string, limit: number): number {
    const total = this.getDepartmentMemberCount(deptId);
    return total > limit ? total - limit : 0;
  }

  getDepartmentOverview(deptId: string): DepartmentOverview | null {
    const overview = this.departmentOverviews.find((item) => item.departmentId === deptId);
    return overview || null;
  }

  getDepartmentHighlight(deptId: string): string {
    const overview = this.getDepartmentOverview(deptId);
    if (!overview || overview.highlights.length === 0) return '';
    return overview.highlights[0];
  }

  getZoomStyle(): { [key: string]: string } {
    return {
      transform: `scale(${this.zoom / 100})`,
      transformOrigin: 'top center',
      minHeight: '600px',
    };
  }

  getChartContainerClass(): string {
    return this.fullscreen
      ? 'fixed inset-0 bg-gray-50 z-40 p-6 overflow-auto'
      : '';
  }

  isDepartmentDropActive(deptId: string): boolean {
    if (!this.draggedEmployeeId) return false;
    const employee = this.getEmployeeById(this.draggedEmployeeId);
    return !!employee && employee.departmentId !== deptId;
  }
}
