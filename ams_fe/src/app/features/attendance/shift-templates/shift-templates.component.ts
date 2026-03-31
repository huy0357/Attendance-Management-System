import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { AttendanceService, ShiftTemplateResponse, ShiftTemplateUpsertPayload } from '../attendance.service';
import { BehaviorSubject, combineLatest, of } from 'rxjs';
import { Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, startWith, switchMap, takeUntil, tap } from 'rxjs/operators';
import { AuthService } from '../../../core/auth/auth.service';

type EditMode = 'create' | 'edit';

@Component({
  standalone: false,
  selector: 'app-shift-templates',
  templateUrl: './shift-templates.component.html',
  styleUrls: ['./shift-templates.component.scss'],
})
export class ShiftTemplatesComponent implements OnInit, OnDestroy {
  templates: ShiftTemplateResponse[] = [];
  isLoading = false;
  errorMessage: string | null = null;

  // BehaviorSubject emits immediately on subscribe — no startWith needed
  private readonly refresh$ = new BehaviorSubject<void>(undefined);
  private readonly destroy$ = new Subject<void>();

  filterForm: FormGroup;
  form: FormGroup;

  showForm = false;
  mode: EditMode = 'create';
  selectedId: number | null = null;

  isDeleteModalOpen = false;
  templateToDelete: ShiftTemplateResponse | null = null;
  isDeleting = false;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.filterForm = this.fb.group({
      q: [''],
      active: [''],
    });

    this.form = this.fb.group({
      shiftCode: ['', [Validators.required, Validators.maxLength(50), this.trimmedRequiredValidator()]],
      shiftName: ['', [Validators.required, Validators.maxLength(255), this.trimmedRequiredValidator()]],
      startTime: ['', Validators.required],
      endTime: ['', Validators.required],
      breakMinutes: [0, [Validators.required, Validators.min(0)]],
      graceInMinutes: [0, [Validators.required, Validators.min(0)]],
      graceOutMinutes: [0, [Validators.required, Validators.min(0)]],
      isNightShift: [false, Validators.required],
      minWorkMinutes: [1, [Validators.required, Validators.min(1)]],
      isActive: [true, Validators.required],
    }, { validators: this.shiftTimeRulesValidator() });
  }

  get totalTemplates(): number {
    return this.templates.length;
  }

  get activeCount(): number {
    return this.templates.filter(template => template.isActive).length;
  }

  get inactiveCount(): number {
    return this.templates.filter(template => !template.isActive).length;
  }

  get canManageShiftTemplates(): boolean {
    return this.authService.hasAnyRole(['ADMIN', 'HR', 'MANAGER']);
  }

  ngOnInit(): void {
    const qControl = this.filterForm.get('q');
    // FIX: debounceTime AFTER valueChanges but BEFORE startWith so the INITIAL
    // emission from startWith is NOT debounced — combineLatest fires immediately.
    const q$ = qControl
      ? qControl.valueChanges.pipe(
        debounceTime(400),
        startWith(qControl.value ?? ''),
        distinctUntilChanged(),
      )
      : of('');

    const activeControl = this.filterForm.get('active');
    const active$ = activeControl
      ? activeControl.valueChanges.pipe(
        startWith(activeControl.value ?? ''),
        distinctUntilChanged(),
      )
      : of('');

    // refresh$ is BehaviorSubject — emits undefined immediately on subscribe
    combineLatest([q$, active$, this.refresh$])
      .pipe(
        // Set loading BEFORE switchMap so Angular CD picks it up in the same tick
        tap(() => {
          this.isLoading = true;
          this.errorMessage = null;
          this.cdr.markForCheck();
        }),
        switchMap(([q, active]) => {
          const activeParam = active === '' ? undefined : active === 'true';
          return this.attendanceService.getShiftTemplates(activeParam, q || undefined).pipe(
            catchError(() => {
              this.errorMessage = 'Unable to load shift templates.';
              return of([] as ShiftTemplateResponse[]);
            }),
            finalize(() => {
              this.isLoading = false;
              this.cdr.markForCheck();
            }),
          );
        }),
        takeUntil(this.destroy$),
      )
      .subscribe((data) => {
        this.templates = data;
        this.cdr.markForCheck();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTemplates(): void {
    this.refresh$.next();
  }

  openCreate(): void {
    this.mode = 'create';
    this.selectedId = null;
    this.errorMessage = null;
    this.form.reset({
      shiftCode: '',
      shiftName: '',
      startTime: '',
      endTime: '',
      breakMinutes: 0,
      graceInMinutes: 0,
      graceOutMinutes: 0,
      isNightShift: false,
      minWorkMinutes: 1,
      isActive: true,
    });
    this.showForm = true;
  }

  openEdit(id: number): void {
    this.mode = 'edit';
    this.selectedId = id;
    this.errorMessage = null;
    this.attendanceService.getShiftTemplateById(id).subscribe({
      next: (data) => {
        this.form.reset({
          shiftCode: data.shiftCode,
          shiftName: data.shiftName,
          startTime: this.toTimeInput(data.startTime),
          endTime: this.toTimeInput(data.endTime),
          breakMinutes: data.breakMinutes,
          graceInMinutes: data.graceInMinutes,
          graceOutMinutes: data.graceOutMinutes,
          isNightShift: data.isNightShift,
          minWorkMinutes: data.minWorkMinutes,
          isActive: data.isActive,
        });
        this.showForm = true;
        this.errorMessage = null;
        this.cdr.markForCheck();
      },
      error: () => {
        this.errorMessage = 'Unable to load shift template.';
        this.cdr.markForCheck();
      },
    });
  }

  cancelForm(): void {
    this.showForm = false;
  }

  submitForm(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const payload = this.buildPayload();
    if (this.mode === 'create') {
      this.attendanceService.createShiftTemplate(payload).subscribe({
        next: () => {
          this.showForm = false;
          this.errorMessage = null;
          this.loadTemplates();
        },
        error: (error: HttpErrorResponse) => {
          this.errorMessage = this.extractErrorMessage(error, 'Unable to create shift template.');
          this.cdr.markForCheck();
        },
      });
      return;
    }

    if (!this.selectedId) return;
    this.attendanceService.updateShiftTemplate(this.selectedId, payload).subscribe({
      next: () => {
        this.showForm = false;
        this.errorMessage = null;
        this.loadTemplates();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'Unable to update shift template.');
        this.cdr.markForCheck();
      },
    });
  }

  toggleActive(template: ShiftTemplateResponse, active: boolean): void {
    this.attendanceService.setShiftTemplateActive(template.shiftId, active).subscribe({
      next: () => {
        this.errorMessage = null;
        this.loadTemplates();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'Unable to update active status.');
        this.cdr.markForCheck();
      },
    });
  }

  openDeleteModal(template: ShiftTemplateResponse): void {
    this.templateToDelete = template;
    this.isDeleteModalOpen = true;
  }

  cancelDelete(): void {
    this.isDeleteModalOpen = false;
    this.templateToDelete = null;
  }

  confirmDelete(): void {
    if (!this.templateToDelete) return;
    this.isDeleting = true;
    const deletedId = this.templateToDelete.shiftId;
    this.attendanceService.deleteShiftTemplate(deletedId).subscribe({
      next: () => {
        this.errorMessage = null;
        this.templates = this.templates.filter(t => t.shiftId !== deletedId);
        this.cancelDelete();
        this.isDeleting = false;
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = this.extractErrorMessage(error, 'Unable to delete shift template.');
        this.cancelDelete();
        this.isDeleting = false;
        this.cdr.markForCheck();
      },
    });
  }

  formatDateTime(value?: string): string {
    if (!value) {
      return '-';
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }

    return parsed.toLocaleString();
  }

  private toTimeInput(value: string): string {
    if (!value) return '';
    return value.substring(0, 5);
  }

  private buildPayload(): ShiftTemplateUpsertPayload {
    const raw = this.form.getRawValue();
    return {
      shiftCode: String(raw.shiftCode ?? '').trim(),
      shiftName: String(raw.shiftName ?? '').trim(),
      startTime: String(raw.startTime ?? ''),
      endTime: String(raw.endTime ?? ''),
      breakMinutes: Number(raw.breakMinutes ?? 0),
      graceInMinutes: Number(raw.graceInMinutes ?? 0),
      graceOutMinutes: Number(raw.graceOutMinutes ?? 0),
      isNightShift: !!raw.isNightShift,
      minWorkMinutes: Number(raw.minWorkMinutes ?? 0),
      isActive: !!raw.isActive,
    };
  }

  private trimmedRequiredValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = typeof control.value === 'string' ? control.value.trim() : '';
      return value ? null : { trimmedRequired: true };
    };
  }

  private shiftTimeRulesValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const startTime = String(control.get('startTime')?.value ?? '');
      const endTime = String(control.get('endTime')?.value ?? '');
      const isNightShift = Boolean(control.get('isNightShift')?.value);
      const breakMinutes = Number(control.get('breakMinutes')?.value ?? 0);
      const minWorkMinutes = Number(control.get('minWorkMinutes')?.value ?? 0);

      if (!startTime || !endTime) {
        return null;
      }

      const durationMinutes = this.calculateDurationMinutes(startTime, endTime, isNightShift);
      if (durationMinutes === null) {
        return { invalidTimeRange: true };
      }

      if (breakMinutes > durationMinutes) {
        return { breakExceedsDuration: true };
      }

      if (minWorkMinutes > durationMinutes - breakMinutes) {
        return { minWorkExceedsNetDuration: true };
      }

      return null;
    };
  }

  private calculateDurationMinutes(startTime: string, endTime: string, isNightShift: boolean): number | null {
    const start = this.toMinutes(startTime);
    const end = this.toMinutes(endTime);
    if (start === null || end === null) {
      return null;
    }

    if (!isNightShift) {
      return end > start ? end - start : null;
    }

    if (end > start) {
      return end - start;
    }

    return (24 * 60 - start) + end;
  }

  private toMinutes(value: string): number | null {
    const parts = value.split(':');
    if (parts.length < 2) {
      return null;
    }

    const hour = Number(parts[0]);
    const minute = Number(parts[1]);
    if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
      return null;
    }

    return hour * 60 + minute;
  }

  private extractErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const backendMessage = error.error?.message || error.error?.error;
    if (typeof backendMessage === 'string' && backendMessage.trim()) {
      return backendMessage;
    }
    if (typeof error.message === 'string' && error.message.trim()) {
      return error.message;
    }
    return fallback;
  }
}
