import { Component, OnDestroy, OnInit } from '@angular/core';
import { AdminService, BackupRecord, BackupScheduleConfig } from '../admin.service';

type BackupTab = 'backup' | 'restore' | 'schedule';

type BackupTypeLabel = 'full' | 'incremental' | 'manual' | 'differential' | 'partial';

@Component({
  standalone: false,
  selector: 'app-backup-restore',
  templateUrl: './backup-restore.component.html',
  styleUrls: ['./backup-restore.component.scss'],
})
export class BackupRestoreComponent implements OnInit, OnDestroy {
  activeTab: BackupTab = 'backup';
  showCreateBackup = false;
  showRestoreModal = false;
  selectedBackup: BackupRecord | null = null;
  backupInProgress = false;
  backupProgress = 0;
  restoreInProgress = false;
  restoreProgress = 0;
  restoreAcknowledged = false;

  backupList: BackupRecord[] = [];
  scheduleConfig: BackupScheduleConfig = {
    enabled: true,
    frequency: 'daily',
    time: '02:00',
    retention: 30,
    type: 'full',
    compression: true,
    encryption: true,
  };

  manualBackupName = '';
  manualBackupType: 'full' | 'partial' = 'full';
  manualBackupDescription = '';
  manualBackupCompression = true;
  manualBackupEncryption = true;

  tabs: Array<{ id: BackupTab; label: string; icon: string }> = [
    { id: 'backup', label: 'Create Backup', icon: 'database' },
    { id: 'restore', label: 'Restore Data', icon: 'refresh-cw' },
    { id: 'schedule', label: 'Auto Backup', icon: 'calendar' },
  ];

  private backupTimer?: number;
  private restoreTimer?: number;

  constructor(private adminService: AdminService) {}

  ngOnInit(): void {
    this.adminService.getBackupList().subscribe((backups) => {
      this.backupList = backups;
    });

    this.adminService.getBackupSchedule().subscribe((schedule) => {
      this.scheduleConfig = { ...schedule };
    });

    this.resetManualBackupForm();
  }

  ngOnDestroy(): void {
    if (this.backupTimer) {
      window.clearInterval(this.backupTimer);
    }
    if (this.restoreTimer) {
      window.clearInterval(this.restoreTimer);
    }
  }

  openCreateBackup(): void {
    this.resetManualBackupForm();
    this.showCreateBackup = true;
  }

  closeCreateBackup(): void {
    if (this.backupInProgress) {
      return;
    }
    this.showCreateBackup = false;
  }

  openRestoreModal(backup: BackupRecord): void {
    this.selectedBackup = backup;
    this.restoreAcknowledged = false;
    this.showRestoreModal = true;
  }

  closeRestoreModal(): void {
    if (this.restoreInProgress) {
      return;
    }
    this.showRestoreModal = false;
    this.selectedBackup = null;
    this.restoreAcknowledged = false;
  }

  startCreateBackup(): void {
    if (this.backupInProgress) {
      return;
    }
    this.backupInProgress = true;
    this.backupProgress = 0;

    this.backupTimer = window.setInterval(() => {
      this.backupProgress += 10;
      if (this.backupProgress >= 100) {
        window.clearInterval(this.backupTimer);
        this.backupProgress = 100;
        window.setTimeout(() => {
          this.backupInProgress = false;
          this.showCreateBackup = false;
          window.alert('Backup created successfully!');
        }, 500);
      }
    }, 500);
  }

  startRestoreBackup(): void {
    if (!this.selectedBackup || this.restoreInProgress) {
      return;
    }

    this.restoreInProgress = true;
    this.restoreProgress = 0;

    this.restoreTimer = window.setInterval(() => {
      this.restoreProgress += 8;
      if (this.restoreProgress >= 100) {
        window.clearInterval(this.restoreTimer);
        this.restoreProgress = 100;
        window.setTimeout(() => {
          this.restoreInProgress = false;
          this.showRestoreModal = false;
          this.selectedBackup = null;
          window.alert('Data restored successfully!');
        }, 500);
      }
    }, 600);
  }

  showFeatureNotice(): void {
    window.alert('Feature under development');
  }

  getTypeBadgeClasses(type: BackupTypeLabel): string {
    if (type === 'full') {
      return 'bg-blue-100 text-blue-700';
    }
    if (type === 'incremental') {
      return 'bg-purple-100 text-purple-700';
    }
    return 'bg-gray-100 text-gray-700';
  }

  getStatusIcon(status: BackupRecord['status']): string {
    if (status === 'completed') {
      return 'check-circle';
    }
    if (status === 'in-progress') {
      return 'clock';
    }
    return 'alert-circle';
  }

  getStatusText(status: BackupRecord['status']): string {
    if (status === 'completed') {
      return 'Completed';
    }
    if (status === 'in-progress') {
      return 'In Progress';
    }
    return 'Failed';
  }

  getStatusColor(status: BackupRecord['status']): string {
    if (status === 'completed') {
      return 'text-green-600';
    }
    if (status === 'in-progress') {
      return 'text-yellow-600';
    }
    return 'text-red-600';
  }

  private resetManualBackupForm(): void {
    const today = new Date().toISOString().split('T')[0];
    this.manualBackupName = `Manual_Backup_${today}`;
    this.manualBackupType = 'full';
    this.manualBackupDescription = '';
    this.manualBackupCompression = true;
    this.manualBackupEncryption = true;
  }
}
