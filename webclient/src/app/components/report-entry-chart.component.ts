import {AfterViewInit, Component, Input} from '@angular/core';
import {D3, D3Service} from "d3-ng2-service";


/**
 * This component serves to draw the chart for the brief summary of NMF topic modelling.
 * This has been outsourced to have access to the ngAfterViewInit hook because on ReportEntryComponent level it happens too early.
 */
@Component({
    selector: 'report-entry-chart',
    templateUrl: '../views/report-entry-chart.component.html'
})
export class ReportEntryChartComponent implements AfterViewInit {
    private d3: D3;

    @Input() nmfResult: any;
    @Input() reportEntryIndex: number;

    constructor(d3Service: D3Service) {
        this.d3 = d3Service.getD3();
    }

    ngAfterViewInit(): void {
        if (this.nmfResult) {
            //let svg = this.d3.select("#brief-nmf-chart-" + this.reportEntryIndex);
            //this.initChart(svg, 300, 400);
            //this.startWithData(this.prepareChartData(this.nmfResult), this.prepareChartData(this.nmfResult))
            this.drawBarchart(this.prepareChartData(this.nmfResult));
        }
    }

    private prepareChartData(nmfResult: any): any[] {
        let result: any[] = [];
        for (let topic of nmfResult.topicEstimation) {
            let terms: string = "";
            let scoreSum: number = 0;
            for (let keyword of topic) {
                terms += keyword.term + " ";
                scoreSum += keyword.score;
            }
            terms = terms.trim();
            result.push({terms: terms, scoreSum: scoreSum});
        }
        return result;
    }

    /**
     * Call this method from template with nmf result to draw a bar chart using d3
     * @param data
     */
    drawBarchart(data: any[]): void {
        let d3 = this.d3;
        let svg = d3.select("#brief-nmf-chart-" + this.reportEntryIndex).style("z-index", "-1");

        let margin = {top: 5, right: 5, bottom: 50, left: 50};
        let width = +svg.attr("width") - margin.left - margin.right;
        let height = +svg.attr("height") - margin.top - margin.bottom;


        let g = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        let barColor: string = 'rgba(85, 216, 239, 0.6)';

        //sorting
        data.sort(function (a: any, b: any) {
            return a.scoreSum > b.scoreSum ? 1 : -1;
        });


        let dataScale = d3.scaleLinear()
            .domain([0, d3.max(data, function (entry: any) {
                return entry.scoreSum;
            })])
            .range([0, width]);
        let xAxis = d3.axisBottom(dataScale);

        g.append('g')
            .classed('x axis', true)
            .attr("transform", "translate(0, " + height + ")")
            .call(xAxis);

        // x value determined by indicator
        let termCount: number = 3;
        let keywordScale = d3.scaleBand()
            .domain(
                data.map(function (entry: any) {
                        if (!termCount) termCount = entry.terms.length;
                        return entry.terms;
                    }
                ))
            .range([height, 0])
            .paddingInner(0.1);

        let yAxis = d3.axisLeft(keywordScale);

        /*g.append('g')
            .classed('y axis', true)
            .call(yAxis);

        yAxisElement.selectAll("text")
            .attr("y", -4)
            .attr("x", 9)
            .style("text-anchor", "end");
        */


        let barHolder = g.append('g')
            .classed('bar-holder', true);

        // the height of the bars is determined by the scale
        let barHeight = keywordScale.bandwidth();

        // draw the bars
        let bars = barHolder.selectAll('rect.bar')
            .data(data)
            .enter().append('rect')
            .classed('bar', true)
            .attr('y', function (entry: any) {
                // the x value is determined by indicator name
                return keywordScale(entry.terms);
            })
            .attr('x', function (entry: any) {
                return 0;
            })
            .attr('height', barHeight)
            .attr('width', function (entry: any) {
                // the bar's height should align with the base of the chart (x=0)
                return dataScale(entry.scoreSum);
            }).attr("id", function (entry: any) {
                return entry.terms;
            });

        barHolder.selectAll('text').data(data).enter().append("text")
            .classed("text", true)
            .attr("x", 12)
            .attr("y", entry => keywordScale(entry.terms) + barHeight / 2 + 5)
            .attr("font-size", barHeight / 3 - termCount)
            .attr("fill", "rgba(0, 0, 0, 0.88")
            .text(entry => entry.terms);

        bars.attr("fill", function (d, i) {
            return barColor;
        });
    }
}