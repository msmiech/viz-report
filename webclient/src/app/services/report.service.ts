/**
 * The following code is based on
 * https://github.com/becompany/angular2-rss-reader-tutorial
 */
import {Injectable} from '@angular/core';
import {Report} from "../model/report";
import {RSSReportDataSource} from "../model/rss-report-data-source";
import {TextFileReportDataSource} from "../model/text-file-report-data-source";
import {ReportDataSourceType} from "../model/report-data-source-type";
import {Http} from "@angular/http";
import {ReportDataSource} from "../model/report-data-source";
import {NlpControl} from "../model/nlp-control";
import {ReportEntry} from "../model/report-entry";
import {AccessService} from "./access.service";


@Injectable()
export class ReportService {
    public static readonly DEBUG: boolean = true;

    /*
     * HTTP URLs for development and testing (prototype)
     * HTTPS URLs available but require proper certificate otherwise blocked by browser!
     */
    private static readonly ldaUrl = "/lda";
    private static readonly tmUrl = "/termDocumentMatrix";
    private static readonly tfidfUrl = "/tfidf";
    private static readonly stopwordUrl = "/stopword";

    //private fields
    private loading: boolean = false;
    private rssDataSource: ReportDataSource; //notice interface ReportDataSource
    private textFileDataSource: ReportDataSource;

    //--------------Accessible fields
    report: Report;
    //selected report entry for details
    selectedReportEntry: ReportEntry;
    posSelection: any = {nouns: false, verbs: false, adjectives: false};

    /* --------------------------------
    * summary related accessible fields:
     */
    showSummary: boolean = false;
    //topic modelling:
    currentTopicModellingLib: string = NlpControl.LIB_NMF;//default value
    lastGlobalLdaResult: any;
    lastGlobalNmfResult: any;
    finalTextStreams: string[][] = []; //contains the (pre)processed results from the pipeline (per document) [docIdx][segIdx]
    topicModellingParamTopicCount: number = 2;
    topicModellingParamTermsEach: number = 3;

    //param-injection
    constructor(private http: Http, private accessService: AccessService) {
        this.rssDataSource = new RSSReportDataSource(http);
        this.textFileDataSource = new TextFileReportDataSource();
    }

    /**
     * Currently only supports RSS and text file data sources.
     */
    loadReportFromDataSource(dataSourceType: ReportDataSourceType, resourceAddresses: string[], params?: Map<string, any>): void {
        if (!resourceAddresses || resourceAddresses.length == 0) {
            console.error("No resource addresses provided!");
            return;
        }

        if (this.loading) {
            console.error("Report loading already in progress!");
            return;
        }

        this.loading = true;
        try {
            switch (dataSourceType) {
                case ReportDataSourceType.RSS:
                    this.rssDataSource.loadReport(resourceAddresses, params)
                        .subscribe((data: any) => {
                                if (!data || data.status == "error") {
                                    console.error(data.message);
                                    return;
                                }
                                console.log("Report loading done!");
                                this.report = data as Report;
                                this.loading = false;
                            }
                        );
                    break;
                case ReportDataSourceType.TextFile:
                    this.textFileDataSource.loadReport(resourceAddresses, params).subscribe((data: any) => {
                        this.report = data as Report;
                        this.loading = false;
                    });
                    break;
            }
        } catch (e) {
            console.error(<Error>e.message);
            this.loading = false;
        }

    }

    isLoading(): boolean {
        return this.loading;
    }

    reset(deleteReports?: boolean): void {
        this.showSummary = false;
        this.posSelection = {nouns: false, verbs: false, adjectives: false}; //reset pos filters
        this.lastGlobalNmfResult = null;
        this.lastGlobalLdaResult = null;
        this.finalTextStreams = [];

        if (this.report && !deleteReports) {
            //Emptying all report evals
            for (let feedEntry of this.report.items) {
                feedEntry.evals = [];
            }
        } else {
            this.report = null;
        }
    }

    showBriefSummaries(): boolean {
        if (this.report && this.report.items) {
            for (let feedEntry of this.report.items) {
                if (this.showBriefSummariesForEntry(feedEntry)) {
                    return true;
                }
            }
        }
        return false;
    }

    showGlobalSummary(): boolean {
        if (this.report && this.report.items) {
            for (let feedEntry of this.report.items) {
                for (let evaluation of feedEntry.evals) {
                    if (evaluation.operation.feature == NlpControl.TOPIC) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    /**
     * Checks whether an entry does have brief summaries for entry. This method can't be static otherwise it won't be discovered in views.
     * @param {ReportEntry} feedEntry
     * @returns {boolean}
     */
    showBriefSummariesForEntry(feedEntry: ReportEntry): boolean {
        if (feedEntry && feedEntry.evals) {
            for (let evaluation of feedEntry.evals) {
                if (this.evalHasTextRepresentation(evaluation)) {
                    return true;
                } //else continue
            }
        }
        return false;
    }


    evalHasTextRepresentation(evaluation: any) {
        switch (evaluation.operation.feature) {
            case NlpControl.TOPIC:
            case NlpControl.SENTIMENT:
            case NlpControl.TERMLIST_RATING:
                return true;
        }
        return false;
    }

    //Retrieval methods
    /**
     * Executes latent dirichlet analysis on remote server
     */
    getLda(text: string[], topicCount: number, termsEach: number): Promise<any> {
        return this.http.post(this.accessService.buildUrl(ReportService.ldaUrl),
            {
            "text": text,
            "topicCount": topicCount,
            "termsEach": termsEach
        }).toPromise().then(res => {
            res = res.json();
            if (res["status"] === 200) {
                let ldaRes = res["lda"];

                return ldaRes;
            }
            return null;
        });
    }

    /**
     * Executes document tf-idf analysis on remote server
     */
    getTfidf(text: string[]): Promise<any> {
        return this.http.post(this.accessService.buildUrl(ReportService.tfidfUrl), {
            "text": text
        }).toPromise().then(res => {
            res = res.json();
            if (res["status"] === 200) {
                let tfidfRes = res["tfidf"];

                return tfidfRes;
            }
            return null;
        });
    }

    /**
     * Executes term document matrix creation on remote server
     */
    getTermDocumentMatrix(text: string[]): Promise<any> {
        return this.http.post(this.accessService.buildUrl(ReportService.tmUrl), {
            "text": text
        }).toPromise().then(res => {
            res = res.json();
            if (res["status"] === 200) {
                let tfidfRes = res["tm"];

                return tfidfRes;
            }
            return null;
        });
    }

    /**
     * Executes stop word removal on remote processing server
     */
    getStopWordRemovalResult(text: string[], stopwords?: string[]): Promise<any> {
        return this.http.post(this.accessService.buildUrl(ReportService.stopwordUrl), {
            "text": text,
            "stopwords": stopwords
        }).toPromise().then(res => {
            res = res.json();
            if (res["status"] === 200) {
                return res["stopwordremoval"];
            }
            return null;
        });
    }
}