import { Component } from '@angular/core';

type SettingsTab = 'general' | 'notifications' | 'security' | 'integrations' | 'advanced';

@Component({
  standalone: false,
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  activeTab: SettingsTab = 'general';
  saveStatus: 'idle' | 'saving' | 'saved' = 'idle';
  darkMode = false;
  language = 'en';
  autoSaveEnabled = true;
  autoSaveInterval = 30;

  tabs: Array<{ id: SettingsTab; name: string; icon: string }> = [
    { id: 'general', name: 'General', icon: 'settings' },
    { id: 'notifications', name: 'Notifications', icon: 'bell' },
    { id: 'security', name: 'Security', icon: 'shield' },
    { id: 'integrations', name: 'Integrations', icon: 'globe' },
    { id: 'advanced', name: 'Advanced', icon: 'zap' },
  ];

  handleSave(): void {
    if (this.saveStatus !== 'idle') {
      return;
    }
    this.saveStatus = 'saving';
    setTimeout(() => {
      this.saveStatus = 'saved';
      setTimeout(() => (this.saveStatus = 'idle'), 2000);
    }, 1000);
  }
}
