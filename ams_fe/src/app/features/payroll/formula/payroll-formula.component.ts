import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import {
  FormulaIngredientGroup,
  FormulaNode,
  PayrollService,
  SimulationEmployee,
} from '../payroll.service';

@Component({
  standalone: false,
  selector: 'app-payroll-formula',
  templateUrl: './payroll-formula.component.html',
  styleUrls: ['./payroll-formula.component.scss'],
})
export class PayrollFormulaComponent implements OnInit {
  nodes: FormulaNode[] = [];
  ingredients: FormulaIngredientGroup = { variables: [], operators: [], functions: [] };
  employees: SimulationEmployee[] = [];
  showSimulation = false;

  simulationForm: FormGroup;

  constructor(private payrollService: PayrollService, private fb: FormBuilder) {
    this.simulationForm = this.fb.group({
      employeeId: ['sarah-chen'],
    });
  }

  ngOnInit(): void {
    this.payrollService.getFormulaNodes().subscribe((data) => (this.nodes = data));
    this.payrollService.getFormulaIngredients().subscribe((data) => (this.ingredients = data));
    this.payrollService.getSimulationEmployees().subscribe((data) => (this.employees = data));
  }

  get selectedEmployee(): SimulationEmployee | undefined {
    const { employeeId } = this.simulationForm.value as { employeeId: string };
    return this.employees.find((emp) => emp.id === employeeId);
  }

  get employeeIdControl(): FormControl {
    return this.simulationForm.get('employeeId') as FormControl;
  }

  get simulatedTotal(): number {
    if (!this.selectedEmployee) return 0;
    return this.selectedEmployee.baseSalary + this.selectedEmployee.overtimeHours * this.selectedEmployee.hourlyRate;
  }

  runSimulation(): void {
    this.showSimulation = true;
  }

  getIconName(iconId?: string): string {
    return iconId || 'dollar-sign';
  }
}

