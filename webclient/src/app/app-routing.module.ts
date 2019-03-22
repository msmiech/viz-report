import {NgModule} from '@angular/core';
import {RouterModule, Routes} from '@angular/router';

import {LoginComponent} from './components/login.component';
import {OptionsComponent} from './components/options.component';
import {AccessService} from './services/access.service';
import {StatisticsPageComponent} from './components/statistics-page.component';
import {ReportPageComponent} from "./components/report-page.component";
import {TechnicalPageComponent} from "./components/technical-page.component";

const routes: Routes = [
    {path: '', redirectTo: '/login', pathMatch: 'full'},
    {path: 'login', component: LoginComponent},
    {path: 'statistics', component: StatisticsPageComponent, canActivate: [AccessService]},
    {path: 'reports', component: ReportPageComponent, canActivate: [AccessService]},
    {path: 'options', component: OptionsComponent, canActivate: [AccessService]},
    {path: 'technical', component: TechnicalPageComponent, canActivate: [AccessService]},
    {path: '**', redirectTo: '/login', pathMatch: 'full'},

];

@NgModule({
    imports: [RouterModule.forRoot(routes)],
    exports: [RouterModule]
})
export class AppRoutingModule {
}
