/**
 * Created by Dea.
 * The calculation of the ATR was implemented by modifying the code from:
 * https://github.com/Cloud9Trader/TechnicalIndicators/blob/master/atr.src.js
 */
import {Component, Input, OnInit} from '@angular/core';
import {D3Service, D3} from 'd3-ng2-service';
import {Http} from "@angular/http";
import {Chart} from "../model/chart";
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import {MathService} from "../services/math.service";



@Component({
    selector: 'atr-chart',
    templateUrl: '../views/atr-chart.component.html'
})
export class AtrChartComponent implements OnInit {

    @Input()
    chart: Chart = null;

    private d3: D3;

    constructor(d3Service: D3Service, private http: Http, private mathService: MathService) { // <-- pass the D3 Service into the constructor
        this.d3 = d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
    }

    ngOnInit(): void {
        this.getDataForATR();
    }

    /**
     * Retrieves data from quandl and calculates the HIGH, LOW and CLOSE of each day and stores it in an array.
     * Retrieved data must have several data entries per day.
    */
    getDataForATR() {
        let indexURL: string;
        switch (this.chart.targetMarket) {
            case "nickel" :
                indexURL = "https://www.quandl.com/api/v3/datasets/LME/PR_NI.json?api_key=tHuu8FytBHG-RsJCPLc8";
                break;
            case "iron" :
                indexURL = "https://www.quandl.com/api/v3/datasets/ODA/PIORECR_USD.json?api_key=tHuu8FytBHG-RsJCPLc8";
                break;
            case "copper" :
                indexURL = "https://www.quandl.com/api/v3/datasets/LME/PR_CU.json?api_key=tHuu8FytBHG-RsJCPLc8";
                break;
        }
        indexURL += "&start_date=" + this.chart.startDate + "&endDate=" + this.chart.endDate;
        this.http.get(indexURL, {})
            .toPromise()
            .then(response => {
                console.log("Request successful for atr chart data: " + response);
                let HIGH: number[] = [];
                let LOW: number[] = [];
                let CLOSE: number[] = [];
                let jsonResult = response.json();
                let index: [any[]];
                let dates: string[] = [];
                index = jsonResult.dataset.data;
                index.forEach(function (elem) {
                    dates.push(elem[0]);
                    let values: number[] = elem.slice(1, elem.length);
                    let max = 0;
                    let min = Number.MAX_VALUE;
                    values.forEach(function (elem) {
                        if (elem != null && elem > max) {
                            max = elem;
                        }
                        if (elem != null && elem < min) {
                            min = elem;
                        }
                    });
                    HIGH.push(max);
                    LOW.push(min);
                    for(let i = 0; i < values.length;i++){
                        if (i == values.length-1 || elem[i+1] == null){
                            CLOSE.push(elem[i]);
                            break;
                        }
                    }

                });

                this.calcATR(HIGH, LOW, CLOSE, dates);
            });
    }

    calcATR(high: number[], low: number[], close: number[], dates: string[]): void {
        let trueRangeValues = [];
        let averageTrueRange = 0;
        let periods = 14;

        let trueRange;

        let HIGH: number[] = high;
        let LOW: number[] = low;
        let CLOSE = close;

        let previousClose: number = CLOSE[0];

        let ATR: any[] = [];

        for (let i = 0; i < HIGH.length; i++) {
            trueRange = Math.max(
                HIGH[i] - LOW[i],
                Math.abs(HIGH[i] - previousClose),
                Math.abs(LOW[i] - previousClose)
            );

            previousClose = CLOSE[i];

            if (trueRangeValues.length < periods) {
                trueRangeValues.push(trueRange);

                if (trueRangeValues.length < periods) {
                    continue;
                } else {
                    averageTrueRange =  this.mathService.calcAverage(trueRangeValues);
                    ATR.push({date: dates[i], value: averageTrueRange});
                }
            } else {
                // NOTE
                // This smoothing formula is given here: http://stockcharts.com/school/doku.php?id=chart_school:technical_indicators:average_true_range_a
                // and http://en.wikipedia.org/wiki/Average_true_range
                // though some sources e.g. http://user42.tuxfamily.org/chart/manual/Average-True-Range.html#Average-True-Range
                // smooth with EMA. These produce different results
                averageTrueRange = ((averageTrueRange * (periods - 1)) + trueRange) / periods;
                ATR.push({date: dates[i], value: averageTrueRange});
            }
        }

        this.drawChart(ATR);

    }

    
    drawChart(data: any[]): void {

        let d3 = this.d3;
        let margin = {top: 5, right: 5, bottom: 50, left: 50};
        let svg = d3.select("#" + this.chart.id + "_svg");
        svg.attr("width", this.chart.chartWidth);

        let width = +svg.attr("width") - margin.left - margin.right;
        let height = +svg.attr("height") - margin.top - margin.bottom;

        let parseDate = d3.timeParse("%Y-%m-%d");

        data = data.map(function (d) {
            return {date: parseDate(d.date), value: d.value};
        });

        let dates = data.map(function (d) {
            return d.date;
        });
        let values = data.map(function (d) {
            return d.value;
        });

        let xScale = d3.scaleTime()
            .domain(d3.extent(data, function(d) { return d.date; }))
            .range([0, width]);

        let yScale = d3.scaleLinear().range([height, 0]);
        yScale.domain([0, d3.max(data, function (d) {
            return d.value;
        })]);

        let xAxis = d3.axisBottom(xScale);

        let line = d3.line()
            .x(function (d: any, i) {
                return xScale(d.date);
            })
            .y(function (d: any, i) {
                return yScale(d.value);
            });

        svg.append("path")
            .data([data])
            .attr('transform', 'translate(' + margin.left +',' + margin.top + ')')
            .attr("class", "line")
            .attr("class", "ATR_path")
            .attr("d", line);

        svg.append("g")
            .attr('transform', 'translate(' + margin.left +',' + height + ')')
            .attr("class", "line_chart_xAxis")
            .call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        svg.append("g")
            .attr('transform', 'translate(' + margin.left +',' + 0 + ')')
            .call(d3.axisLeft(yScale));

    }

}