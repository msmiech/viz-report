/**
 Custom JS for BA_2017
 */

$(document).ready(function () {
    $('[data-toggle="tooltip"]').tooltip();
});

function drawLineChart() {

    var margin = {top: 20, right: 20, bottom: 30, left: 50},
        width = 960 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    var parseDate = d3.timeParse("%d-%b-%y");

    var x = techan.scale.financetime()
        .range([0, width]);

    var y = d3.scaleLinear()
        .range([height, 0]);

    var atr = techan.plot.atr()
        .xScale(x)
        .yScale(y);

    var xAxis = d3.axisBottom(x);

    var yAxis = d3.axisLeft(y)
        .tickFormat(d3.format(",.3s"));

    var svg = d3.select("body").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    d3.json("https://www.quandl.com/api/v3/datasets/LME/PR_CU.json?api_key=tHuu8FytBHG-RsJCPLc8", function (error, data) {
        var accessor = atr.accessor();

        data = data.map(function (d) {
            // Open, high, low, close generally not required, is being used here to demonstrate colored volume
            // bars
            return {
                date: parseDate(d.Date),
                volume: +d.Volume,
                open: +d.Open,
                high: +d.High,
                low: +d.Low,
                close: +d.Close
            };
        }).sort(function (a, b) {
            return d3.ascending(accessor.d(a), accessor.d(b));
        });

        svg.append("g")
            .attr("class", "atr");

        svg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")");

        svg.append("g")
            .attr("class", "y axis")
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", ".71em")
            .style("text-anchor", "end")
            .text("Average True Range");

        // Data to display initially
        drawData(data.slice(0, data.length - 20));
        // Only want this button to be active if the data has loaded
        d3.select("button").on("click", function () {
            drawData(data);
        }).style("display", "inline");
    });


}

function drawData(data) {
    var atrData = techan.indicator.atr()(data);
    x.domain(atrData.map(atr.accessor().d));
    y.domain(techan.scale.plot.atr(atrData).domain());

    svg.selectAll("g.atr").datum(atrData).call(atr);
    svg.selectAll("g.x.axis").call(xAxis);
    svg.selectAll("g.y.axis").call(yAxis);
}

