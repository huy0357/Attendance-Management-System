import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { HrmRoutingModule } from './hrm-routing.module';
import { EmployeesComponent } from './employees/employees.component';
import { EmployeePortalComponent } from './employee-portal/employee-portal.component';
import { SharedModule } from '../../shared/shared.module';
import { DepartmentListComponent } from './departments/department-list/department-list.component';
import { HrmLandingComponent } from './hrm-landing.component';

@NgModule({
  declarations: [
    EmployeesComponent,
    EmployeePortalComponent,
    DepartmentListComponent,
    HrmLandingComponent,
  ],
  imports: [
    CommonModule,
    HrmRoutingModule,
    SharedModule,
    ReactiveFormsModule,
    FormsModule
  ]
})
export class HrmModule { }
