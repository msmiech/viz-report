/*
* The code from http://blog.scottlogic.com/2014/09/19/interactive.html was used as a reference for the navigation chart
*/
import {Component, Input, OnInit} from '@angular/core';
import {D3Service, D3} from 'd3-ng2-service';
import {MultiCoordinationService} from "../services/multi-coordination.service";
import {Http} from "@angular/http";
import {Indicator} from "../model/indicator";
import {MathService} from "../services/math.service";

declare let $: any;

@Component({
    selector: 'indicator-chart',
    templateUrl: '../views/indicator-chart.component.html'
})
export class IndicatorChartComponent implements OnInit {

    private d3: D3;

    @Input()
    indicator: Indicator;

    @Input()
    chartid: string;

    @Input()
    chartWidth: number;

    normalizedData: any[] = [];
    spinner: number = 0;
    dataReversed: boolean = false;

    svg: any;
    width: number = 0;
    height: number = 0;
    margin = {top: 5, right: 5, bottom: 50, left: 50};
    xScale: any;
    xAxis: any;
    navXDomain: any[];
    yScale: any;
    dataSeries: any;


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

    private WEIGHT_SPINNER_CLASS: string = "weight-spinner";

    constructor(d3Service: D3Service, private http: Http, private multiCoordinationService: MultiCoordinationService, private mathService: MathService) { // <-- pass the D3 Service into the constructor
        this.d3 = d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
    }

    ngOnInit(): void {

    }

    ngAfterViewInit(): void {

        this.multiCoordinationService.getChangeSelectionObservable().distinctUntilChanged().subscribe(selectionSizeAndSource => {
            let selectionSize = selectionSizeAndSource[0];
            let sourceIndicator = selectionSizeAndSource[1];
            if (this.currentSelectionSize != selectionSize && this.indicator.name != sourceIndicator) {
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

        //let margin = {top: 5, right: 5, bottom: 50, left: 50};
        this.width = this.chartWidth - this.margin.left - this.margin.right;
        this.height = 150 - this.margin.top - this.margin.bottom;
        this.svg = this.d3.select("#" + this.indicator.name + "_comp_svg")
            .attr("width", this.chartWidth)
            .attr("height", this.height + this.margin.top + this.margin.bottom);

        let parseDate = this.d3.timeParse("%Y-%m-%d");
        let data: any[] = this.indicator.data;

        data = data.map(function (entry) {
            return {date: parseDate(entry[0]), value: entry[1]};
        });
        this.currentSelectionEnd = this.width;
        this.currentSelectionSize = this.width;
        this.normalizedData = this.mathService.normalizeData(data);
        this.drawIndicator();
    }

    drawIndicator(): void {

        let d3 = this.d3;
        let self = this;
        this.svg.selectAll("*").remove();

        let xDomain = d3.extent(this.normalizedData, function (d) {
            return d.date;
        });
        this.navXDomain = xDomain;
        this.xScale = d3.scaleTime()
            .domain(xDomain)
            .range([0, this.width]);

        this.yScale = d3.scaleLinear()
            .range([this.height, 0])
            .domain([0, d3.max(this.normalizedData, function (d) {
                return d.value;
            })]);

        this.xAxis = d3.axisBottom(this.xScale);

        let valueLine = d3.line()
            .x(function (d: any, i) {
                return self.xScale(d.date);
            })
            .y(function (d: any, i) {
                return self.yScale(d.value);
            });

        this.svg.append("g")
            .attr('transform', 'translate(' + this.margin.left + ',' + (this.height + this.margin.top) + ')')
            .attr("id", this.indicator.name + "-x-axis")
            .attr("class", "market_chart_xAxis")
            .call(this.xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        this.svg.append("g")
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')')
            .call(d3.axisLeft(this.yScale));

        let plotArea = this.svg.append('g')
            .attr("clip-path", "url(#" + this.indicator.name + "plotAreaClip)");
        plotArea.append('clipPath')
            .attr("id", this.indicator.name + "plotAreaClip")
            .append("rect")
            .attr("width", this.width)
            .attr("height", this.height + 10)
            .attr("transform", "translate(" + this.margin.left + "," + 0 + ")");


        /*
        if (this.showTargetMarketOverlay) {
            let valueline2 = d3.line()
                .x(function (d: any, i) {
                    return xScale(d.date);
                })
                .y(function (d: any, i) {
                    return yScale(d.value2);
                });

            plotArea.append("path")
                .data([data])
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .attr("class", "line")
                .style("stroke", "red")
                .attr("d", valueline2);
        }
        */

        this.dataSeries = plotArea.append("path")
            .data([this.normalizedData])
            .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')')
            .attr("class", "line")
            .style("stroke", "green")
            .attr("d", valueLine);

        //---------NAVIGATION CHART---------------------
        this.drawNavChart([0, this.width]);
        //-----Viewport main chart---------
        let multiCoordinationService = this.multiCoordinationService;
        let indicatorName = this.indicator.name;
        let data: any[] = this.normalizedData;

        this.brush = d3.brushX()
            .extent(function extent() {
                return [[0, 0], [self.width, self.navChartHeight]];
            })
            .on("brush", function () {
                if (!d3.event.sourceEvent) {
                    return;
                } // Transition only after input.
                if (!d3.event.selection) {
                    return;
                } // Empty selections are ignored.

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
                    //Emit new selection to other indicators
                    multiCoordinationService.emitChangeSelection([newSelectionSize, indicatorName]);
                }

                if (self.dataReversed) {
                    newDomain = newDomain.reverse();
                }
                self.xScale.domain(newDomain);
                //emit new domain to the CI
                multiCoordinationService.emitChangeTimePeriods([newDomain, indicatorName]);


                let newValueline = d3.line()
                    .x(function (d: any, i) {
                        return self.xScale(d.date);
                    })
                    .y(function (d: any, i) {
                        return self.yScale(d.value);
                    });
                self.dataSeries.attr("d", newValueline);
                d3.select("#" + indicatorName + "-x-axis")
                    .call(self.xAxis)
                    .selectAll("text")
                    .attr("y", 0)
                    .attr("x", 9)
                    .attr("dy", ".35em")
                    .attr("transform", "rotate(90)")
                    .style("text-anchor", "start");

            });

        //-----Viewport navigation chart-----
        this.brushElem = this.navChart.append("g")
            .attr("id", this.indicator.name + "-brush")
            .attr("class", "brush")
            .call(this.brush)
            .call(this.brush.move, this.navXScale.range());
    }

    drawNavChart(xRange: any[]) {
        let self = this;
        this.navChartHeight = 100 - this.margin.top - this.margin.bottom;
        let svgWrapper = this.d3.select("#" + this.indicator.name + "-svg-wrapper");
        if (this.navChart) {
            this.navChart.selectAll("path").remove();
            this.navChart.selectAll(".x-axis").remove();
        } else {
            this.navChart = svgWrapper.insert("svg")
                .attr("id", this.indicator.name + "-nav-chart")
                .attr("class", "navigator")
                .attr("width", this.width + this.margin.left + this.margin.right)
                .attr("height", this.navChartHeight + this.margin.top + this.margin.bottom)
                .append("g")
                .attr("transform", "translate(" + this.margin.left + ',' + this.margin.top + ")");
        }

        if (!this.navXScale) {
            this.navXScale = this.d3.scaleTime()
                .domain(this.xScale.domain());
        }
        this.navXScale.range(xRange);

        this.navYScale = this.d3.scaleLinear()
            .range([this.navChartHeight, 0])
            .domain(this.yScale.domain());

        let navLine = this.d3.line()
            .x(function (d: any) {
                return self.navXScale(d.date);
            })
            .y(function (d: any) {
                return self.navYScale(d.value);
            });
        this.navChart.append('path')
            .attr('class', 'line')
            .attr('d', navLine(this.normalizedData));

        let navArea = this.d3.area()
            .x(function (d: any) {
                return self.navXScale(d.date);
            })
            .y0(this.navChartHeight)
            .y1(function (d: any) {
                return self.navYScale(d.value);
            });
        this.navChart.append('path')
            .attr('class', 'area')
            .attr('d', navArea(this.normalizedData));

        this.navXAxis = this.d3.axisBottom(this.navXScale);
        this.navChart.append('g')
            .attr('class', 'x-axis')
            .attr('transform', 'translate(0,' + this.navChartHeight + ')')
            .call(this.navXAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");
    }


    reverseData() {
        this.indicator.data = this.indicator.data.reverse();
        let self = this;
        this.normalizedData = this.normalizedData.reverse();
        this.multiCoordinationService.reverseIndicator(this.indicator);
        if (this.dataReversed) {
            this.xScale.range([this.width, 0]);
            this.drawNavChart([this.width, 0]);
        } else {
            this.xScale.range([0, this.width]);
            this.drawNavChart([0, this.width]);
        }

        let newValueline = this.d3.line()
            .x(function (d: any, i) {
                return self.xScale(d.date);
            })
            .y(function (d: any, i) {
                return self.yScale(d.value);
            });
        this.dataSeries.attr("d", newValueline);
        this.d3.select("#" + this.indicator.name + "-x-axis")
            .call(this.xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");
        //this.drawIndicator();
    }

}

