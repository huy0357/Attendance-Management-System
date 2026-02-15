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

@NgModule({
  declarations: [AppComponent, LoginComponent, AdminLayoutComponent, AiChatbotComponent],
  imports: [BrowserModule, HttpClientModule, AppRoutingModule, CoreModule, SharedModule],
  bootstrap: [AppComponent],
})
export class AppModule { }
