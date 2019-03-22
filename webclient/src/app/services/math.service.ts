import {D3, D3Service} from "d3-ng2-service";
import {Injectable} from "@angular/core";

@Injectable()
export class MathService{

    private d3: D3;

    constructor(d3Service: D3Service){
        this.d3 = d3Service.getD3();
    }

    public normalizeData(data: any[]): any[] {
        let max = this.d3.max(data, function (d) {
            return d.value;
        });
        let min = this.d3.min(data, function (d) {
            return d.value;
        });
        let maxSubMin = max - min;

        return data.map(function (entry) {
            let normalizedValue = (entry.value - min);
            normalizedValue = maxSubMin == 0 ? 0.5 : normalizedValue / (maxSubMin);
            return {date: entry.date, value: normalizedValue};
        });
    }

    //Input is an array of numbers for which the average should be calculated
    calcAverage(values: number[]): number {
        let sum = 0;
        for (let i = 0; i < values.length; i++) {
            sum += values[i];
        }
        return sum / values.length;
    }

    //index and indicator are arrays of numbers
    public getCorrCoefficient(index: any[], indicator: any[]): number {

        let n = index.length;
        if (index.length != indicator.length) {
            n = Math.min(index.length, indicator.length);
        }
        if (n == 0){
            return 0;
        }

        let meanX = 0;
        let meanY = 0;
        for (let i = 0; i < n; i++) {
            meanX += index[i];
            meanY += indicator[i];
        }
        meanX = meanX / n;
        meanY = meanY / n;

        let num = 0;
        let den1 = 0;
        let den2 = 0;

        for (let i = 0; i < n; i++) {
            let dx = (index[i] - meanX);
            let dy = (indicator[i] - meanY);
            num += dx * dy;
            den1 += dx * dx;
            den2 += dy * dy
        }

        let den = Math.sqrt(den1) * Math.sqrt(den2);

        if (den == 0){
            return 0;
        }

        return num / den;
    }

}