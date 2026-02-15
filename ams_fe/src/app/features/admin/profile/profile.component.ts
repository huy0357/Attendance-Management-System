import { Component } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent {
  isEditing = false;
  saveStatus: 'idle' | 'saving' | 'saved' = 'idle';
  showPasswordModal = false;
  show2FAModal = false;
  showSessionModal = false;

  activityLog = [
    { action: 'Updated payroll formula', time: '2 hours ago', type: 'edit' },
    { action: 'Approved 5 payslips', time: '3 hours ago', type: 'approval' },
    { action: 'Generated attendance report', time: '5 hours ago', type: 'report' },
    { action: 'Modified shift schedule', time: '1 day ago', type: 'edit' },
    { action: 'Logged in from Chrome on Windows', time: '1 day ago', type: 'login' },
  ];

  handleSave(): void {
    this.saveStatus = 'saving';
    setTimeout(() => {
      this.saveStatus = 'saved';
      this.isEditing = false;
      setTimeout(() => (this.saveStatus = 'idle'), 2000);
    }, 1000);
  }

  handlePasswordChange(): void {
    alert('Password updated successfully!');
    this.showPasswordModal = false;
  }

  handleRevokeSession(sessionName: string): void {
    alert(`Session "${sessionName}" has been revoked.`);
  }
}
