import { Routes } from '@angular/router';
import { LandingComponent } from './components/landing.component';
import { LoginComponent } from './components/login.component';
import { HomeComponent } from './components/home.component';
import { RedeemRewardsComponent } from './components/redeem-rewards.component';
import { HistoryComponent } from './components/history.component';
import { AdminLoginComponent } from './components/admin-login.component';
import { AdminDashboardComponent } from './components/admin-dashboard.component';
import { AdminUsersComponent } from './components/admin-users.component';
import { AdminRewardFormComponent } from './components/admin-reward-form.component';
import { AdminRedemptionsComponent } from './components/admin-redemptions.component';
import { AdminPendingRewardsComponent } from './components/admin-pending-rewards.component';
import { AdminProjectsComponent } from './components/admin-projects.component';
import { AdminEntryCodesComponent } from './components/admin-entry-codes.component';
import { AdminOrdersComponent } from './components/admin-orders.component';
import { AdminVigenciasComponent } from './components/admin-vigencias.component';
import { AdminCodesComponent } from './components/admin-codes.component';
import { AdminEntryCodesReportComponent } from './components/admin-entry-codes-report.component';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './services/auth.service';

const authGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isLoggedIn() || router.createUrlTree(['/auth/login']);
};

const adminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.isAdmin() || router.createUrlTree(['/admin/login']);
};

const systemAdminGuard = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (auth.isAdmin() && auth.getRole() === 'system_admin') || router.createUrlTree(['/admin/dashboard']);
};

export const routes: Routes = [
    { path: '', redirectTo: 'rewards', pathMatch: 'full' },
    { path: 'auth/login', component: LoginComponent },
    {
        path: 'home',
        redirectTo: 'rewards',
        pathMatch: 'full'
    },
    {
        path: 'rewards',
        component: RedeemRewardsComponent,
        canActivate: [authGuard]
    },
    {
        path: 'history',
        component: HistoryComponent,
        canActivate: [authGuard]
    },
    // Admin Routes
    { path: 'admin', redirectTo: 'admin/login', pathMatch: 'full' },
    { path: 'admin/login', component: AdminLoginComponent },
    {
        path: 'admin/dashboard',
        component: AdminDashboardComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/users',
        component: AdminUsersComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/projects',
        component: AdminProjectsComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/entry-codes',
        component: AdminEntryCodesComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/rewards',
        component: AdminRewardFormComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/vigencias',
        component: AdminVigenciasComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/codes',
        component: AdminCodesComponent,
        canActivate: [systemAdminGuard]
    },
    {
        path: 'admin/redemptions',
        component: AdminRedemptionsComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/pending-rewards',
        component: AdminPendingRewardsComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/orders',
        component: AdminOrdersComponent,
        canActivate: [adminGuard]
    },
    {
        path: 'admin/entry-codes-report',
        component: AdminEntryCodesReportComponent,
        canActivate: [adminGuard]
    },
    { path: '**', redirectTo: '' }
];
