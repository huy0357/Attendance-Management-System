import React from 'react';
import { CalendarDays } from 'lucide-react';

const MySchedulePage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 'var(--nm-space-6)', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', marginBottom: '24px', borderRadius: 'var(--nm-radius-xl)', background: 'var(--nm-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-warning)', boxShadow: 'var(--nm-shadow-out)' }}>
        <CalendarDays style={{ width: '40px', height: '40px' }} />
      </div>
      <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 'var(--fw-bold)', color: 'var(--nm-text)', marginBottom: '8px', fontFamily: 'var(--font-primary)' }}>My Work Schedule</h1>
      <p style={{ fontSize: 'var(--fs-md)', color: 'var(--nm-text-secondary)', marginBottom: '32px', maxWidth: '400px', fontWeight: 'var(--fw-semibold)' }}>
        View your assigned shifts and weekly schedule. This self-service feature is coming soon.
      </p>
      <div style={{ padding: '8px 16px', background: 'var(--nm-surface)', color: 'var(--nm-warning)', borderRadius: 'var(--nm-radius-md)', fontWeight: 'var(--fw-bold)', boxShadow: 'inset 0 0 0 2px var(--nm-warning)' }}>
        Coming Soon
      </div>
    </div>
  );
};

export default MySchedulePage;
