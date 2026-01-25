package org.example.ams_be.dto.request;


public class PageRequestDto {
    public Integer page;     // 1-based
    public Integer size;
    public String sortBy;    // vd: "employee_id", "created_at"
    public String sortDir;   // "asc" | "desc"
}
