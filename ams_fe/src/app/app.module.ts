import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { LoginComponent } from './features/auth/login/login.component';
import { AdminLayoutComponent } from './core/layout/admin-layout/admin-layout.component';
import { AiChatbotComponent } from './core/layout/ai-chatbot/ai-chatbot.component';
import { ProfileComponent } from './features/admin/profile/profile.component';
import { NgIconsModule } from '@ng-icons/core';
import * as heroiconsOutline from '@ng-icons/heroicons/outline';

@NgModule({
  declarations: [AppComponent, LoginComponent, AdminLayoutComponent, AiChatbotComponent, ProfileComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    CoreModule,
    SharedModule,
    // Register all Heroicons Outline ids globally so <ng-icon> always has an id to render.
    NgIconsModule.withIcons(heroiconsOutline as unknown as Record<string, string>),
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
