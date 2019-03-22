import {Component} from '@angular/core';
import {ReportService} from "../services/report.service";

/**
 * Contains all other report related views and components
 */
@Component({
    selector: 'report-page',
    templateUrl: '../views/report-page.component.html'
})
export class ReportPageComponent {

    //template accessible fields
    reportService: ReportService;

    constructor(reportService: ReportService) { //DI report-service
        this.reportService = reportService;
    }


}