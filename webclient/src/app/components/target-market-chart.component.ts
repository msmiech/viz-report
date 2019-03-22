/**
 * The code from http://blog.scottlogic.com/2014/09/19/interactive.html was used as a reference for the navigation chart.
 */

import {Component, Input, OnInit} from '@angular/core';
import {D3Service, D3} from 'd3-ng2-service';
import {MultiCoordinationService} from "../services/multi-coordination.service";
import {Http} from "@angular/http";
import {Chart} from "../model/chart";
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';


@Component({
    selector: 'target-market-chart',
    templateUrl: '../views/target-market-chart.component.html'
})
export class TargetMarketChartComponent implements OnInit {

    @Input()
    chart: Chart = null;

    d3: D3;
    private indexURL: string;

    //Input for time period updates
    startDate: string = "2014-01-01";
    endDate: string = "2017-01-01";

    xScale: any;

    navXScale: any;
    navXAxis: any;
    navYScale: any;
    navChartHeight: number = 0;
    navChart: any;
    brush: any;
    brushElem: any;

    minSelection: number = 0;
    maxSelection: number = 445;
    currentSelectionStart: number = 0;
    currentSelectionEnd: number = 0;

    currentSelectionSize: number = 0;

    constructor(d3Service: D3Service, private http: Http, private multiCoordinationService: MultiCoordinationService) {
        this.d3 = d3Service.getD3();
    }

    ngOnInit(): void {

        this.multiCoordinationService.getChangeSelectionObservable().distinctUntilChanged().subscribe(selectionSizeAndSource => {
            let selectionSize = selectionSizeAndSource[0];
            let sourceIndicator = selectionSizeAndSource[1];
            if (this.currentSelectionSize != selectionSize && this.chart.targetMarket != sourceIndicator) {
                let diff = selectionSize - this.currentSelectionSize;
                if (this.currentSelectionEnd + diff > this.maxSelection) {
                    let diffRest = (this.currentSelectionEnd + diff) - this.maxSelection;
                    this.currentSelectionStart -= diffRest;
                } else {
                    this.currentSelectionEnd += diff;
                }

                this.currentSelectionSize = selectionSize;
                this.brushElem.call(this.brush.move, [this.currentSelectionStart, this.currentSelectionEnd])
            }
        });


        switch (this.chart.targetMarket) {
            case "nickel" :
                this.indexURL = "https://www.quandl.com/api/v3/datasets/LME/PR_NI.json?api_key=tHuu8FytBHG-RsJCPLc8&collapse=monthly";
                break;
            case "iron" :
                this.indexURL = "https://www.quandl.com/api/v3/datasets/ODA/PIORECR_USD.json?api_key=tHuu8FytBHG-RsJCPLc8&collapse=monthly";
                break;
            case "copper" :
                this.indexURL = "https://www.quandl.com/api/v3/datasets/LME/PR_CU.json?api_key=tHuu8FytBHG-RsJCPLc8&collapse=monthly";
                break;
        }
        this.getIndexData("&start_date=" + this.chart.startDate + "&end_date=" + this.chart.endDate);
    }


    getIndexData(timeAppendix: string) {
        let indexURLWithTime = this.indexURL + timeAppendix;
        this.http.get(indexURLWithTime, {})
            .toPromise()
            .then(response => {
                console.log("Request successful for line chart data: " + response);
                let jsonResult = response.json();
                let index: [any[]];
                index = jsonResult.dataset.data;
                this.drawChart(index);
            });
    }

    updateChart() {

        if (this.startDate == null || this.endDate == null) {
            alert("Start- or End-Date null. Try again.");
            return;
        }
        //clear chart
        this.d3.select("#" + this.chart.id + "_svg").selectAll("*").remove();
        this.d3.select("#" + this.chart.id + "-tm-svg-wrapper").select(".navigator").remove();
        this.getIndexData("&start_date=" + this.startDate + "&end_date=" + this.endDate);
    }

    drawChart(data: any[]) {
        let d3 = this.d3;
        let margin = {top: 5, right: 5, bottom: 60, left: 50};
        let svg = d3.select("#" + this.chart.id + "_svg").attr("width", this.chart.chartWidth);

        let width = +svg.attr("width") - margin.left - margin.right;
        let height = +svg.attr("height") - margin.top - margin.bottom;

        let self = this;

        let parseDate = d3.timeParse("%Y-%m-%d");

        data = data.map(function (entry) {
            return {date: parseDate(entry[0]), value: entry[1]};
        });

        let yScale = d3.scaleLinear()
            .range([height, 0])
            .domain([0, d3.max(data, function (entry) {
                return entry.value;
            })]);

        svg.append("g")
            .attr('transform', 'translate(' + margin.left + ',' + 0 + ')')
            .call(d3.axisLeft(yScale));


        this.xScale = d3.scaleTime()
            .domain(d3.extent(data, function (entry) {
                return entry.date;
            }))
            .range([0, width]);
        let xAxis = d3.axisBottom(this.xScale);

        let xAxisElem = svg.append("g")
            .attr('transform', 'translate(' + margin.left + ',' + height + ')')
            .attr("class", "market_chart_xAxis")
            .call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        let plotArea = svg.append("g")
            .attr("clip-path", "url(#" + this.chart.id + "-plotAreaClip)");
        plotArea.append('clipPath')
            .attr("id", this.chart.id + "-plotAreaClip")
            .append('rect')
            .attr("width", width)
            .attr("height", height)
            .attr('transform', 'translate(' + margin.left + ',' + 0 + ')');


        let line = d3.line()
            .x(function (entry: any) {
                return self.xScale(entry.date);
            })
            .y(function (entry: any) {
                return yScale(entry.value);
            });

        let dataSeries = plotArea.append("path")
            .data([data])
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .attr("class", "line")
            .attr("class", "target_market_path")
            .attr("d", line);


//---------NAVIGATION CHART---------------------

        let navWidth = width;
        this.navChartHeight = 100 - margin.top - margin.bottom;

        let svgWrapper = d3.select("#" + this.chart.id + "-tm-svg-wrapper");

        this.navChart = svgWrapper.insert("svg")
            .attr("class", "navigator")
            .attr("width", navWidth + margin.left + margin.right)
            .attr("height", this.navChartHeight + margin.top + margin.bottom)
            .append("g")
            .attr("transform", "translate(" + margin.left + ',' + margin.top + ")");

        this.navXScale = d3.scaleTime()
            .domain(this.xScale.domain())
            .range([0, navWidth]);
        this.navYScale = d3.scaleLinear()
            .range([this.navChartHeight, 0])
            .domain(yScale.domain());

        let navArea = d3.area()
            .x(function (entry: any) {
                return self.navXScale(entry.date);
            })
            .y0(this.navChartHeight)
            .y1(function (entry: any) {
                return self.navYScale(entry.value);
            });

        let navLine = d3.line()
            .x(function (entry: any) {
                return self.navXScale(entry.date);
            })
            .y(function (entry: any) {
                return self.navYScale(entry.value);
            });

        this.navChart.append('path')
            .attr('class', 'area')
            .attr('d', navArea(data));

        this.navChart.append('path')
            .attr('class', 'line')
            .attr('d', navLine(data));

        this.navXAxis = d3.axisBottom(this.navXScale);
        this.navChart.append('g')
            .attr('class', 'x axis')
            .attr('transform', 'translate(0,' + this.navChartHeight + ')')
            .call(this.navXAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        //-----Viewport main chart---------
        let multiCoordinationService = this.multiCoordinationService;
        this.brush = d3.brushX()
            .extent(function extent() {
                return [[0, 0], [navWidth, self.navChartHeight]];
            })
            .on("brush", function () {
                if (!d3.event.sourceEvent) {
                    return;
                }
                if (!d3.event.selection) {
                    return;
                }


                let currentSelection = d3.event.selection;
                let newDomain = currentSelection.map(self.navXScale.invert, self.navXScale);

                //Selection is based on dates. Dates have to be mapped to a date of a month because time series has only monthly values
                newDomain[0] = data.find(elem => {
                    return elem.date.getMonth() == newDomain[0].getMonth()
                        && elem.date.getFullYear() == newDomain[0].getFullYear();
                }).date;
                newDomain[1] = data.find(elem => {
                    return elem.date.getMonth() == newDomain[1].getMonth()
                        && elem.date.getFullYear() == newDomain[1].getFullYear();
                }).date;

                self.currentSelectionStart = currentSelection[0];
                self.currentSelectionEnd = currentSelection[1];
                let newSelectionSize = currentSelection[1] - currentSelection[0];
                if (self.currentSelectionSize != newSelectionSize) {
                    self.currentSelectionSize = newSelectionSize;
                    //Emit new selection to indicators of CI component
                    multiCoordinationService.emitChangeSelection([newSelectionSize, self.chart.targetMarket]);
                }

                self.xScale.domain(newDomain);
                self.multiCoordinationService.emitUpdateIndexLine(newDomain);

                let newValueline = d3.line()
                    .x(function (d: any, i) {
                        return self.xScale(d.date);
                    })
                    .y(function (d: any, i) {
                        return yScale(d.value);
                    });

                dataSeries.attr("d", newValueline);

                d3.select(".market_chart_xAxis")
                    .call(xAxis)
                    .selectAll("text")
                    .attr("y", 0)
                    .attr("x", 9)
                    .attr("dy", ".35em")
                    .attr("transform", "rotate(90)")
                    .style("text-anchor", "start");

            });

        //-----Append navigation chart-----
        this.brushElem = this.navChart.append("g")
            .attr("class", "brush")
            .call(this.brush)
            .call(this.brush.move, this.navXScale.range());
    }


}