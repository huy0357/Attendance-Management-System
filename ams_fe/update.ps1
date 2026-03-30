$path = 'C:\Users\Asus\Attendance-Management-System\ams_fe\src\app\features\hrm\employees\employee.service.ts'
$c = [System.IO.File]::ReadAllText($path)
$c = $c.Replace("export class EmployeeService {
", "export class EmployeeService {
  private readonly positionsUrl = " + "`/positions`;" + "
")
$c = $c.Replace("@Injectable({ providedIn: 'root' })", "export interface PositionDto {
  positionId: number;
  positionName: string;
}

@Injectable({ providedIn: 'root' })")
$c = $c.Replace("getDepartments():", "getPositions(): Observable<PositionDto[]> {
    const params = new HttpParams().set('page', '0').set('size', '1000').set('sort', 'positionId,asc');
    return this.http.get<any>(this.positionsUrl, { params }).pipe(map(response => { if (Array.isArray(response)) return response; if (response?.items && Array.isArray(response.items)) return response.items; if (response?.content && Array.isArray(response.content)) return response.content; if (response?.data && Array.isArray(response.data)) return response.data; return []; }));
  }

  getDepartments():")
[System.IO.File]::WriteAllText($path, $c)
