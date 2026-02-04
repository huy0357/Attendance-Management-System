# AMS FE

## Requirements
- Node.js 18+
- Angular CLI 17

## Install
```bash
npm install
```

## Run
```bash
npm start
```

App runs at `http://localhost:4200`.

## API config
Base URL is configured in `ams_fe/src/app/core/services/api.service.ts`:
```ts
private readonly baseUrl = 'http://localhost:8080/api';
```

## Notes
- Employee endpoints use `/api/employees`, `/api/employees/page`, `/api/employees/search`.
- Auth uses Bearer token from `localStorage` (`access_token`).
