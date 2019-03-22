import {D3, D3Service} from "d3-ng2-service";

export class MathUtils{

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
}