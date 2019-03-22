/**
 * Created by Dea.
 */

import {Component, OnInit} from '@angular/core';
import {D3Service, D3} from 'd3-ng2-service';
import {Chart} from "../model/chart";
import {MultiCoordinationService} from "../services/multi-coordination.service";

declare let $: any; //jquery

@Component({
    selector: 'my-charts',
    templateUrl: '../views/charts.components.html'
})
export class ChartsComponent implements OnInit {

    private d3: D3;

    static readonly CORRELATIONS_OPTION: string = "Correlations";
    static readonly TARGET_MARKET_OPTION: string = "Target Market";
    static readonly ATR_OPTION: string = "ATR";
    static readonly COMPOSITE_INDICATOR_OPTION: string = "Composite Indicator";

    charts: Chart[];
    selectedMarket: string = "nickel";
    chartType: string = null;
    chartSize: string = null;

    startDate: string = "2015-01-01";
    endDate: string = "2018-01-01";

    currentStartDate: string = "2015-01-01";
    currentEndDate: string = "2018-01-01";

    currentDashboardMarket: string = "nickel";


    constructor(d3Service: D3Service, private multiCoordinationService: MultiCoordinationService) { // <-- pass the D3 Service into the constructor
        this.d3 = d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
    }

    ngOnInit() {

        let nickelBarChart: Chart = {
            id: "nickelBar",
            targetMarket: "nickel",
            chartType: "correlations",
            chartWidth: 1100,
            startDate: this.startDate,
            endDate: this.endDate
        };
        let nickelLineChart: Chart = {
            id: "nickelLine",
            targetMarket: "nickel",
            chartType: "index",
            chartWidth: 500,
            startDate: this.startDate,
            endDate: this.endDate
        };
        let compoundIndicatorChart: Chart = {
            id: "nickelCompInd",
            targetMarket: "nickel",
            chartType: "ci",
            chartWidth: 500,
            startDate: this.startDate,
            endDate: this.endDate
        };

        this.charts = [nickelBarChart, nickelLineChart, compoundIndicatorChart];
    }

    addChart(): void {
        let newChart: Chart = new Chart();

        if (this.selectedMarket == null || this.chartType == null || this.chartSize == null || this.startDate == null || this.endDate == null) {
            return;
        }
        if(this.currentDashboardMarket != null && this.selectedMarket != this.currentDashboardMarket){
            alert("Cards for different markets not allowed. Please clear Dashboard before adding cards for different market.");
            return;
        }
        if(this.currentStartDate && this.currentEndDate && (this.startDate != this.currentStartDate || this.endDate != this.currentEndDate)){
            alert("Time period does not match already existing cards. Please adjust time period or clear dashboard.");
            return;
        }
        this.currentDashboardMarket = this.selectedMarket;
        let chartType: string = this.chartType;
        switch (this.chartType) {
            case ChartsComponent.CORRELATIONS_OPTION :
                chartType = "correlations";
                break;
            case ChartsComponent.TARGET_MARKET_OPTION:
                chartType = "index";
                break;
            case ChartsComponent.COMPOSITE_INDICATOR_OPTION:
                chartType = "ci";
                break;
        }

        newChart.targetMarket = this.selectedMarket;
        newChart.chartType = chartType;
        newChart.startDate = this.startDate;
        newChart.endDate = this.endDate;

        this.currentStartDate = this.startDate;
        this.currentEndDate = this.endDate;

        newChart.id = newChart.chartType + "-" + newChart.targetMarket + "-" + this.chartSize + "-" + Math.floor(Math.random() * 10) + 1;

        switch (this.chartSize) {
            case "L":
                newChart.chartWidth = 1100;
                break;
            case "S":
                newChart.chartWidth = 500;
                break;
            default:
                newChart.chartWidth = 1100;
        }
        this.charts.push(newChart);
    }

    removeChart(id: string): void {
        this.charts = this.charts.filter(value => value.id != id);
        if( this.charts.length == 0){
            this.currentDashboardMarket = null;
            this.currentStartDate = null;
            this.currentEndDate = null;
        }
    }

}