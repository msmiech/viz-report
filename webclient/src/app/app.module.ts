import {NgModule, LOCALE_ID} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {HttpModule} from '@angular/http';
import {AppRoutingModule} from './app-routing.module';
import {DatePipe} from '@angular/common';
import {D3Service} from 'd3-ng2-service';

import {AppComponent} from './components/app.component';
import {LoginComponent} from './components/login.component';
import {SidebarComponent} from './components/sidebar.component';
import {TopbarComponent} from './components/topbar.component';
import {OptionsComponent} from './components/options.component';
import {AccessService} from './services/access.service';
import {StatisticsPageComponent} from "./components/statistics-page.component";
import {BarChartComponent} from "./components/bar-chart.component";
import {ChartsComponent} from "./components/charts.component";
import {ReportLoaderComponent} from "./components/report-loader.component";
import {ReportPageComponent} from "./components/report-page.component";
import {ReportSummaryComponent} from "./components/report-summary.component";
import {FooterComponent} from "./components/footer.component";
import {NlpComponent} from "./components/nlp.component";
import {AtrChartComponent} from "./components/atr-chart.component";
import {ReportService} from "./services/report.service";
import {TargetMarketChartComponent} from "./components/target-market-chart.component";
import {MultiCoordinationService} from "./services/multi-coordination.service";
import {CompoundIndicatorComponent} from "./components/compound-indicator.component";
import {IndicatorChartComponent} from "./components/indicator-chart.component";
import {TechnicalPageComponent} from "./components/technical-page.component";
import {ReportEntryComponent} from "./components/report-entry.component";
import {ReportDetailComponent} from "./components/report-detail.component";
import {MathService} from "./services/math.service";
import {ReportEntryChartComponent} from "./components/report-entry-chart.component";


@NgModule({
    imports: [
        BrowserModule,
        FormsModule,
        HttpModule,
        AppRoutingModule
    ],
    declarations: [
        AppComponent,
        SidebarComponent,
        TopbarComponent,
        FooterComponent,
        OptionsComponent,
        LoginComponent,
        StatisticsPageComponent,
        ReportDetailComponent,
        ReportEntryComponent,
        ReportEntryChartComponent,
        ReportPageComponent,
        ReportSummaryComponent,
        ChartsComponent,
        BarChartComponent,
        ReportLoaderComponent,
        NlpComponent,
        AtrChartComponent,
        TargetMarketChartComponent,
        CompoundIndicatorComponent,
        IndicatorChartComponent,
        TechnicalPageComponent
    ],
    providers: [
        {provide: LOCALE_ID, useValue: "en-us"},
        D3Service,
        AccessService,
        DatePipe,
        ReportService,
        MultiCoordinationService,
        MathService
    ],
    bootstrap: [AppComponent]
})
export class AppModule {
}
