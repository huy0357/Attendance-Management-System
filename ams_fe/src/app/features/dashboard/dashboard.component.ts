import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { UiStateService, Density } from '../../core/layout/ui-state.service';

interface LiveEntry {
  id: string;
  name: string;
  avatar: string;
  time: string;
  location: string;
  status: 'on-time' | 'late';
  timestamp: number;
}

interface ExceptionItem {
  id: string;
  name: string;
  type: 'absent' | 'leave-pending' | 'spoofing';
  details: string;
  avatar: string;
}

@Component({
  standalone: false,
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  density: Density = 'comfortable';
  showExportModal = false;
  exportType: 'csv' | 'pdf' = 'csv';
  refreshing = false;
  selectedTimeRange = 'Today';

  liveEntries: LiveEntry[] = [
    {
      id: '1',
      name: 'Sarah Chen',
      avatar: 'SC',
      time: '08:58:42',
      location: 'HQ Main',
      status: 'on-time',
      timestamp: Date.now() - 5000,
    },
    {
      id: '2',
      name: 'Michael Ross',
      avatar: 'MR',
      time: '09:02:15',
      location: 'Branch-02',
      status: 'late',
      timestamp: Date.now() - 10000,
    },
    {
      id: '3',
      name: 'Emma Wilson',
      avatar: 'EW',
      time: '08:55:30',
      location: 'HQ Main',
      status: 'on-time',
      timestamp: Date.now() - 15000,
    },
  ];

  exceptions: ExceptionItem[] = [
    { id: '1', name: 'John Martinez', type: 'absent', details: 'No check-in, no leave request', avatar: 'JM' },
    { id: '2', name: 'Lisa Wong', type: 'leave-pending', details: 'Personal leave - 3 days', avatar: 'LW' },
    { id: '3', name: 'David Kumar', type: 'spoofing', details: 'Anti-spoofing triggered at 08:45', avatar: 'DK' },
  ];

  private intervalId?: number;
  private densitySub?: Subscription;

  constructor(private uiState: UiStateService) {
    this.density = this.uiState.getDensity();
  }

  ngOnInit(): void {
    this.intervalId = window.setInterval(() => {
      const names = ['Alex Thompson', 'Maria Garcia', 'James Kim', 'Sophie Anderson', 'Ryan Patel'];
      const locations = ['HQ Main', 'Branch-02', 'Branch-03', 'Remote Office'];
      const name = names[Math.floor(Math.random() * names.length)];

      const newEntry: LiveEntry = {
        id: Date.now().toString(),
        name,
        avatar: name
          .split(' ')
          .map(n => n[0])
          .join(''),
        time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        location: locations[Math.floor(Math.random() * locations.length)],
        status: Math.random() > 0.3 ? 'on-time' : 'late',
        timestamp: Date.now(),
      };

      this.liveEntries = [newEntry, ...this.liveEntries].slice(0, 10);
    }, 8000);

    this.densitySub = this.uiState.density$.subscribe(density => {
      this.density = density;
    });
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    this.densitySub?.unsubscribe();
  }

  handleExport(type: 'csv' | 'pdf'): void {
    this.exportType = type;
    this.showExportModal = true;
  }

  confirmExport(): void {
    alert(`Exporting data as ${this.exportType.toUpperCase()}...`);
    this.showExportModal = false;
  }

  handleRefresh(): void {
    this.refreshing = true;
    setTimeout(() => (this.refreshing = false), 1000);
  }

  get cardPadding(): string {
    return this.density === 'compact' ? 'p-4' : this.density === 'spacious' ? 'p-8' : 'p-6';
  }

  get textSize(): string {
    return this.density === 'compact' ? 'text-sm' : this.density === 'spacious' ? 'text-lg' : 'text-base';
  }
}
