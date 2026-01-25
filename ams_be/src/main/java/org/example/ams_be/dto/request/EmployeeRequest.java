package org.example.ams_be.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;

import java.time.LocalDate;

public class EmployeeRequest {

    // Nếu bạn KHÔNG cho đổi employeeCode thì để field này hoặc bỏ luôn.
    public String employeeCode;

    public String fullName;

    @Past(message = "Ngày sinh phải ở quá khứ")
    public LocalDate dob;

    public String gender;

    // @Pattern sẽ bỏ qua null -> OK cho partial update
    @Pattern(regexp = "^0\\d{9}$", message = "Số điện thoại phải bắt đầu bằng 0 và đủ 10 số")
    public String phone;

    // @Email sẽ bỏ qua null -> OK cho partial update
    @Email(message = "Email không đúng định dạng")
    public String email;

    public Long departmentId;
    public Long positionId;
    public Long managerId;
    public LocalDate hireDate;
}
