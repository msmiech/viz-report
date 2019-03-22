import {Component, Input, OnInit} from '@angular/core';
import {D3Service, D3} from 'd3-ng2-service';
import {MultiCoordinationService} from "../services/multi-coordination.service";
import {ViewChildren, QueryList} from '@angular/core';
import {Http} from "@angular/http";
import {Chart} from "../model/chart";
import {Indicator} from "../model/indicator";
import {IndicatorChartComponent} from "./indicator-chart.component";
import {MathService} from "../services/math.service";
import {Subscription} from "rxjs/Subscription";

declare let $: any;

@Component({
    selector: 'compound-indicator',
    templateUrl: '../views/compound-indicator.component.html'
})
export class CompoundIndicatorComponent implements OnInit {

    @Input()
    chart: Chart = null;

    @ViewChildren('indicatorChart')
    childComponents: QueryList<IndicatorChartComponent>;

    private d3: D3;

    indexData: any[] = [];
    normalizedIndexData: any[] = [];
    croppedIndexData: any[];

    indicators: Indicator[] = [];
    normalizedIndicatorValues: any[] = [];
    originalNormalizedIndVals: any[] = [];
    indicatorWeights: number[] = [];

    compoundIndicatorData: any[];
    ciCorrelation: number = 0;

    showTargetMarketOverlay: boolean = false;
    showTargetMarketDiff: boolean = false;
    indexLine: any;

    parseDate: any;

    displayIndicatorSubscriber: Subscription;
    changeTimePeriodSubscriber: Subscription;
    reverseIndicatorSubscriber: Subscription;
    componentDestroySubscriber: Subscription;


    constructor(d3Service: D3Service, private http: Http, private multiCoordinationService: MultiCoordinationService, private mathService: MathService) { // <-- pass the D3 Service into the constructor
        this.d3 = d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
    }

    ngOnInit(): void {
        this.parseDate = this.d3.timeParse("%Y-%m-%d");
        //this.indicators = this.multiCoordinationService.getIndicators();
        this.displayIndicatorSubscriber = this.multiCoordinationService.getDisplayIndicatorEmitter().subscribe((event: Indicator) => {
            if (event.showChart) {
                this.indicators.push(event);
                this.drawIndicator(event);
            }
            else {
                this.removeIndicatorChart(event);
            }
        });
        this.changeTimePeriodSubscriber = this.multiCoordinationService.getChangeTimePeriodEmitter().subscribe((event: any[]) => {
            this.updateTimePeriods(event);
        });
        this.reverseIndicatorSubscriber = this.multiCoordinationService.getReverseIndicatorObservable().subscribe((event: Indicator) => {
            this.normalizedIndicatorValues[event.name] = this.normalizedIndicatorValues[event.name].reverse();
            this.updateCompoundIndicator();
        });

        this.componentDestroySubscriber = this.multiCoordinationService.getComponentDestroyObservable().subscribe((comp: string) => {
            while (this.indicators.length > 0) {
                this.removeIndicatorChart(this.indicators[0]);
            }
        });

        this.multiCoordinationService.getUpdateIndexLineObservable().subscribe((event: any) => {
            this.updateIndexTimePeriods(event);
        });

        this.getIndexData();
    }

    getIndexData(): void {
        let indexURL: string;
        switch (this.chart.targetMarket) {
            case "nickel" :
                indexURL = "https://www.quandl.com/api/v3/datasets/LME/PR_NI.json?api_key=tHuu8FytBHG-RsJCPLc8&collapse=monthly";
                break;
            case "iron" :
                indexURL = "https://www.quandl.com/api/v3/datasets/ODA/PIORECR_USD.json?api_key=tHuu8FytBHG-RsJCPLc8&collapse=monthly";
                break;
            case "copper" :
                indexURL = "https://www.quandl.com/api/v3/datasets/LME/PR_CU.json?api_key=tHuu8FytBHG-RsJCPLc8&collapse=monthly";
                break;
        }

        indexURL += "&start_date=" + this.chart.startDate + "&end_date=" + this.chart.endDate;
        this.http.get(indexURL, {})
            .toPromise()
            .then(response => {
                console.log("Request successful for index data: " + response);
                let jsonResult = response.json();
                let index: [[string], [number]];
                index = jsonResult.dataset.data;
                this.indexData = index;
                let self = this;
                this.indexData = this.indexData.map(function (entry) {
                    return {date: self.parseDate(entry[0]), value: entry[1]};
                });
                let normalizedData: any[] = this.mathService.normalizeData(this.indexData);
                this.normalizedIndexData = normalizedData;
                this.croppedIndexData = normalizedData;
            });
    }

    drawIndicator(indicator: Indicator): void {
        let self = this;
        let data: any[] = indicator.data;
        data = data.map(function (entry) {
            return {date: self.parseDate(entry[0]), value: entry[1]};
        });
        let normalizedData: any[] = this.mathService.normalizeData(data);
        this.normalizedIndicatorValues[indicator.name] = normalizedData;
        this.originalNormalizedIndVals[indicator.name] = normalizedData;
        for (indicator of this.indicators) {
            this.indicatorWeights[indicator.name] = 1 / this.indicators.length;
        }
        this.updateCompoundIndicator();
    }

    removeIndicatorChart(indicator: Indicator): void {
        let indicatorToRemoveIndex = this.indicators.indexOf(indicator);
        this.indicators.splice(indicatorToRemoveIndex, 1);
        for (indicator of this.indicators) {
            this.indicatorWeights[indicator.name] = 1 / this.indicators.length;
        }
        this.updateCompoundIndicator();
    }


    updateCompoundIndicator() {

        if (this.indicators.length <= 0) {
            this.compoundIndicatorData = this.compoundIndicatorData.map(function (entry) {
                return {date: entry.date, value: 0}
            });
            this.drawCompoundIndicator();
            return
        }

        let firstIndicator = this.indicators[0].name;
        let compoundIndicatorValues: any[] = this.normalizedIndicatorValues[firstIndicator];
        //reset values to zero
        compoundIndicatorValues = compoundIndicatorValues.map(function (entry) {
            return {date: entry.date, value: 0}
        });
        let weight: number = 0;
        let weightSum: number = 0;
        for (let i = 0; i < this.indicators.length; i++) {
            let currentIndicator = this.indicators[i].name;
            let currentIndicatorValues = this.normalizedIndicatorValues[currentIndicator];
            weight = this.indicatorWeights[currentIndicator];
            weightSum += weight;
            if (weightSum > 1) {
                alert("Sum of weights cannot be less or greater than 1. Please adjust weights");
                return;
            }
            compoundIndicatorValues = compoundIndicatorValues.map(function (entry, j) {
                let newValue;
                if (currentIndicatorValues[j]) {
                    newValue = entry.value + currentIndicatorValues[j].value * weight;
                } else {
                    newValue = entry.value;
                }

                return {date: entry.date, value: newValue};
            })
        }
        if (weightSum < 0.999) {
            alert("Sum of weights cannot be less or greater than 1. Please adjust weights");
            return;
        }
        this.compoundIndicatorData = compoundIndicatorValues;
        this.drawCompoundIndicator();
    }

    calcCorrelation() {
        let indexValues = this.croppedIndexData.map(entry => entry.value);
        let compoundIndicatorValues = this.compoundIndicatorData.map(entry => entry.value);
        let correlation = this.mathService.getCorrCoefficient(indexValues, compoundIndicatorValues);
        this.ciCorrelation = Number(correlation.toFixed(2));
    }

    drawCompoundIndicator() {
        if (this.compoundIndicatorData == null || this.compoundIndicatorData.length < 1) {
            return;
        }
        this.calcCorrelation();
        let d3 = this.d3;
        let margin = {top: 5, right: 5, bottom: 50, left: 50};
        let compoundIndicatorSVG = this.d3.select("#" + this.chart.id + "_svg");
        compoundIndicatorSVG.selectAll("*").remove();

        let width = this.chart.chartWidth - margin.left - margin.right;
        let height = 200 - margin.top - margin.bottom;
        compoundIndicatorSVG
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        let data: any[] = [];
        let self = this;
        let minLength = Math.min(this.croppedIndexData.length, this.compoundIndicatorData.length);
        for (let i = minLength - 1; i >= 0; i--) {
            //use unshift to keep descending order of dates
            data.unshift({
                date: this.croppedIndexData[i].date,
                value: this.compoundIndicatorData[i].value,
                value2: this.croppedIndexData[i].value
            })
        }

        let xScale = d3.scaleTime().range([0, width]);


        xScale.domain(d3.extent(data, function (d) {
            return d.date;
        }));

        let yScale = d3.scaleLinear()
            .range([height, 0])
            .domain([0, 1]);

        let xAxis = d3.axisBottom(xScale);

        compoundIndicatorSVG.append("g")
            .attr('transform', 'translate(' + margin.left + ',' + (height + margin.top) + ')')
            .attr("class", "market_chart_xAxis")
            .call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        compoundIndicatorSVG.append("g")
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .call(d3.axisLeft(yScale));

        let plotArea = compoundIndicatorSVG.append('g')
            .attr('clip-path', 'url(#' + this.chart.id + 'plotAreaClip)')
            .attr("id", "ci_plot_area");
        plotArea.append('clipPath')
            .attr('id', this.chart.id + 'plotAreaClip')
            .append('rect')
            .attr("width", width)
            .attr("height", height + 10)
            .attr('transform', 'translate(' + margin.left + ',' + 0 + ')');

        let valueline = d3.line()
            .x(function (d: any, i) {
                return xScale(d.date);
            })
            .y(function (d: any, i) {
                return yScale(d.value);
            });

        plotArea.append("path")
            .data([data])
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
            .attr("class", "line")
            .style("stroke", "blue")
            .attr("d", valueline);

        if (this.showTargetMarketOverlay) {
            let valueline2 = d3.line()
                .x(function (d: any, i) {
                    return xScale(d.date);
                })
                .y(function (d: any, i) {
                    return yScale(d.value2);
                });

            this.indexLine = plotArea.append("path")
                .data([data])
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .attr("class", "line")
                .style("stroke", "red")
                .attr("d", valueline2);


        }

        if (this.showTargetMarketDiff) {
            let area = d3.area()
                .curve(d3.curveLinear)
                .x(function (d: any) {
                    return xScale(d.date);
                })
                .y0(height)
                .y1(function (d: any) {
                    return yScale(d.value);
                });

            let clip_above = plotArea.append("path")
                .data([data])
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .attr("class", "area above")
                .attr("clip-path", "url(#clip-above)")
                .attr("d", area.y0(function (d: any) {
                    return yScale(d.value2);
                }));
            let clip_below = plotArea.append("path")
                .data([data])
                .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')')
                .attr("class", "area below")
                .attr("clip-path", "url(#clip-below)")
                .attr("d", area);

            let clipB: any = clip_below.append("clipPath")
                .attr("id", "clip-below")
                .append("path")
                .attr("d", area.y0(height));
            let clipA: any = clip_above.append("clipPath")
                .attr("id", "clip-above")
                .append("path")
                .attr("d", area.y0(0));

            $("#ci_plot_area").append($("#clip-below"));
            $("#ci_plot_area").append($("#clip-above"));

        }

    }

    updateWeighting() {
        let childComponentsArray = this.childComponents.toArray();
        for (let i = 0; i < this.childComponents.length; i++) {
            let currentComp = childComponentsArray[i];
            this.indicatorWeights[currentComp.indicator.name] = currentComp.spinner;
        }
        this.updateCompoundIndicator();
    }


    updateTimePeriods(domainAndSource: any[]) {
        let period = domainAndSource[0];
        let indicatorName = domainAndSource[1];

        let data: any[] = this.originalNormalizedIndVals[indicatorName];
        let startIndex: number;
        let endIndex: number;

        if (data[0].date.getTime() > data[data.length - 1].date.getTime()) {

            //dates are sorted descending so that the start index has to be the one of the newest date
            startIndex = data.findIndex((elem) => {
                return elem.date.toString() == period[1].toString();
            });
            endIndex = data.findIndex((elem) => {
                return elem.date.toString() == period[0].toString();
            });

        } else {
            startIndex = data.findIndex((elem) => {
                return elem.date.toString() == period[0].toString();
            });
            endIndex = data.findIndex((elem) => {
                return elem.date.toString() == period[1].toString();
            });
        }
        this.normalizedIndicatorValues[indicatorName] = data.slice(startIndex, endIndex + 1);

        this.updateCompoundIndicator();
    }

    updateIndexTimePeriods(domain: any[]) {
        let period = domain;

        let data: any[] = this.normalizedIndexData;
        let startIndex: number;
        let endIndex: number;

        if (data[0].date.getTime() > data[data.length - 1].date.getTime()) {

            //dates are sorted descending so that the start index has to be the one of the newer date
            startIndex = data.findIndex((elem) => {
                return elem.date.toString() == period[1].toString();
            });
            endIndex = data.findIndex((elem) => {
                return elem.date.toString() == period[0].toString();
            });

        } else {
            startIndex = data.findIndex((elem) => {
                return elem.date.toString() == period[0].toString();
            });
            endIndex = data.findIndex((elem) => {
                return elem.date.toString() == period[1].toString();
            });
        }
        this.croppedIndexData = data.slice(startIndex, endIndex + 1);

        this.updateCompoundIndicator();
    }

    ngOnDestroy() {
        this.displayIndicatorSubscriber.unsubscribe();
        this.changeTimePeriodSubscriber.unsubscribe();
        this.reverseIndicatorSubscriber.unsubscribe();
        this.componentDestroySubscriber.unsubscribe();
        this.multiCoordinationService.emitComponentDestroy("ci");
    }

}