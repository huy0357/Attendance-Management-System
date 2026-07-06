import React from 'react';
import { FileBarChart } from 'lucide-react';

const MonthlySummaryPage: React.FC = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', padding: 'var(--nm-space-6)', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', marginBottom: '24px', border: '5px solid var(--nm-surface)', borderRadius: '50%', background: 'var(--nm-surface-deep)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--nm-primary)', boxShadow: 'var(--nm-shadow-in)' }}>
        <FileBarChart style={{ width: '32px', height: '32px' }} />
      </div>
      <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 'var(--fw-bold)', color: 'var(--nm-text)', marginBottom: '8px', fontFamily: 'var(--font-primary)' }}>Monthly Summary</h1>
      <p style={{ fontSize: 'var(--fs-md)', color: 'var(--nm-text-secondary)', marginBottom: '32px', maxWidth: '400px', fontWeight: 'var(--fw-semibold)' }}>
        Comprehensive monthly attendance reporting features will be available in a future update.
      </p>
      <div style={{ padding: '8px 16px', background: 'var(--nm-surface)', color: 'var(--nm-primary)', borderRadius: 'var(--nm-radius-full)', fontWeight: 'var(--fw-bold)', boxShadow: 'var(--nm-shadow-out)' }}>
        Coming Soon
      </div>
    </div>
  );
};

export default MonthlySummaryPage;
