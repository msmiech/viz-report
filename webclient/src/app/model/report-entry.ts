/**
 * The following code is based on
 * https://github.com/becompany/angular2-rss-reader-tutorial
 *
 * This structure is designed with RSS feeds in mind!
 */
import {ReportEntryEval} from "./report-entry-eval";

export interface ReportEntry {
    title: string,
    link: string,
    guid: string,
    pubDate: Date,
    categories: Array<string>,
    author: string,
    thumbnail: string,
    description: string,
    content: string, //minimum required field in this implementation
    evals: Array<ReportEntryEval>
}