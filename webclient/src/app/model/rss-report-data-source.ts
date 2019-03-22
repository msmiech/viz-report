/**
 * Created by Martin on 14.11.2017.
 * */
import {Http, Response} from '@angular/http';
import {Observable} from 'rxjs/Rx';
import {Report} from "./report";
import {ReportDataSource} from "./report-data-source";

export class RSSReportDataSource implements ReportDataSource {
    private static readonly RSS2JSON_BASE_URL: string = 'https://api.rss2json.com/v1/api.json?rss_url=';
    private static readonly RSS2JSON_COUNT_LIMIT: number = 15;
    //Warning: The following API key is for internal testing purposes only - get another one
    private static readonly RSS2JSON_API_KEY: string = 'z6hgvtruazf0ghcv27xrgo6ieyznezyet0i9khad';

    constructor(private http: Http) {
    }

    //implementation of ReportDataSource
    loadReport(resourceAddresses: string[], params?: Map<string, any>): Observable<Report> {
        let url: string = resourceAddresses[0];
        let count: number;
        if (params && params.size > 0) {
            count = params.get("count");
        }

        console.log("Attempting to load report from: " + url);

        if (RSSReportDataSource.RSS2JSON_API_KEY && count) {
            url += "&api_key=" + RSSReportDataSource.RSS2JSON_API_KEY;
            url += "&count=" + count;
        }
        return this.http.get(RSSReportDataSource.RSS2JSON_BASE_URL + url)
            .map(RSSReportDataSource.extractFeeds)
            .catch(this.handleError);

    }


    private static extractFeeds(res: Response): Report {
        let feed = res.json();
        return feed || {};
    }

    private handleError(error: any) {
        let errMsg = (error.message) ? error.message :
            error.status ? `${error.status} - ${error.statusText}` : 'Server error';
        console.error(errMsg);
        return Observable.throw(errMsg);
    }
}