import {Component, Input, OnInit} from '@angular/core';
import {D3Service, D3} from 'd3-ng2-service';
import {Http} from "@angular/http";
import {Chart} from "../model/chart";
import {MultiCoordinationService} from "../services/multi-coordination.service";
import 'rxjs/add/observable/forkJoin';
import 'rxjs/add/operator/map';
import {Indicator} from "../model/indicator";
import {MathService} from "../services/math.service";
import {Subscription} from "rxjs/Subscription";

declare let $: any;

@Component({
    selector: 'bar-chart',
    templateUrl: '../views/bar-chart.component.html'
})
export class BarChartComponent implements OnInit {

    @Input()
    chart: Chart = null;


    private d3: D3;

    sortingMethod: string = "Absolute value";

    indicators: Indicator[] = []; //Indicators are retrieved by indicator name
    indicatorNames: string[] = [];
    indicatorURLs: string[] = [];

    indexValues: any[] = [];
    correlationsMap: any[] = [];
    indexData: any[] = [];
    indicatorChartBooleans: boolean[] = [];
    requestCount: number = 0;

    svg: any;
    width: number = 0;
    height: number = 0;
    margin = {top: 5, right: 5, bottom: 50, left: 50};
    barColors: string[] = ["#5eacc4", "#cda958"];

    componentDestroySubscriber: Subscription;


    constructor(d3Service: D3Service, private http: Http, private multiCoordinationService: MultiCoordinationService, private mathService: MathService) { // <-- pass the D3 Service into the constructor
        this.d3 = d3Service.getD3(); // <-- obtain the d3 object from the D3 Service
    }

    ngOnInit(): void {

        //Listen for destroy event of CI component in order to clear the selected indicators
        this.componentDestroySubscriber = this.multiCoordinationService.getComponentDestroyObservable().subscribe(event => {
            for (let i = 0; i < this.indicatorNames.length; i++) {
                let currentIndicator = this.indicators[this.indicatorNames[i]];
                if (currentIndicator.showChart) {
                    $(".custom-chart rect.bar#" + currentIndicator.name).css("stroke", "").css("stroke-width", "");
                    currentIndicator.showChart = false;
                    this.indicators[this.indicatorNames[i]] = currentIndicator;
                }
            }
        });

    }

    ngAfterViewInit() {
        this.initBarChart();
        let startDateString: string = "&start_date=" + this.chart.startDate;
        let endDateString: string = "&end_date=" + this.chart.endDate;
        this.http.get("http://localhost:8081/indicators", {})
            .toPromise()
            .then(response => {
                let indicatorURLs: any[] = response.json().message as any[];
                this.indicatorURLs = indicatorURLs.map(function (entry) {
                    return entry[0] + startDateString + endDateString;
                });
                this.loadData();

            });
    }


    loadData(): void {

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
                console.log("Request successful: " + response);
                let jsonDataSet = response.json().dataset;
                let index: [[string], [number]];
                index = jsonDataSet.data;
                this.indexData = index;
                this.indexValues = index.map(function (data) {
                    return data[1];
                });
                this.calculateCorrelations(index);
            });
    }

    //Retrieves the indicator data and triggers the calculation of the correlation coefficients
    calculateCorrelations(index: [string[], number[]]) {
        this.http.get(this.indicatorURLs[this.requestCount]).subscribe(response => {
            this.handleRequestData(response, this.requestCount);
        });
    }

    //A indicator object is created and the correlation coefficient of the indicator is calculated
    //Function is called recursively for each indicator URL
    handleRequestData(response: any, count: number) {
        let jsonDataSet = response.json().dataset;
        let name = jsonDataSet.dataset_code;
        console.log("Request successful: " + name);
        let indicatorData: [any] = jsonDataSet.data;

        let indicatorValues = indicatorData.map(function (data) {
            return data[1];
        });

        this.multiCoordinationService.setIndicators(this.indicators);

        let coeff = this.mathService.getCorrCoefficient(this.indexValues, indicatorValues);
        coeff = Number(coeff.toFixed(2));
        this.indicatorNames.push(name);
        this.indicators[name] = {
            url: this.indicatorURLs[count],
            name: name,
            data: indicatorData,
            description: jsonDataSet.description,
            showChart: false,
            correlation: coeff
        };
        this.correlationsMap.push({indicator: name, cor: coeff});
        this.indicatorChartBooleans[name] = false;

        this.drawChart();
        if (count < this.indicatorURLs.length - 1) {
            this.http.get(this.indicatorURLs[count + 1], {}).toPromise()
                .then(response => this.handleRequestData(response, count + 1));
        }
    }

    initBarChart() {
        this.svg = this.d3.select("#" + this.chart.id + "_svg");
        this.svg.attr("width", this.chart.chartWidth);

        this.width = +this.svg.attr("width") - this.margin.left - this.margin.right;
        this.height = +this.svg.attr("height") - this.margin.top - this.margin.bottom;
        this.addChartLegend();
    }

    addChartLegend() {
        let self = this;
        let legendDomain = ["Positive correlation", "Negative correlation"];

        let legend = this.svg.selectAll(".legend")
            .data(legendDomain)
            .enter().append("g")
            .attr("class", "legend")
            .attr("transform", function (d: any, i: number) {
                return "translate(0," + i * 20 + ")";
            });

        let color = this.d3.scaleOrdinal()
            .range(this.barColors);

        legend.append("rect")
            .attr("x", this.width - 18)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", function (d: any, i: number) {
                return self.barColors[i];
            });

        legend.append("text")
            .attr("x", this.width - 24)
            .attr("y", 9)
            .attr("dy", ".35em")
            .style("text-anchor", "end")
            .text(function (d: string) {
                return d;
            });
    }


    drawChart() {
        let d3 = this.d3;
        this.svg.selectAll(".x-axis").remove();
        this.svg.selectAll(".y-axis").remove();
        this.svg.selectAll(".bar-holder").remove();

        let correlations = this.correlationsMap;
        let corScaleDomain = [0, 1];

        if (this.sortingMethod == "Relative value") {
            correlations.sort(function (a, b) {
                return a.cor > b.cor ? -1 : 1;
            });
            corScaleDomain = [-1, 1];
        } else {
            correlations.sort(function (a, b) {
                return Math.abs(a.cor) > Math.abs(b.cor) ? -1 : 1;
            });
        }

        let corScale = d3.scaleLinear()
            .domain(corScaleDomain)
            .range([this.height, 0]);
        let yAxis = d3.axisLeft(corScale);
        let yAxisElement = this.svg.append("g")
            .classed("y-axis", true)
            .attr("transform", "translate(50, " + this.margin.top + ")")
            .call(yAxis);
        let yText = yAxisElement.append('text')
            .attr("transform", "rotate(-90)translate(-" + this.height / 2 + ", -35)")
            .style("text-anchor", "middle")
            .style("fill", "black")
            .style("font-size", 14)
            .text("Correlation");


        // x value determined by indicator
        let indicatorScale = d3.scaleBand()
            .domain(correlations.map(function (corMap) {
                return corMap.indicator;
            }))
            .range([0, this.width])
            .paddingInner(0.2);
        let xAxis = d3.axisBottom(indicatorScale);
        let xAxisElement = this.svg.append("g")
            .classed("x-axis", true)
            .attr("transform", "translate(50," + (corScale(0) + 5) + ")")
            .call(xAxis);
        xAxisElement.selectAll("text")
            .attr("y", -4)
            .attr("x", 9)
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        if (this.sortingMethod == "Relative value") {
            let correlationValues = correlations.map(function (corMap) {
                return corMap.cor;
            });
            let tickNegative = xAxisElement.selectAll('.tick').filter(function (d: any, i: number) {
                return correlationValues[i] < 0;
            });
            tickNegative.select("line").attr("y2", -6);
            tickNegative.select("text")
                .attr("x", 7)
                .attr("y", -3)
                .attr("transform", "rotate(-90)");
        }


        let barHolder = this.svg.append("g")
            .classed("bar-holder", true)
            .attr("transform", "translate(50, " + this.margin.top + ")");

        let self = this;
        let barWidth = indicatorScale.bandwidth();
        // draw the bars
        let bars = barHolder.selectAll("rect.bar")
            .data(correlations)
            .enter().append("rect")
            .classed("bar", true)
            .attr("x", function (entry: any) {
                // the x value is determined by indicator name
                return indicatorScale(entry.indicator)
            })
            .attr("y", function (entry: any) {
                return entry.cor < 0 ? corScale(0) : corScale(entry.cor);
            })
            .attr("width", barWidth)
            .attr("height", function (entry: any) {
                // the bar's height should align with the base of the chart (y=0)
                return Math.abs(corScale(entry.cor) - corScale(0));
            }).attr("id", function (entry: any) {
                return entry.indicator;
            }).attr("fill", function (entry: any) {
                if (entry.cor >= 0) {
                    return self.barColors[0];
                } else {
                    return self.barColors[1];
                }
            }).on("click", function (entry: any) {
                $('.indicatorDetails-title').text(entry.indicator);
                $('#indicatorDetails-content').text(self.indicators[entry.indicator].description);
                $("#addIndicator").attr("indicator", entry.indicator);
                $("#removeIndicator").attr("indicator", entry.indicator);
                $("#ind_details_cor_label").text("Correlation: " + Number(self.indicators[entry.indicator].correlation.toFixed(3)));
                self.drawIndicatorDetailsChart(entry.indicator);
                $('#indicatorDetailsDialog').modal('show');
            });


        if (this.sortingMethod != "Relative value") {
            bars = bars.attr("y", function (entry: any) {
                return entry.cor < 0 ? corScale(Math.abs(entry.cor)) : corScale(entry.cor);
            });
        }
    }

    updateSorting(){
        this.drawChart();
        for(let name of this.indicatorNames){
            if(this.indicators[name].showChart){
                this.d3.select(".custom-chart rect.bar#" + name).styles({"stroke": "#a53f9b", "stroke-width": 3});
            }
        }
    }

    addIndicatorToCI(event: any): void {
        if (!($("#compound-indicator-svg-wrapper")[0])) {
            alert("There is no CI component. Please add CI card");
            return;
        }

        let indicatorName = event.target.attributes.indicator.nodeValue;

        if (this.indicators[indicatorName].showChart == true) {
            return;
        }
        this.d3.select(".custom-chart rect.bar#" + indicatorName).styles({"stroke": "#a53f9b", "stroke-width": 3});
        let indicator: Indicator = this.indicators[indicatorName];
        indicator.showChart = true;
        this.indicators[indicatorName] = indicator;
        this.multiCoordinationService.setIndicators(this.indicators);

        //emit value to compound indicator component
        this.multiCoordinationService.emitShowIndicator(indicator);

    }

    removeIndicatorFromCI(event: any): void {
        if (!($("#compound-indicator-svg-wrapper")[0])) {
            alert("There is no CI component. Please add CI card");
            return;
        }
        let indicatorName = event.target.attributes.indicator.nodeValue;
        if (this.indicators[indicatorName].showChart == true) {
            this.d3.select(".custom-chart rect.bar#" + indicatorName).styles({"stroke": " ", "stroke-width": 0});
            let indicator: Indicator = this.indicators[indicatorName];
            indicator.showChart = false;
            this.indicators[indicatorName] = indicator;
            this.multiCoordinationService.setIndicators(this.indicators);
            this.multiCoordinationService.emitShowIndicator(indicator);
        }
    }

    drawIndicatorDetailsChart(indicatorName: string): void {

        let svg = this.d3.select("#indicator-details-chart");
        svg.selectAll("*").remove();
        let width = +svg.attr("width") - this.margin.left - this.margin.right;
        let height = +svg.attr("height") - this.margin.top - this.margin.bottom;

        let parseDate = this.d3.timeParse("%Y-%m-%d");
        let data: any[] = this.indicators[indicatorName].data;

        data = data.map(function (entry) {
            return {date: parseDate(entry[0]), value: entry[1]};
        });

        let xDomain = this.d3.extent(data, function (d) {
            return d.date;
        });
        let xScale = this.d3.scaleTime()
            .domain(xDomain)
            .range([0, width]);

        let yScale = this.d3.scaleLinear()
            .range([height, 0])
            .domain([this.d3.min(data, function (d) {
                return d.value;
            }),
                this.d3.max(data, function (d) {
                    return d.value;
                })
            ]);

        let xAxis = this.d3.axisBottom(xScale);

        let line = this.d3.line()
            .x(function (d: any, i) {
                return xScale(d.date);
            })
            .y(function (d: any, i) {
                return yScale(d.value);
            });

        svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + (height + this.margin.top) + ")")
            .attr("id", "details-x-axis")
            .attr("class", "market_chart_xAxis")
            .call(xAxis)
            .selectAll("text")
            .attr("y", 0)
            .attr("x", 9)
            .attr("dy", ".35em")
            .attr("transform", "rotate(90)")
            .style("text-anchor", "start");

        svg.append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
            .call(this.d3.axisLeft(yScale));

        let dataSeries = svg.append("path")
            .data([data])
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")")
            .attr("class", "line")
            .style("stroke", "green")
            .attr("d", line);
    }

    ngOnDestroy() {
        this.componentDestroySubscriber.unsubscribe();
        this.multiCoordinationService.emitComponentDestroy("correlation");
    }

}