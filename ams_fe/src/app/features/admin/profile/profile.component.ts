import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { ProfileService } from '../../../core/services/profile.service';
import { ProfileRecord, UpdateProfileRequest } from '../../../shared/models/profile.model';

@Component({
  standalone: false,
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  isEditing = false;
  isLoading = false;
  isSaving = false;
  isUploadingAvatar = false;
  errorMessage = '';
  successMessage = '';
  profile: ProfileRecord | null = null;

  readonly form: FormGroup;

  constructor(
    private readonly profileService: ProfileService,
    private readonly fb: FormBuilder,
    private readonly cdr: ChangeDetectorRef,
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      email: ['', [Validators.email]],
      phone: ['', [this.phoneValidator]],
      gender: [''],
      dob: ['', [this.pastDateValidator]],
    });
  }

  ngOnInit(): void {
    this.loadProfile();
  }

  get avatarLabel(): string {
    const source = this.profile?.fullName || this.profile?.username || 'U';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }

  enableEdit(): void {
    if (!this.profile) {
      return;
    }
    this.isEditing = true;
    this.successMessage = '';
    this.patchForm(this.profile);
  }

  cancelEdit(): void {
    this.isEditing = false;
    this.errorMessage = '';
    this.successMessage = '';
    if (this.profile) {
      this.patchForm(this.profile);
    }
  }

  handleSave(): void {
    if (!this.profile || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const rawValue = this.form.getRawValue();
    const request: UpdateProfileRequest = {
      fullName: this.optionalString(rawValue['fullName']),
      email: this.optionalString(rawValue['email']),
      phone: this.optionalString(rawValue['phone']),
      gender: this.optionalString(rawValue['gender']),
      dob: this.optionalString(rawValue['dob']),
    };

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.updateMyProfile(request)
      .pipe(finalize(() => (this.isSaving = false)))
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.patchForm(profile);
          this.isEditing = false;
          this.successMessage = 'Profile updated successfully.';
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Unable to update profile.';
        },
      });
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (!this.profileService.isAllowedAvatarType(file)) {
      this.errorMessage = `Avatar must be one of: ${this.profileService.getAllowedAvatarTypesLabel()}.`;
      this.successMessage = '';
      if (input) {
        input.value = '';
      }
      return;
    }

    this.isUploadingAvatar = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.profileService.uploadMyAvatar(file)
      .pipe(finalize(() => {
        this.isUploadingAvatar = false;
        if (input) {
          input.value = '';
        }
      }))
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.patchForm(profile);
          this.successMessage = profile.message || 'Avatar uploaded successfully.';
        },
        error: (error) => {
          this.errorMessage = error.error?.message || 'Unable to upload avatar.';
        },
      });
  }

  formatDate(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString();
  }

  formatDateTime(value?: string | null): string {
    if (!value) {
      return '-';
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleString();
  }

  private loadProfile(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.profileService.getMyProfile()
      .pipe(finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (profile) => {
          this.profile = profile;
          this.patchForm(profile);
        },
        error: (error) => {
          this.profile = null;
          this.errorMessage = error.error?.message || 'Unable to load profile.';
        },
      });
  }

  private patchForm(profile: ProfileRecord): void {
    this.form.reset({
      fullName: profile.fullName ?? '',
      email: profile.email ?? '',
      phone: profile.phone ?? '',
      gender: profile.gender ?? '',
      dob: profile.dob ?? '',
    }, { emitEvent: false });
  }

  private optionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') {
      return undefined;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  private phoneValidator(control: AbstractControl): ValidationErrors | null {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return null;
    }

    const digits = raw.replace(/\D+/g, '');
    return /^0\d{9}$/.test(digits) ? null : { phone: true };
  }

  private pastDateValidator(control: AbstractControl): ValidationErrors | null {
    const raw = String(control.value ?? '').trim();
    if (!raw) {
      return null;
    }

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today ? null : { pastDate: true };
  }
}
