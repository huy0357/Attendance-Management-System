import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgIconsModule } from '@ng-icons/core';
import { LucideToHeroiconPipe } from './pipes/lucide-to-heroicon.pipe';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    NgIconsModule,
  ],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, NgIconsModule, LucideToHeroiconPipe],
  declarations: [LucideToHeroiconPipe],
})
export class SharedModule {}
