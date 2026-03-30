$path = 'C:\Users\Asus\Attendance-Management-System\ams_fe\src\app\features\hrm\employees\employees.component.ts'
$c = [System.IO.File]::ReadAllText($path)

$c = $c.Replace(
"import { EmployeeDto, EmployeeService } from './employee.service';",
"import { DepartmentDto, EmployeeDto, EmployeeService, PositionDto } from './employee.service';"
)

$c = $c.Replace(
"  employees: UiEmployee[] = [];
  currentPage = 1;",
"  employees: UiEmployee[] = [];
  departments: DepartmentDto[] = [];
  positions: PositionDto[] = [];
  currentPage = 1;"
)

$c = $c.Replace(
"  ngOnInit(): void {
    this.loadEmployeesPage();
    this.setupSearchDebounce();
  }",
"  ngOnInit(): void {
    this.employeeService.getDepartments().subscribe(res => { this.departments = res; this.cdr.markForCheck(); });
    this.employeeService.getPositions().subscribe(res => { this.positions = res; this.cdr.markForCheck(); });
    this.loadEmployeesPage();
    this.setupSearchDebounce();
  }"
)

$c = $c.Replace(
"  get canOpenOtherEmployeeAttendance(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  openAddModal(): void {",
"  get canOpenOtherEmployeeAttendance(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  getDepartmentName(id: number | null | undefined): string {
    if (!id) return '-';
    const dept = this.departments.find(d => d.departmentId === id);
    return dept ? dept.departmentName : id.toString();
  }

  getPositionName(id: number | null | undefined): string {
    if (!id) return '-';
    const pos = this.positions.find(p => p.positionId === id);
    return pos ? pos.positionName : id.toString();
  }

  get canAddEmployee(): boolean {
    return this.authService.hasRole('ADMIN');
  }

  openAddModal(): void {"
)

[System.IO.File]::WriteAllText($path, $c)
