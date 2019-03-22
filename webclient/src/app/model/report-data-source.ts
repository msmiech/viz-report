/**
 * Created by Martin on 14.11.2017.
 * */
import {Observable} from "rxjs/Observable";
import {Report} from "./report";

export interface ReportDataSource {
    /**
     * Loads a report document from the supplied address respecting the passed parameters, which can be file type or URL type f.e.
     * @param {string[]} resourceAddresses
     * @param {Map<string, any>} params
     * @returns {Observable<Report>}
     */
    loadReport(resourceAddresses: string[], params?: Map<string, any>): Observable<Report>;
}