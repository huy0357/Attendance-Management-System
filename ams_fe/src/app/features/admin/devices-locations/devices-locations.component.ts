import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  AdminService,
  DeviceRecord,
  DeviceStatus,
  DeviceType,
  LocationRecord,
} from '../admin.service';

type DevicesTab = 'locations' | 'devices';

@Component({
  standalone: false,
  selector: 'app-devices-locations',
  templateUrl: './devices-locations.component.html',
  styleUrls: ['./devices-locations.component.scss'],
})
export class DevicesLocationsComponent implements OnInit {
  activeTab: DevicesTab = 'locations';
  showAddLocationModal = false;
  showAddDeviceModal = false;
  showDetailsModal = false;
  showDeleteModal = false;

  selectedLocation: LocationRecord | null = null;
  selectedDevice: DeviceRecord | null = null;

  locations: LocationRecord[] = [];
  devices: DeviceRecord[] = [];

  newLocationForm: FormGroup;
  newDeviceForm: FormGroup;

  readonly timezones = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
  ];

  readonly deviceTypeOptions: Array<{ value: DeviceType; label: string }> = [
    { value: 'face-recognition', label: 'Face Recognition' },
    { value: 'fingerprint', label: 'Fingerprint Scanner' },
    { value: 'card-reader', label: 'Card Reader' },
    { value: 'mobile-app', label: 'Mobile App' },
  ];

  constructor(private adminService: AdminService, private fb: FormBuilder) {
    this.newLocationForm = this.fb.group({
      name: ['', Validators.required],
      address: ['', Validators.required],
      latitude: ['', Validators.required],
      longitude: ['', Validators.required],
      radius: ['', Validators.required],
      timezone: ['America/Los_Angeles', Validators.required],
    });

    this.newDeviceForm = this.fb.group({
      name: ['', Validators.required],
      deviceType: ['face-recognition', Validators.required],
      locationId: ['', Validators.required],
      ipAddress: [''],
      macAddress: [''],
      firmware: [''],
    });
  }

  ngOnInit(): void {
    this.adminService.getLocations().subscribe((locations) => {
      this.locations = locations;
    });

    this.adminService.getDevices().subscribe((devices) => {
      this.devices = devices;
    });
  }

  get stats(): Array<{ label: string; value: number; color: string; bg: string; icon: string }> {
    return [
      {
        label: 'Total Locations',
        value: this.locations.length,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        icon: 'map-pin',
      },
      {
        label: 'Active Locations',
        value: this.locations.filter((location) => location.enabled).length,
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: 'check-circle',
      },
      {
        label: 'Total Devices',
        value: this.devices.length,
        color: 'text-purple-600',
        bg: 'bg-purple-50',
        icon: 'smartphone',
      },
      {
        label: 'Online Devices',
        value: this.devices.filter((device) => device.status === 'online').length,
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: 'wifi',
      },
    ];
  }

  get offlineDeviceCount(): number {
    return this.devices.filter((device) => device.status === 'offline').length;
  }

  get enabledLocations(): LocationRecord[] {
    return this.locations.filter((location) => location.enabled);
  }

  openAddLocationModal(): void {
    this.newLocationForm.reset({
      name: '',
      address: '',
      latitude: '',
      longitude: '',
      radius: '',
      timezone: 'America/Los_Angeles',
    });
    this.showAddLocationModal = true;
  }

  openAddDeviceModal(): void {
    this.newDeviceForm.reset({
      name: '',
      deviceType: 'face-recognition',
      locationId: '',
      ipAddress: '',
      macAddress: '',
      firmware: '',
    });
    this.showAddDeviceModal = true;
  }

  openDetails(location: LocationRecord): void {
    this.selectedLocation = location;
    this.showDetailsModal = true;
  }

  openDeleteLocation(location: LocationRecord): void {
    this.selectedLocation = location;
    this.selectedDevice = null;
    this.showDeleteModal = true;
  }

  openDeleteDevice(device: DeviceRecord): void {
    this.selectedDevice = device;
    this.selectedLocation = null;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedLocation = null;
    this.selectedDevice = null;
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedLocation = null;
  }

  addLocation(): void {
    if (this.newLocationForm.invalid) {
      return;
    }

    const value = this.newLocationForm.value as {
      name: string;
      address: string;
      latitude: string;
      longitude: string;
      radius: string;
      timezone: string;
    };

    const location: LocationRecord = {
      id: `LOC-${String(this.locations.length + 1).padStart(3, '0')}`,
      name: value.name,
      address: value.address,
      latitude: parseFloat(value.latitude),
      longitude: parseFloat(value.longitude),
      radius: parseInt(value.radius, 10),
      timezone: value.timezone,
      enabled: true,
      devices: 0,
    };

    this.locations = [...this.locations, location];
    this.showAddLocationModal = false;
  }

  addDevice(): void {
    if (this.newDeviceForm.invalid) {
      return;
    }

    const value = this.newDeviceForm.value as {
      name: string;
      deviceType: DeviceType;
      locationId: string;
      ipAddress: string;
      macAddress: string;
      firmware: string;
    };

    const locationName = this.locations.find((loc) => loc.id === value.locationId)?.name ?? '';

    const device: DeviceRecord = {
      id: `DEV-${String(this.devices.length + 1).padStart(3, '0')}`,
      name: value.name,
      deviceType: value.deviceType,
      locationId: value.locationId,
      locationName,
      ipAddress: value.ipAddress || 'N/A',
      macAddress: value.macAddress || 'N/A',
      status: 'offline',
      lastSeen: new Date().toISOString().replace('T', ' ').substring(0, 19),
      firmware: value.firmware,
      enabled: true,
    };

    this.devices = [...this.devices, device];
    this.locations = this.locations.map((location) =>
      location.id === value.locationId ? { ...location, devices: location.devices + 1 } : location,
    );

    this.showAddDeviceModal = false;
  }

  deleteSelected(): void {
    if (this.selectedLocation) {
      this.locations = this.locations.filter((location) => location.id !== this.selectedLocation?.id);
      this.closeDeleteModal();
      return;
    }

    if (this.selectedDevice) {
      this.devices = this.devices.filter((device) => device.id !== this.selectedDevice?.id);
      this.locations = this.locations.map((location) =>
        location.id === this.selectedDevice?.locationId
          ? { ...location, devices: Math.max(0, location.devices - 1) }
          : location,
      );
      this.closeDeleteModal();
    }
  }

  toggleLocationStatus(id: string): void {
    this.locations = this.locations.map((location) =>
      location.id === id ? { ...location, enabled: !location.enabled } : location,
    );
  }

  toggleDeviceStatus(id: string): void {
    this.devices = this.devices.map((device) =>
      device.id === id ? { ...device, enabled: !device.enabled } : device,
    );
  }

  getStatusBadgeClasses(status: DeviceStatus): string {
    const styles: Record<DeviceStatus, string> = {
      online: 'bg-green-100 text-green-700 border-green-300',
      offline: 'bg-red-100 text-red-700 border-red-300',
      maintenance: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    };

    return styles[status];
  }

  getStatusIcon(status: DeviceStatus): string {
    const icons: Record<DeviceStatus, string> = {
      online: 'wifi',
      offline: 'wifi-off',
      maintenance: 'alert-triangle',
    };

    return icons[status];
  }

  getStatusLabel(status: DeviceStatus): string {
    const labels: Record<DeviceStatus, string> = {
      online: 'Online',
      offline: 'Offline',
      maintenance: 'Maintenance',
    };

    return labels[status];
  }

  getDeviceTypeBadgeClasses(type: DeviceType): string {
    const styles: Record<DeviceType, string> = {
      'face-recognition': 'bg-blue-100 text-blue-700 border-blue-300',
      fingerprint: 'bg-purple-100 text-purple-700 border-purple-300',
      'card-reader': 'bg-green-100 text-green-700 border-green-300',
      'mobile-app': 'bg-orange-100 text-orange-700 border-orange-300',
    };

    return styles[type];
  }

  getDeviceTypeLabel(type: DeviceType): string {
    const labels: Record<DeviceType, string> = {
      'face-recognition': 'Face Recognition',
      fingerprint: 'Fingerprint',
      'card-reader': 'Card Reader',
      'mobile-app': 'Mobile App',
    };

    return labels[type];
  }
}
