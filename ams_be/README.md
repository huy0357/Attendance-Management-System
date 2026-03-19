# Hướng dẫn Unit Test Backend

## 1. Mục đích tài liệu

Tài liệu này hướng dẫn cách sử dụng, chạy, bảo trì và mở rộng bộ unit test của backend `ams_be`.

Bộ unit test hiện tại được dùng để:
- Kiểm tra logic nghiệp vụ của backend ở mức unit test
- Giảm rủi ro regression khi thay đổi code
- Hỗ trợ review code bằng số liệu coverage rõ ràng
- Giúp dev/tester mới vào dự án có thể chạy và đọc test nhanh

Phạm vi chính:
- Test được viết trong `src/test/java`
- Không sửa production code trong `src/main/java` chỉ để phục vụ test
- Ưu tiên test branch và business logic theo code thật hiện có

## 2. Công nghệ và công cụ đang dùng

Bộ test backend hiện tại sử dụng:
- Java
- Spring Boot
- JUnit 5
- Mockito
- Maven Wrapper
- JaCoCo chạy bằng Maven CLI

## 3. Cấu trúc thư mục test

Toàn bộ test nằm trong:

```text
src/test/java/org/example/ams_be
```

Các nhóm chính đang có:
- `utils`
- `service`
- `service.batch`
- `controller`
- `security`
- `exception`
- `scheduler`
- `dto`
- `dto.request`
- `dto.response`
- `entity`
- `enums`
- `support`

Cách hiểu nhanh:
- `service`: test logic nghiệp vụ chính
- `service.batch`: test các batch flow, apply request, tính công, làm sạch log
- `controller`: test branch theo request param, flag, response status/body
- `security`: test filter, auth branch, token branch
- `exception`: test exception handler
- `scheduler`: test scheduler delegation
- `dto/entity/...`: test branch generated hoặc branch thật trong model class
- `support`: helper dùng chung cho test

## 4. Danh sách nhóm test hiện có

### Unit test cho utils
Tập trung vào:
- null / non-null
- valid / invalid
- fallback / default
- helper logic có branch thật

### Unit test cho service
Tập trung vào:
- happy path
- validate fail path
- found / not found
- duplicate / non-duplicate
- create / update / delete
- exception path
- flag true / false
- early return

### Unit test cho batch service
Tập trung vào:
- xử lý batch theo ngày/tháng
- apply / skip request
- empty / non-empty input
- approve / reject / ignore flow
- các nhánh điều kiện trong pipeline batch

### Unit test cho controller
Tập trung vào:
- mapping request vào service
- query param / path param / body branch
- flag true / false
- response status / response body
- delegation đúng sang service

### Unit test cho security/filter
Tập trung vào:
- header thiếu / sai format / hợp lệ
- token invalid / valid
- branch set hoặc không set security context
- filter chain vẫn được gọi đúng

### Unit test cho exception handler
Tập trung vào:
- từng handler method
- branch message / validation error
- response code đúng theo loại exception

### Unit test cho scheduler
Tập trung vào:
- scheduler có delegate đúng service hay không
- success path và catch path nếu class có branch thật

### Unit test cho DTO / Request / Response / Entity / Enum
Tập trung vào:
- branch generated trong `equals` / `hashCode`
- branch null / non-null
- branch field mismatch
- lifecycle method như `@PrePersist`, `@PreUpdate` nếu có
- các ternary hoặc branch thật trong model class

## 5. Hướng dẫn chạy test

### Chạy toàn bộ test

Linux/macOS/Git Bash:
```bash
./mvnw test
```

Windows PowerShell/CMD:
```powershell
.\mvnw.cmd test
```

### Chạy 1 file test cụ thể

```bash
./mvnw -Dtest=ClassNameTest test
```

Ví dụ:
```bash
./mvnw -Dtest=EmployeeServiceTest test
```

Windows:
```powershell
.\mvnw.cmd -Dtest=EmployeeServiceTest test
```

### Chạy nhiều file test cụ thể

PowerShell nên quote tham số `-Dtest`:

```bash
./mvnw "-Dtest=EmployeeServiceTest,DepartmentServiceTest" test
```

Windows:
```powershell
.\mvnw.cmd "-Dtest=EmployeeServiceTest,DepartmentServiceTest" test
```

### Chạy test kèm JaCoCo coverage report

```bash
./mvnw -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```

Windows:
```powershell
.\mvnw.cmd -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```

### Xem coverage ngay trên terminal

Lưu ý:
- Lệnh JaCoCo qua Maven CLI chỉ **sinh report** vào thư mục `target/site/jacoco`
- Terminal khi chạy Maven sẽ chủ yếu hiện **log test**
- JaCoCo **không tự in sẵn bảng coverage đẹp trên terminal**
- Muốn xem coverage ngay trên terminal, cần đọc file `target/site/jacoco/jacoco.csv`

#### Chạy JaCoCo để sinh report

PowerShell:

```powershell
.\mvnw.cmd -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```

Sau khi chạy xong, các file quan trọng sẽ có tại:

```text
target/site/jacoco/index.html
target/site/jacoco/jacoco.csv
target/site/jacoco/jacoco.xml
```

#### File dùng để đọc coverage trên terminal

File CSV cần dùng:

```text
target/site/jacoco/jacoco.csv
```

File này chứa số liệu coverage theo package/class. Có thể dùng PowerShell để cộng tổng và in ra bảng coverage ngay trên terminal.

#### In bảng coverage tổng ngay trên terminal

PowerShell:

```powershell
$csv = Import-Csv .\target\site\jacoco\jacoco.csv

$lineMissed = ($csv | Measure-Object LINE_MISSED -Sum).Sum
$lineCovered = ($csv | Measure-Object LINE_COVERED -Sum).Sum

$instructionMissed = ($csv | Measure-Object INSTRUCTION_MISSED -Sum).Sum
$instructionCovered = ($csv | Measure-Object INSTRUCTION_COVERED -Sum).Sum

$branchMissed = ($csv | Measure-Object BRANCH_MISSED -Sum).Sum
$branchCovered = ($csv | Measure-Object BRANCH_COVERED -Sum).Sum

$methodMissed = ($csv | Measure-Object METHOD_MISSED -Sum).Sum
$methodCovered = ($csv | Measure-Object METHOD_COVERED -Sum).Sum

$classCount = ($csv | Measure-Object).Count
$classCovered = ($csv | Where-Object { [int]$_.LINE_COVERED -gt 0 }).Count
$classMissed = $classCount - $classCovered

function Get-CoveragePercent($missed, $covered) {
    $total = [double]$missed + [double]$covered
    if ($total -eq 0) { return "100.00%" }
    return ('{0:N2}%' -f (([double]$covered / $total) * 100))
}

$result = @(
    [pscustomobject]@{ Metric = 'Line coverage';        Value = (Get-CoveragePercent $lineMissed $lineCovered) }
    [pscustomobject]@{ Metric = 'Instruction coverage'; Value = (Get-CoveragePercent $instructionMissed $instructionCovered) }
    [pscustomobject]@{ Metric = 'Branch coverage';      Value = (Get-CoveragePercent $branchMissed $branchCovered) }
    [pscustomobject]@{ Metric = 'Method coverage';      Value = (Get-CoveragePercent $methodMissed $methodCovered) }
    [pscustomobject]@{ Metric = 'Class coverage';       Value = (Get-CoveragePercent $classMissed $classCovered) }
)

Write-Host ""
Write-Host "Coverage hiện tại của dự án"
$result | Format-Table -AutoSize
```

Ví dụ output trên terminal:

```text
Coverage hiện tại của dự án

Metric                 Value
------                 -----
Line coverage          91.52%
Instruction coverage   90.82%
Branch coverage        90.93%
Method coverage        95.54%
Class coverage         100.00%
```

Lưu ý:
- Số liệu trên được tính từ `jacoco.csv`
- Nếu vừa thêm test mới, hãy chạy lại JaCoCo trước khi đọc CSV
- Nếu chưa chạy JaCoCo mà đọc CSV ngay, file có thể chưa tồn tại hoặc chứa số liệu cũ

### Xem top class/package coverage thấp trên terminal

#### Xem top class miss branch nhiều nhất

PowerShell:

```powershell
Import-Csv .\target\site\jacoco\jacoco.csv |
    Sort-Object { [int]$_.BRANCH_MISSED } -Descending |
    Select-Object -First 20 GROUP, PACKAGE, CLASS, BRANCH_MISSED, BRANCH_COVERED |
    Format-Table -AutoSize
```

#### Xem top class miss line nhiều nhất

PowerShell:

```powershell
Import-Csv .\target\site\jacoco\jacoco.csv |
    Sort-Object { [int]$_.LINE_MISSED } -Descending |
    Select-Object -First 20 GROUP, PACKAGE, CLASS, LINE_MISSED, LINE_COVERED |
    Format-Table -AutoSize
```

#### Xem top package miss branch nhiều nhất

PowerShell:

```powershell
Import-Csv .\target\site\jacoco\jacoco.csv |
    Group-Object PACKAGE |
    ForEach-Object {
        [pscustomobject]@{
            Package = $_.Name
            BranchMissed = ($_.Group | Measure-Object BRANCH_MISSED -Sum).Sum
            BranchCovered = ($_.Group | Measure-Object BRANCH_COVERED -Sum).Sum
        }
    } |
    Sort-Object BranchMissed -Descending |
    Select-Object -First 20 |
    Format-Table -AutoSize
```

#### Xem top package miss line nhiều nhất

PowerShell:

```powershell
Import-Csv .\target\site\jacoco\jacoco.csv |
    Group-Object PACKAGE |
    ForEach-Object {
        [pscustomobject]@{
            Package = $_.Name
            LineMissed = ($_.Group | Measure-Object LINE_MISSED -Sum).Sum
            LineCovered = ($_.Group | Measure-Object LINE_COVERED -Sum).Sum
        }
    } |
    Sort-Object LineMissed -Descending |
    Select-Object -First 20 |
    Format-Table -AutoSize
```

### Phân biệt rõ: tạo report và in số liệu trên terminal

#### Chỉ tạo report

Lệnh sau **không tự in bảng coverage tổng**:

```powershell
.\mvnw.cmd -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```

Lệnh này chỉ:
- chạy test
- sinh file JaCoCo
- tạo report HTML/XML/CSV

#### Muốn hiện coverage trên terminal

Cần chạy thêm đoạn PowerShell đọc file:

```text
target/site/jacoco/jacoco.csv
```

Nói ngắn gọn:
1. Maven + JaCoCo để **sinh report**
2. PowerShell đọc `jacoco.csv` để **in bảng coverage trên terminal**

## 6. Hướng dẫn đọc coverage

### Report nằm ở đâu

Sau khi chạy JaCoCo, report nằm tại:
```text
target/site/jacoco/index.html
```

File dữ liệu chi tiết:
```text
target/site/jacoco/jacoco.xml
target/site/jacoco/jacoco.csv
```

### Cần đọc chỉ số nào

Các chỉ số chính:
- `Line coverage`
- `Instruction coverage`
- `Branch coverage`
- `Method coverage`
- `Class coverage`

Ý nghĩa:
- `Line coverage`: tỷ lệ số dòng code được chạy qua
- `Instruction coverage`: tỷ lệ bytecode instruction được chạy qua
- `Branch coverage`: tỷ lệ nhánh điều kiện đã được phủ
- `Method coverage`: tỷ lệ method đã được gọi qua
- `Class coverage`: tỷ lệ class đã được chạm tới

### Coverage hiện tại của dự án

- Line coverage: `91.52%`
- Instruction coverage: `90.82%`
- Branch coverage: `90.93%`
- Method coverage: `95.54%`
- Class coverage: `100.00%`

### Khi review coverage nên ưu tiên gì

Ưu tiên đọc:
1. `Branch coverage`
2. Class nào còn miss branch nhiều
3. Method nào còn miss branch
4. Branch đó có reachable qua public API hay không

### Lỗi thường gặp khi xem coverage trên terminal

#### Đã chạy JaCoCo nhưng terminal không hiện bảng coverage

Nguyên nhân:
- mới chỉ chạy lệnh Maven để sinh report
- chưa chạy script PowerShell đọc `jacoco.csv`

Cách xử lý:
1. Chạy JaCoCo:

```powershell
.\mvnw.cmd -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```

2. Chạy tiếp đoạn PowerShell đọc CSV để in bảng coverage

#### Không tìm thấy file `jacoco.csv`

Nguyên nhân:
- chưa chạy JaCoCo
- đang đứng sai thư mục
- build/test chưa chạy xong

Cách xử lý:
- đảm bảo đang ở root backend `ams_be`
- chạy lại lệnh JaCoCo
- kiểm tra file tại:

```text
target/site/jacoco/jacoco.csv
```

#### Terminal chỉ có log test rất dài

Đây là bình thường. Maven đang in log chạy test. Coverage tổng không tự hiện ra nếu chưa đọc CSV bằng PowerShell.

### Tùy chọn: tạo script `coverage.ps1` để dùng lại

Nếu dùng thường xuyên, có thể gom phần PowerShell đọc `jacoco.csv` vào file `coverage.ps1` ở root backend.

Ví dụ workflow:
1. Chạy JaCoCo:

```powershell
.\mvnw.cmd -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```

2. Chạy script:

```powershell
.\coverage.ps1
```

Cách này giúp:
- xem coverage nhanh hơn
- tránh phải paste lại đoạn PowerShell dài
- thuận tiện cho dev/tester/reviewer khi kiểm tra coverage nhiều lần

## 7. Quy ước viết test của dự án

Khi thêm hoặc sửa test, tuân thủ các nguyên tắc sau:
- Chỉ chỉnh trong `src/test/java`
- Không sửa production code trong `src/main/java` để phục vụ test
- Test phải bám đúng code thật hiện có
- Ưu tiên test branch và business logic trước line coverage
- Không viết test giả tạo ngoài flow thực tế của production code
- Không test private method trực tiếp
- Mock dependency đúng phạm vi cần thiết
- Không test framework internals vô nghĩa
- Nếu branch không reachable qua public API mà không sửa production code, phải ghi nhận và bỏ qua
- Khi cần kéo branch coverage, chỉ chọn class có ROI cao nhất từ JaCoCo report thật

## 8. Quy ước đặt tên test

### Tên file test
Quy ước:
```text
<ClassName>Test.java
```

Ví dụ:
- `EmployeeServiceTest.java`
- `AttendanceEmailControllerTest.java`
- `JwtAuthFilterTest.java`

### Tên method test
Ưu tiên đặt theo hành vi thực tế của code.

Có thể dùng các kiểu:
- `methodName_shouldExpectedBehavior_whenCondition`
- `methodNameExpectedBehaviorWhenCondition`
- `businessAction_shouldX_whenY`

Ví dụ tốt:
- `createAccount_shouldThrowWhenUsernameDuplicated`
- `sendAllSkipsRegenerationWhenFlagFalse`
- `generateMonthlySummaryForOneThrowsWhenEmployeeIdIsNull`
- `applyRequestsTurnsAbsentIntoOnLeaveForApprovedLeaveRequest`

Nguyên tắc:
- Tên method phải nói rõ branch đang test
- Đọc tên test là hiểu được input và expected behavior

## 9. Cách thêm test mới

Quy trình khuyến nghị:

### Bước 1: Đọc class cần test
- Mở class trong `src/main/java`
- Xác định public method hoặc flow chính
- Đọc dependency của class

### Bước 2: Xác định branch cần phủ
Tìm các nhánh như:
- `if / else`
- `switch / case`
- ternary
- null / non-null
- blank / non-blank
- empty / non-empty
- found / not found
- valid / invalid
- success / failure
- catch / no-exception
- true / false flag

### Bước 3: Kiểm tra JaCoCo report
- Xác định class còn miss branch thật
- Ưu tiên method còn miss branch cao
- Bỏ qua class ROI thấp nếu có class khác tốt hơn

### Bước 4: Mock dependency
- Dùng Mockito cho repository, service phụ, util phụ
- Chỉ mock đúng dependency cần thiết
- Không mock tràn lan nếu không cần

### Bước 5: Viết test
Ít nhất nên có:
- happy path
- fail path / validation path
- exception path nếu class có catch hoặc throw branch
- true / false branch nếu có flag

### Bước 6: Chạy riêng file test
```bash
./mvnw -Dtest=ClassNameTest test
```

### Bước 7: Đo lại coverage nếu cần
```bash
./mvnw -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```

### Bước 8: Review lại ROI
- Branch nào đã phủ thêm
- Branch nào còn thiếu
- Branch còn lại có reachable hay không
- Có nên tiếp tục class này hay chuyển class khác

## 10. Cách bảo trì test khi code backend thay đổi

Khi backend thay đổi:
- Nếu behavior thay đổi thật, phải cập nhật test tương ứng
- Không sửa test chỉ để “ép pass” sai logic mới
- Nếu method có thêm branch mới, phải bổ sung test branch tương ứng
- Nếu validation thay đổi, cập nhật assertion đúng với behavior mới
- Nếu dependency thay đổi, cập nhật mock theo flow mới
- Nếu coverage tụt, đọc lại JaCoCo report để xác định đúng class và method bị tụt

Nguyên tắc bảo trì:
- Sửa test theo behavior thật
- Không giữ assertion cũ nếu business logic đã đổi
- Không thêm workaround làm test pass nhưng phản ánh sai hệ thống

## 11. Lỗi thường gặp và cách xử lý

### Test fail do mock thiếu
Dấu hiệu:
- `NullPointerException`
- verify không đúng
- service không đi vào branch mong muốn

Cách xử lý:
- Kiểm tra dependency nào chưa mock
- Kiểm tra input test có đủ để đi qua validate hay không
- Kiểm tra `when(...).thenReturn(...)` có đúng argument không

### Test fail do assertion quá chặt với thời gian
Dấu hiệu:
- fail ở `LocalDateTime.now()`
- so sánh timestamp bằng tuyệt đối

Cách xử lý:
- Chỉ assert `not null` hoặc thứ tự thời gian hợp lý
- Tránh assert timestamp chính xác từng nano nếu production dùng `now()`

### Test fail do generated equals/hashCode thay đổi
Dấu hiệu:
- các test model fail sau khi thêm/bớt field

Cách xử lý:
- Cập nhật test branch theo field mới
- Review lại `equals/hashCode` generated path từ JaCoCo hoặc bytecode thực tế

### Test fail do branch không reachable qua public API
Dấu hiệu:
- rất khó dựng data để chạm branch
- branch bị chặn bởi validate trước đó
- chỉ reachable nếu sửa production code

Cách xử lý:
- Ghi nhận rõ lý do
- Bỏ qua branch đó
- Chuyển sang class khác có ROI cao hơn

### JaCoCo không sinh report
Dấu hiệu:
- không có `target/site/jacoco/index.html`

Cách xử lý:
- Chạy đúng lệnh Maven CLI:
```bash
./mvnw -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```
- Kiểm tra test có chạy xong hay không
- Kiểm tra có đang đứng đúng thư mục `ams_be` hay không

### Maven chạy pass nhưng log có stacktrace
Dấu hiệu:
- terminal có stacktrace nhưng build vẫn `PASS`

Cách xử lý:
- Kiểm tra đó có phải branch test exception swallowed hay không
- Nếu test đang verify behavior “bắt exception và không rethrow”, log stacktrace có thể là expected side effect
- Chỉ xử lý khi build fail hoặc behavior không còn đúng

### PowerShell lỗi khi chạy nhiều file với `-Dtest`
Dấu hiệu:
- lỗi parser `Missing argument in parameter list`

Cách xử lý:
- Quote tham số:
```powershell
.\mvnw.cmd "-Dtest=ClassATest,ClassBTest" test
```

## 12. Best practices của project này

- Ưu tiên test `service` và `service.batch` trước
- Controller test nên mỏng, tập trung vào mapping, flag, status, response body
- DTO/entity chỉ test sâu khi có branch thật hoặc cần kéo coverage có ROI cao
- Branch coverage tăng mạnh khi bám đúng `if/else/catch/flag/null path`
- Không cố ép test vào branch không reachable nếu không sửa production code
- Chỉ chọn class tiếp theo dựa trên JaCoCo report thật
- Sau mỗi đợt thêm test, nên chạy lại coverage để xác nhận hiệu quả thực tế
- Khi branch của nhóm business gần trần, có thể mở rộng sang generated `equals/hashCode` nếu mục tiêu coverage yêu cầu

## 13. Cách dùng nhanh nhất

Nếu chỉ cần workflow ngắn gọn:

1. Chạy toàn bộ test
```bash
./mvnw test
```

2. Chạy JaCoCo
```bash
./mvnw -q org.jacoco:jacoco-maven-plugin:0.8.12:prepare-agent test org.jacoco:jacoco-maven-plugin:0.8.12:report
```

3. Mở report
```text
target/site/jacoco/index.html
```

4. Nếu cần thêm test:
- đọc class
- đọc branch miss trong report
- viết test đúng branch còn thiếu
- chạy riêng file test
- đo lại coverage

## 14. Kết luận

Bộ unit test backend hiện tại đã đạt coverage cao:
- Line: `91.52%`
- Instruction: `90.82%`
- Branch: `90.93%`
- Method: `95.54%`
- Class: `100.00%`

Cách sử dụng nhanh nhất là:
- chạy test bằng Maven Wrapper
- đo coverage bằng JaCoCo qua Maven CLI
- đọc report trong `target/site/jacoco`

Khi thêm hoặc chỉnh test, trách nhiệm của người thực hiện là:
- chỉ sửa trong `src/test/java`
- bám đúng behavior thật của backend
- ưu tiên branch/business logic
- dùng JaCoCo report để chọn đúng class cần tối ưu tiếp theo
