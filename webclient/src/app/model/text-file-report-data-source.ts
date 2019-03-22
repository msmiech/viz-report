/**
 * Created by Martin on 14.11.2017.
 * */
import {ReportDataSource} from "./report-data-source";
import {Observable} from "rxjs/Observable";
import {Report} from "./report";
import 'rxjs/add/observable/of';
import {ReportEntry} from "./report-entry";

export class TextFileReportDataSource implements ReportDataSource {

    private static readonly KEY_FILES: string = "files";
    private static readonly DESCRIPTION_MAX_LENGTH: number = 256;

    //implementation of ReportDataSource
    loadReport(resourceAddresses: string[], params?: Map<string, any>): Observable<Report> {
        if (!params || !params.has(TextFileReportDataSource.KEY_FILES)) {
            console.error("Necessary files parameter missing!");
            return null;
        }
        let files: any[] = params.get(TextFileReportDataSource.KEY_FILES);
        if (!files || files.length == 0) {
            console.error("No files provided for report loading!");
            return null;
        }
        let items: ReportEntry[] = [];
        for (let file of files) {
            let fileReader: FileReader = new FileReader();
            fileReader.onload = () => {
                //text is the content of the file
                let text: string = fileReader.result;
                if (!text || text.length == 0) {
                    console.log("No text for this file available");
                    return;
                }

                //parsing and prepping
                text = text.replace(/^\s*[\r\n]/gm, ""); //removing empty lines
                let splitText: string[] = text.split("\n");
                if (splitText.length < 2 || text.match(/\./g).length < 2) { //content sanity check
                    alert("Warning: The file " + file.name + " contains less than two lines! The processing pipeline does not support documents with less than two lines.");
                }
                let date: Date = null;
                let title: string = splitText[0];
                if (splitText[0].includes("|")) {
                    let splitTitle = title.split("|");
                    if (splitTitle.length > 1) {
                        date = new Date(splitTitle[0]);
                        title = splitTitle[1];
                    }
                }
                let description: string = "";
                if (splitText.length > 1) {
                    description = splitText.slice(1, Math.min(3, splitText.length)).join(" "); //omit first line and join rest
                    if (description.length > TextFileReportDataSource.DESCRIPTION_MAX_LENGTH) {
                        description = description.substring(0, TextFileReportDataSource.DESCRIPTION_MAX_LENGTH) + "...";
                    }
                }

                let entry: ReportEntry = {
                    title: title,
                    link: null,
                    guid: null,
                    pubDate: date,
                    categories: [],
                    author: null,
                    thumbnail: null,
                    description: description, //minimum required field
                    content: text, //minimum required field in this implementation
                    evals: []
                };
                items.push(entry);

            };
            if (fileReader) {
                fileReader.readAsText(file);
            }
        }

        let result: Report = {
            status: "File loaded",
            feed: null,
            items: items
        };
        return Observable.of(result);
    }
}