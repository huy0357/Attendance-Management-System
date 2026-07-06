import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { reportsApi } from './reports.api';
import { Calendar, DollarSign, Users, Database, FileText, Play, AlertCircle, Loader2 } from 'lucide-react';
import styles from './ReportsPage.module.scss';
import clsx from 'clsx';

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'calendar': return <Calendar className="w-8 h-8 text-blue-500" />;
    case 'dollar': return <DollarSign className="w-8 h-8 text-green-500" />;
    case 'users': return <Users className="w-8 h-8 text-purple-500" />;
    case 'database': return <Database className="w-8 h-8 text-gray-500" />;
    default: return <FileText className="w-8 h-8 text-gray-500" />;
  }
};

const ReportsPage: React.FC = () => {
  const [downloadMsg, setDownloadMsg] = useState('');

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports_templates'],
    queryFn: () => reportsApi.getReportTemplates()
  });

  const generateMutation = useMutation({
    mutationFn: (id: string) => reportsApi.generateReport(id),
    onSuccess: (res, id) => {
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDownloadMsg(`Successfully generated report ${id}`);
      setTimeout(() => setDownloadMsg(''), 3000);
    }
  });

  // Route is already protected by RoleRoute allowedRoles={['ADMIN']} in AppRouter
  // No inline access check needed

  return (
    <div className={styles.pageContainer}>
      {/* HEADER */}
      <div className={styles.header}>
        <h1>Reports Console</h1>
        <p>Generate, schedule, and export system reports.</p>
      </div>

      <div className={styles.alertBox}>
        <AlertCircle className={clsx(styles.alertIcon, "w-6 h-6 shrink-0")} />
        <div>
           <h3>Module Under Development</h3>
           <p>Report generation is using mocked definitions without real backend queries. File exports will yield dummy CSVs.</p>
        </div>
      </div>

      {downloadMsg && (
        <div className={styles.successBox}>
           {downloadMsg}
        </div>
      )}

      {/* REPORTS LISTING */}
      <div className={styles.dataVizWrapper}>
        <div className={styles.reportsGrid}>
           {isLoading ? (
              <div className="col-span-full py-12 text-center text-gray-500">Loading templates...</div>
           ) : reports.map(r => (
              <div key={r.id} className={styles.reportCard}>
                 
                 <div className={styles.cardHeader}>
                    <div className={styles.iconWrapper}>
                       {getIcon(r.icon)}
                    </div>
                    <div className={styles.cardInfo}>
                       <h3 className={styles.title}>{r.name}</h3>
                       <span className={styles.idBadge}>{r.id}</span>
                    </div>
                 </div>
                 
                 <p className={styles.desc}>{r.description}</p>
                 
                 <div className={styles.footer}>
                    <div className={styles.lastRun}>
                       {r.lastRun ? `Last run: ${new Date(r.lastRun).toLocaleDateString()}` : 'Never run'}
                    </div>
                    <button 
                       onClick={() => generateMutation.mutate(r.id)}
                       disabled={generateMutation.isPending && generateMutation.variables === r.id}
                       className={styles.runBtn}
                    >
                       {generateMutation.isPending && generateMutation.variables === r.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                       ) : (
                          <Play className="w-4 h-4" />
                       )}
                       Run
                    </button>
                 </div>
              </div>
           ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;
