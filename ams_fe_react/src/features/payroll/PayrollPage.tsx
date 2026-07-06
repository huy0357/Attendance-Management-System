import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../core/auth/AuthContext';
import { DollarSign, Clock, TrendingUp, Download, Settings, Calculator, AlertCircle } from 'lucide-react';
import { payrollApi } from './payroll.api';
import styles from './PayrollPage.module.scss';
import clsx from 'clsx';

const PayrollPage: React.FC = () => {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['payroll'],
    queryFn: () => payrollApi.getPayrollRecords()
  });

  const generateStatusBadge = (status: string) => {
    switch (status) {
       case 'paid': return <span className={clsx(styles.statusBadge, styles.paid)}>Paid</span>;
       case 'pending': return <span className={clsx(styles.statusBadge, styles.pending)}>Pending</span>;
       case 'processing': return <span className={clsx(styles.statusBadge, styles.processing)}>Processing</span>;
       default: return <span className={clsx(styles.statusBadge, styles.default)}>{status}</span>;
    }
  };

  return (
    <div className={styles.pageContainer}>
      {/* HEADER */}
      <div className={styles.header}>
        <div>
          <h1>Payroll Management</h1>
          <p>Review payroll history, taxes, and deduction records.</p>
        </div>
        {isAdmin && (
          <div className={styles.actions}>
             <button className={styles.actionButton}>
               <Settings className="w-4 h-4" /> Config
             </button>
             <button className={clsx(styles.actionButton, styles.primary)}>
               <Calculator className="w-4 h-4" /> Run Payroll
             </button>
          </div>
        )}
      </div>

      <div className={styles.alertBox}>
        <AlertCircle className={clsx(styles.alertIcon, "w-6 h-6 shrink-0")} />
        <div>
           <h3>Module Under Development</h3>
           <p>The Payroll module is currently displaying mocked data and simulating delays as the backend API is still under construction.</p>
        </div>
      </div>

      {/* STATS */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={clsx(styles.iconWrapper, styles.blue)}><DollarSign className="h-6 w-6"/></div>
          <div className={styles.statInfo}><p className={styles.statLabel}>Avg Base Salary</p><h3 className={styles.statValue}>$7,083</h3></div>
        </div>
        <div className={styles.statCard}>
          <div className={clsx(styles.iconWrapper, styles.green)}><TrendingUp className="h-6 w-6"/></div>
          <div className={styles.statInfo}><p className={styles.statLabel}>Total Bonuses (YTD)</p><h3 className={styles.statValue}>$1,500</h3></div>
        </div>
        <div className={styles.statCard}>
          <div className={clsx(styles.iconWrapper, styles.purple)}><Clock className="h-6 w-6"/></div>
          <div className={styles.statInfo}><p className={styles.statLabel}>Avg Overtime Pay</p><h3 className={styles.statValue}>$325</h3></div>
        </div>
      </div>

      {/* TABLE */}
      <div className={styles.tableWrapper}>
        <h2 className={styles.tableTitle}>Recent Payroll Records</h2>
        
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Period</th>
                <th>Base Salary</th>
                <th>OT & Bonus</th>
                <th>Taxes & Deds</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">Fetching payroll data...</td></tr>
              ) : records.map(p => (
                <tr key={p.id}>
                  <td className={styles.period}>{p.period}</td>
                  <td className={clsx(styles.monoNum, styles.neutral)}>${p.baseSalary.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className={clsx(styles.monoNum, styles.positive)}>+${(p.overtime + p.bonus).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className={clsx(styles.monoNum, styles.negative)}>-${(p.tax + p.deductions).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className={clsx(styles.monoNum, styles.bold)}>${p.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td>{generateStatusBadge(p.status)}</td>
                  <td style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className={styles.actionIconBtn} title="Download Payslip">
                       <Download className="w-4 h-4"/>
                    </button>
                  </td>
                </tr>
              ))}
              {!isLoading && records.length === 0 && (
                <tr><td colSpan={7} className="text-center py-12 text-gray-500">No payroll records found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;
