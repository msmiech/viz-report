/**
 * The following code is based on
 * https://github.com/becompany/angular2-rss-reader-tutorial
 */
import { ReportInfo } from './report-info';
import { ReportEntry } from './report-entry';

export interface Report {
    status: string,
    feed: ReportInfo,
    items: Array<ReportEntry>
}