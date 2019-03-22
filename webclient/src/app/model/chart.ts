/**
 * Created by Dea on 26.07.2017.
 */
export class Chart {

    //chart id (for css)
    id: string;

    //Name of the target market/index
    targetMarket: string;

    //defines if chart is for the correlation coefficient ranking, CI , target market or ATR.
    chartType: string;

    chartWidth: number;

    //Initial time period of the chart
    startDate: string;
    endDate: string;

}
