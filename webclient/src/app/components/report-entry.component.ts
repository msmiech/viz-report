import {Component, Input} from '@angular/core';
import {ReportService} from "../services/report.service";
import {D3, D3Service} from "d3-ng2-service";
import {ReportEntry} from "../model/report-entry";
import {ReportUtils} from "../util/report-utils";

declare let $: any;

@Component({
    selector: 'report-entry-card',
    templateUrl: '../views/report-entry-card.component.html'
})
export class ReportEntryComponent {
    private d3: D3;

    //template accessible fields
    reportService: ReportService;

    @Input() reportEntry: ReportEntry;
    @Input() reportEntryIndex: number;

    //References
    //Referencing static methods here since templates can't access them
    removeHtmlTagsFromString = ReportUtils.removeHtmlTagsFromString; //used in report entry template
    countPositiveSentiments = ReportUtils.countPositiveSentiments; //used in report entry template
    countNegativeSentiments = ReportUtils.countNegativeSentiments; //used in report entry template
    countNeutralSentiments = ReportUtils.countNeutralSentiments; //used in report entry template

    constructor(reportService: ReportService, d3Service: D3Service) {
        this.reportService = reportService;
        this.d3 = d3Service.getD3();
    }

    /**
     * Dialog preparation for report details
     * @param feedEntry currently clicked report
     */
    onExpandFeedClicked(feedEntry: ReportEntry): void {
        this.reportService.selectedReportEntry = feedEntry;

        $('#reportDialog').modal('show');
    }
}