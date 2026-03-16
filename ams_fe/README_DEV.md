# AMS FE Dev Notes

## API-Ready Stubs (No BE endpoints yet)
These areas use local state/mock data or no-op handlers, without changing UI. Replace with real API calls when endpoints are available.

- Dashboard widgets (live pulse, exceptions, trends)
- Settings tabs (general, notifications, security, integrations, advanced)
- Profile (personal/work info, activity log, security modals)
- Attendance: scheduling, time calculation, leave management, OT requests
- Payroll: formula, review, periods, tax configuration
- Reports: standard, custom
- Admin: audit log, backup & restore
- HRM: employee portal, contracts, org chart, performance review, onboarding

## Known Constraints
- Employees screen is locked (do not modify UI/logic).
- No UI-visible placeholders or API status text is allowed.

## Pending Migrations
- Replace remaining placeholder screens with full UI from source (React UI folder).
- Add full icon coverage to all migrated screens as needed.
