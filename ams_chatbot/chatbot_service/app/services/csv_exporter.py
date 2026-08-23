from __future__ import annotations

import csv
import logging
import os
import uuid
from pathlib import Path

logger = logging.getLogger(__name__)

EXPORTS_DIR = Path(__file__).resolve().parent.parent.parent / "exports"
EXPORTS_DIR.mkdir(exist_ok=True)


class CsvExporter:
    """Generate CSV files from API data and return the file path."""

    @staticmethod
    def _write_csv(rows: list[dict], headers: list[str], filename_prefix: str) -> str:
        """Write rows to CSV and return the filename."""
        filename = f"{filename_prefix}_{uuid.uuid4().hex[:8]}.csv"
        filepath = EXPORTS_DIR / filename
        with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=headers, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
        logger.info("CSV exported: %s (%d rows)", filepath, len(rows))
        return filename

    @classmethod
    def export_attendance_monthly(cls, data: list[dict], month: str = "", employee_name: str = "") -> str:
        """Export attendance data to CSV. Returns filename."""
        headers = ["Ngày", "Họ và tên", "Giờ vào (Check-in)", "Giờ ra (Check-out)", "Trạng thái"]
        formatted_rows = []
        for r in data:
            cin = str(r.get("check_in") or r.get("firstInTime") or "")
            if "T" in cin:
                cin = cin.split("T")[1][:8]
            cout = str(r.get("check_out") or r.get("lastOutTime") or "")
            if "T" in cout:
                cout = cout.split("T")[1][:8]

            formatted_rows.append({
                "Ngày": r.get("date") or r.get("workDate") or "",
                "Họ và tên": r.get("employee_name") or r.get("employeeName") or employee_name or "N/A",
                "Giờ vào (Check-in)": cin or "-",
                "Giờ ra (Check-out)": cout or "-",
                "Trạng thái": r.get("status") or "ABSENT"
            })

        prefix = f"attendance_daily_{month}" if month else "attendance_daily"
        return cls._write_csv(formatted_rows, headers, prefix)

    @classmethod
    def export_employee_list(cls, data: list[dict]) -> str:
        """Export employee list to CSV. Returns filename."""
        headers = [
            "employeeId", "employeeCode", "fullName", "email",
            "phone", "departmentName", "status", "hireDate",
        ]
        # Normalize key names (Java API uses camelCase)
        normalized = []
        for emp in data:
            normalized.append({
                "employeeId": emp.get("employeeId") or emp.get("employee_id", ""),
                "employeeCode": emp.get("employeeCode") or emp.get("employee_code", ""),
                "fullName": emp.get("fullName") or emp.get("full_name", ""),
                "email": emp.get("email", ""),
                "phone": emp.get("phone", ""),
                "departmentName": emp.get("departmentName") or emp.get("department_name", ""),
                "status": emp.get("status", ""),
                "hireDate": emp.get("hireDate") or emp.get("hire_date", ""),
            })
        return cls._write_csv(normalized, headers, "employees")

    @classmethod
    def export_requests(cls, items: list[dict]) -> str:
        """Export requests list to CSV. Returns filename."""
        headers = [
            "requestId", "requestType", "status", "employeeName",
            "submittedAt", "reason", "fromDate", "toDate",
        ]
        normalized = []
        for req in items:
            normalized.append({
                "requestId": req.get("requestId") or req.get("id", ""),
                "requestType": req.get("requestType") or req.get("type", ""),
                "status": req.get("status", ""),
                "employeeName": req.get("employeeName") or req.get("employee_name", ""),
                "submittedAt": req.get("submittedAt") or req.get("submitted_at", ""),
                "reason": req.get("reason", ""),
                "fromDate": req.get("fromDate") or req.get("from_date", ""),
                "toDate": req.get("toDate") or req.get("to_date", ""),
            })
        return cls._write_csv(normalized, headers, "requests")

    @classmethod
    def cleanup_old_files(cls, max_age_seconds: int = 3600) -> int:
        """Remove export files older than max_age_seconds. Returns count removed."""
        import time
        removed = 0
        now = time.time()
        for f in EXPORTS_DIR.iterdir():
            if f.is_file() and f.suffix == ".csv":
                age = now - f.stat().st_mtime
                if age > max_age_seconds:
                    f.unlink()
                    removed += 1
        return removed
