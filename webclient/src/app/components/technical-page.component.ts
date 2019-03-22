import {Component} from '@angular/core';
import {D3, D3Service} from "d3-ng2-service";
import {Http} from "@angular/http";
import {Chart} from "../model/chart";

@Component({
    selector: 'technical-page',
    templateUrl: '../views/technical-page.component.html'
})
export class TechnicalPageComponent {

    static readonly ATR_OPTION: string = "ATR";

    private d3: D3;

    charts: Chart[];

    selectedMarket: string = null;
    chartType: string = null;
    chartSize: string = null;

    selectedStartDate: string = "2014-01-01";
    selectedEndDate: string = "2017-01-01";

    constructor(d3Service: D3Service, private http: Http) { // <-- pass the D3 Service into the constructor
        this.d3 = d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
    }

    ngOnInit() {

        let nickelATRChart: Chart = {
            id: "nickelATR",
            targetMarket: "nickel",
            chartType: TechnicalPageComponent.ATR_OPTION,
            chartWidth: 1100,
            startDate: this.selectedStartDate,
            endDate: this.selectedEndDate
        };
        this.charts = [nickelATRChart];
    }

    addChart(): void {
        let newChart: Chart = new Chart();
        if (this.selectedMarket == null || this.chartType == null || this.chartSize == null) {
            return;
        }
        newChart.id = newChart.chartType + "-" + newChart.targetMarket + "-" + this.chartSize + "-" + Math.floor(Math.random() * 10) + 1;
        newChart.targetMarket = this.selectedMarket;
        newChart.chartType = this.chartType;
        newChart.startDate = this.selectedStartDate;
        newChart.endDate = this.selectedEndDate;
        switch (this.chartSize) {
            case "L":
                newChart.chartWidth = 1100;
                this.charts.push(newChart);
                break;
            case "M":
                break;
            case "S":
                newChart.chartWidth = 500;
                this.charts.push(newChart);
                break;
        }
    }

    removeChart(id: string): void {
        this.charts = this.charts.filter(value => value.id != id);
        $("#" + id + "_card_container").remove();
    }
}