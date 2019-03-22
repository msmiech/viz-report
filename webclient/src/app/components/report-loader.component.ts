import {Component} from '@angular/core';
import {ReportService} from "../services/report.service";
import {ReportDataSourceType} from "../model/report-data-source-type";


@Component({
    selector: 'report-loader-card',
    templateUrl: '../views/report-loader-card.component.html'
})
export class ReportLoaderComponent {

    static readonly MINING_RSS_FEED_URL_START: string = "http://www.mining.com/tag/";
    static readonly MINING_RSS_FEED_URL_END: string = "/feed/";

    reportDataSourceType: ReportDataSourceType = ReportDataSourceType.RSS; //Default is RSS

    //RSS-Feed variables
    private selectedMiningFeed: string;
    customUrlRadio: string = "false";
    customUrl: string;
    feedCount: number;

    //File variables
    private selectedFiles: any[];


    constructor(private reportService: ReportService) {

    }


    public onLoadReportButtonClicked(): void {
        switch (this.reportDataSourceType) {
            case ReportDataSourceType.RSS:
                this.loadReportFromRssFeed();
                break;
            case ReportDataSourceType.TextFile:
                this.loadReportFromTextFile();
                break;
        }

    }

    private loadReportFromRssFeed(): void {
        let feedUrl = this.customUrl;
        let feedCount: number = this.feedCount;
        let customUrlRadioBool: boolean = (this.customUrlRadio == "true");
        if (customUrlRadioBool == false) {
            if (!this.selectedMiningFeed) {
                alert("No report selected!");
                return;
            }
            feedUrl = ReportLoaderComponent.MINING_RSS_FEED_URL_START + this.selectedMiningFeed + ReportLoaderComponent.MINING_RSS_FEED_URL_END;
        }

        if (!feedUrl) {
            alert("No report url specified!");
            return;
        }

        if (!feedCount) feedCount = 3;

        //loading feeds
        let params: Map<string, any> = new Map();
        params.set("count", feedCount);
        this.reportService.loadReportFromDataSource(ReportDataSourceType.RSS, [feedUrl], params);
    }

    setReportDataSource(dataSourceType: string): void {
        if (!dataSourceType) {
            console.log("No data source type provided!");
            return;
        }
        this.reportDataSourceType = (dataSourceType == 'File' ? ReportDataSourceType.TextFile : ReportDataSourceType.RSS);
    }

    setSelectedFiles(event: any): void {
        let input = event.target;
        this.selectedFiles = input.files;
        //console.log(this.selectedFiles);
    }

    private loadReportFromTextFile(): void {
        if (!this.selectedFiles) {
            alert("No files selected!");
            return;
        }

        //loading files
        let params: Map<string, any> = new Map();
        params.set("files", this.selectedFiles);
        this.reportService.loadReportFromDataSource(ReportDataSourceType.TextFile, ["TextFiles/param"], params);
    }

    onFeedSelectionChanged(value: string) {
        this.selectedMiningFeed = value;
    }

}