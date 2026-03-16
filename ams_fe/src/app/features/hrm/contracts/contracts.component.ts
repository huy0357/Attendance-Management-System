import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ContractRecord,
  ContractStatus,
  ContractType,
  HrmService,
} from '../hrm.service';

@Component({
  standalone: false,
  selector: 'app-contracts',
  templateUrl: './contracts.component.html',
  styleUrls: ['./contracts.component.scss'],
})
export class ContractsComponent implements OnInit {
  showAddModal = false;
  showEditModal = false;
  showViewModal = false;
  showDeleteModal = false;

  contracts: ContractRecord[] = [];
  selectedContract: ContractRecord | null = null;

  filterForm: FormGroup;
  addForm: FormGroup;
  editForm: FormGroup;

  readonly contractTypes = ['All Types', 'Permanent', 'Contract', 'Probation', 'Intern', 'Part-time'];
  readonly statuses = ['All Status', 'Active', 'Expired', 'Pending', 'Terminated'];

  constructor(private hrmService: HrmService, private fb: FormBuilder) {
    this.filterForm = this.fb.group({
      searchQuery: [''],
      contractType: ['All Types'],
      status: ['All Status'],
      startDate: [''],
      endDate: [''],
    });

    this.addForm = this.fb.group({
      employeeName: ['', Validators.required],
      department: ['', Validators.required],
      position: ['', Validators.required],
      contractType: ['permanent', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      baseSalary: ['', Validators.required],
      benefits: [''],
      notes: [''],
    });

    this.editForm = this.fb.group({
      employeeName: ['', Validators.required],
      department: ['', Validators.required],
      position: ['', Validators.required],
      contractType: ['permanent', Validators.required],
      startDate: ['', Validators.required],
      endDate: [''],
      baseSalary: ['', Validators.required],
      benefits: [''],
      notes: [''],
      status: ['active', Validators.required],
    });
  }

  ngOnInit(): void {
    this.hrmService.getContracts().subscribe((data) => {
      this.contracts = data;
    });
  }

  get filteredContracts(): ContractRecord[] {
    const { searchQuery, contractType, status, startDate, endDate } = this.filterForm.value as {
      searchQuery: string;
      contractType: string;
      status: string;
      startDate: string;
      endDate: string;
    };

    const query = (searchQuery || '').toLowerCase();

    return this.contracts.filter((contract) => {
      const matchesSearch =
        contract.employeeName.toLowerCase().includes(query) ||
        contract.id.toLowerCase().includes(query) ||
        contract.position.toLowerCase().includes(query);

      const normalizedType = this.normalizeTypeFilter(contractType);
      const normalizedStatus = this.normalizeStatusFilter(status);
      const matchesType = !normalizedType || contract.contractType === normalizedType;
      const matchesStatus = !normalizedStatus || contract.status === normalizedStatus;

      const matchesStartDate = !startDate || new Date(contract.startDate) >= new Date(startDate);
      const matchesEndDate =
        !endDate ||
        (contract.endDate ? new Date(contract.endDate) <= new Date(endDate) : false);

      return matchesSearch && matchesType && matchesStatus && matchesStartDate && matchesEndDate;
    });
  }

  get expiringContracts(): ContractRecord[] {
    return this.contracts.filter((contract) => {
      const days = this.getDaysUntilExpiry(contract.endDate);
      return days !== null && days > 0 && days <= 90;
    });
  }

  get stats(): Array<{ label: string; value: number; color: string; bg: string; icon: string }> {
    return [
      {
        label: 'Total Contracts',
        value: this.contracts.length,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        icon: 'file-text',
      },
      {
        label: 'Active Contracts',
        value: this.contracts.filter((c) => c.status === 'active').length,
        color: 'text-green-600',
        bg: 'bg-green-50',
        icon: 'check-circle',
      },
      {
        label: 'Expiring Soon',
        value: this.contracts.filter((c) => {
          const days = this.getDaysUntilExpiry(c.endDate);
          return days !== null && days > 0 && days <= 90;
        }).length,
        color: 'text-yellow-600',
        bg: 'bg-yellow-50',
        icon: 'clock',
      },
      {
        label: 'Expired',
        value: this.contracts.filter((c) => c.status === 'expired').length,
        color: 'text-red-600',
        bg: 'bg-red-50',
        icon: 'x-circle',
      },
    ];
  }

  openAddModal(): void {
    this.addForm.reset({
      employeeName: '',
      department: '',
      position: '',
      contractType: 'permanent',
      startDate: '',
      endDate: '',
      baseSalary: '',
      benefits: '',
      notes: '',
    });
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  openEditModal(contract: ContractRecord): void {
    this.selectedContract = contract;
    this.editForm.reset({
      employeeName: contract.employeeName,
      department: contract.department,
      position: contract.position,
      contractType: contract.contractType,
      startDate: contract.startDate,
      endDate: contract.endDate || '',
      baseSalary: contract.baseSalary,
      benefits: contract.benefits.join(', '),
      notes: contract.notes || '',
      status: contract.status,
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedContract = null;
  }

  openViewModal(contract: ContractRecord): void {
    this.selectedContract = contract;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedContract = null;
  }

  openDeleteModal(contract: ContractRecord): void {
    this.selectedContract = contract;
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.selectedContract = null;
  }

  handleAddContract(): void {
    if (this.addForm.invalid) return;

    const value = this.addForm.value as {
      employeeName: string;
      department: string;
      position: string;
      contractType: ContractType;
      startDate: string;
      endDate: string;
      baseSalary: string | number;
      benefits: string;
      notes: string;
    };

    const contract: ContractRecord = {
      id: `CT-${String(this.contracts.length + 1).padStart(3, '0')}`,
      employeeId: `EMP-${String(this.contracts.length + 1).padStart(3, '0')}`,
      employeeName: value.employeeName,
      employeeAvatar: this.getInitials(value.employeeName),
      department: value.department,
      position: value.position,
      contractType: value.contractType,
      startDate: value.startDate,
      endDate: value.endDate || undefined,
      baseSalary: Number(value.baseSalary || 0),
      currency: 'USD',
      benefits: this.parseBenefits(value.benefits),
      status: 'pending',
      signedDate: undefined,
      documentUrl: undefined,
      notes: value.notes,
      renewalHistory: [],
    };

    this.hrmService.createContract(contract).subscribe(() => {
      this.contracts = [contract, ...this.contracts];
      this.showAddModal = false;
    });
  }

  handleUpdateContract(): void {
    if (!this.selectedContract || this.editForm.invalid) return;

    const value = this.editForm.value as {
      employeeName: string;
      department: string;
      position: string;
      contractType: ContractType;
      startDate: string;
      endDate: string;
      baseSalary: string | number;
      benefits: string;
      notes: string;
      status: ContractStatus;
    };

    const updated: ContractRecord = {
      ...this.selectedContract,
      employeeName: value.employeeName,
      employeeAvatar: this.getInitials(value.employeeName),
      department: value.department,
      position: value.position,
      contractType: value.contractType,
      startDate: value.startDate,
      endDate: value.endDate || undefined,
      baseSalary: Number(value.baseSalary || 0),
      benefits: this.parseBenefits(value.benefits),
      notes: value.notes,
      status: value.status,
    };

    this.contracts = this.contracts.map((contract) =>
      contract.id === updated.id ? updated : contract,
    );
    this.showEditModal = false;
    this.selectedContract = null;
  }

  handleDeleteContract(): void {
    if (!this.selectedContract) return;
    const contractId = this.selectedContract.id;

    this.hrmService.deleteContract(contractId).subscribe(() => {
      this.contracts = this.contracts.filter((contract) => contract.id !== contractId);
      this.showDeleteModal = false;
      this.selectedContract = null;
    });
  }

  getContractTypeLabel(type: ContractType): string {
    switch (type) {
      case 'permanent':
        return 'Permanent';
      case 'contract':
        return 'Fixed-Term';
      case 'probation':
        return 'Probation';
      case 'intern':
        return 'Intern';
      case 'part-time':
        return 'Part-Time';
      default:
        return 'Contract';
    }
  }

  getContractTypeClass(type: ContractType): string {
    switch (type) {
      case 'permanent':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'contract':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'probation':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'intern':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'part-time':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  getStatusLabel(status: ContractStatus): string {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expired';
      case 'pending':
        return 'Pending';
      case 'terminated':
        return 'Terminated';
      default:
        return 'Unknown';
    }
  }

  getStatusClass(status: ContractStatus): string {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'expired':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'terminated':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  }

  getStatusIcon(status: ContractStatus): string {
    switch (status) {
      case 'active':
        return 'check-circle';
      case 'expired':
        return 'x-circle';
      case 'pending':
        return 'clock';
      case 'terminated':
        return 'x-circle';
      default:
        return 'alert-circle';
    }
  }

  getDaysUntilExpiry(endDate?: string): number | null {
    if (!endDate) return null;
    const today = new Date();
    const expiry = new Date(endDate);
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatDate(dateValue?: string): string {
    if (!dateValue) return 'N/A';
    return new Date(dateValue).toLocaleDateString();
  }

  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter((part) => part.trim().length > 0)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  private parseBenefits(benefitsValue: string): string[] {
    if (!benefitsValue) return [];
    return benefitsValue
      .split(',')
      .map((benefit) => benefit.trim())
      .filter((benefit) => benefit.length > 0);
  }

  private normalizeTypeFilter(filterValue: string): ContractType | null {
    switch (filterValue.toLowerCase()) {
      case 'permanent':
        return 'permanent';
      case 'contract':
        return 'contract';
      case 'probation':
        return 'probation';
      case 'intern':
        return 'intern';
      case 'part-time':
      case 'part time':
        return 'part-time';
      default:
        return null;
    }
  }

  private normalizeStatusFilter(filterValue: string): ContractStatus | null {
    switch (filterValue.toLowerCase()) {
      case 'active':
        return 'active';
      case 'expired':
        return 'expired';
      case 'pending':
        return 'pending';
      case 'terminated':
        return 'terminated';
      default:
        return null;
    }
  }
}
