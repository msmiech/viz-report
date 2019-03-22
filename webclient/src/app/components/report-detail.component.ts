import {Component, Input} from '@angular/core';
import {ReportService} from "../services/report.service";
import {ReportEntry} from "../model/report-entry";
import {ReportUtils} from "../util/report-utils";
import {NlpControl} from "../model/nlp-control";

declare let $: any;

@Component({
    selector: 'report-detail-dialog',
    templateUrl: '../views/report-detail-dialog.component.html'
})
export class ReportDetailComponent {

    //template accessible fields
    reportService: ReportService;
    ckbTopicHighlighting: boolean = true; //default true for all highlights
    ckbNounHighlighting: boolean = true;
    ckbVerbHighlighting: boolean = true;
    ckbAdjHighlighting: boolean = true;
    ckbSentimentHighlighting: boolean = true;
    ckbTermlistHighlighting: boolean = true;

    @Input() reportEntry: ReportEntry;

    //References
    //Referencing static methods here since templates can't access them
    removeHtmlTagsFromString = ReportUtils.removeHtmlTagsFromString; //used in report dialog template
    countPositiveSentiments = ReportUtils.countPositiveSentiments; //used in report dialog template
    countNegativeSentiments = ReportUtils.countNegativeSentiments; //used in report dialog template
    countNeutralSentiments = ReportUtils.countNeutralSentiments; //used in report dialog template

    constructor(reportService: ReportService) {
        this.reportService = reportService;
    }

    /**
     * Rendering of complete text for detailed view. Currently only compendium result is properly supported.
     * @param {ReportEntry} reportEntry
     * @returns {string}
     */
    renderCompleteText(reportEntry: ReportEntry) {
        if (ReportUtils.reportEntryHasLibraryResult(reportEntry, NlpControl.LIB_COMPENDIUM)) {
            return this.compendiumTextHighlighting(reportEntry);
        }
        return ReportUtils.removeHtmlTagsFromString(reportEntry.content);
    }

    /**
     * Render complete text for detailed TextVis using compendium result!
     * @param {ReportEntry} reportEntry
     * @returns {string}
     */
    compendiumTextHighlighting(reportEntry: ReportEntry): string {
        let textWithMarkup: string = "";

        let evaluations = reportEntry.evals.filter(evaluation =>
            evaluation.operation.feature == NlpControl.POS_SELECTION ||
            evaluation.operation.feature == NlpControl.SENTIMENT ||
            evaluation.operation.feature == NlpControl.TERMLIST_RATING ||
            evaluation.operation.feature == NlpControl.TOPIC
        );

        if (!evaluations || evaluations.length == 0) {
            console.log("No suitable evaluations found at compendiumTextHighlighting - aborting text highlighting and returning normal text.");
            return ReportUtils.removeHtmlTagsFromString(reportEntry.content);
        }

        //PoS-Vars
        let doNounHighlighting: boolean = false;
        let doVerbHighlighting: boolean = false;
        let doAdjHighlighting: boolean = false;
        //Sentiment-Var
        let doSentimentHighlighting: boolean = false;
        //Topic-Vars
        let doTopicHighlighting: boolean = false; //entire sentence
        let topicResult: any;
        let topicLib: string;
        //Termlist-Vars
        let doTermlistHighlighting: boolean = false;
        let positiveTermlist: string[] = [];
        let negativeTermlist: string[] = [];
        //Caches
        let compendiumResults: any; //one result per segment of a document

        //Evaluations analysis
        for (let evaluation of evaluations) {
            let op = evaluation.operation;
            if (!compendiumResults && op.library == NlpControl.LIB_COMPENDIUM) {
                compendiumResults = evaluation.result; //of course, only the last result matters but should be the same for the same entry
            }
            if (op.feature == NlpControl.POS_SELECTION) { //if available then use checkbox value
                if (op.params.has(NlpControl.POS_SELECTION_PARAM_NOUN)) {
                    doNounHighlighting = this.ckbNounHighlighting && op.params.get(NlpControl.POS_SELECTION_PARAM_NOUN)[0] === "true";
                }

                if (op.params.has(NlpControl.POS_SELECTION_PARAM_VERB)) {
                    doVerbHighlighting = this.ckbVerbHighlighting && op.params.get(NlpControl.POS_SELECTION_PARAM_VERB)[0] === "true";
                }

                if (op.params.has(NlpControl.POS_SELECTION_PARAM_ADJ)) {
                    doAdjHighlighting = this.ckbAdjHighlighting && op.params.get(NlpControl.POS_SELECTION_PARAM_ADJ)[0] === "true";
                }
            }
            if (evaluation.operation.feature == NlpControl.SENTIMENT) {
                doSentimentHighlighting = this.ckbSentimentHighlighting;
            }
            if (evaluation.operation.feature == NlpControl.TOPIC) {
                doTopicHighlighting = this.ckbTopicHighlighting;
                topicResult = evaluation.result;
                topicLib = evaluation.operation.library;
            }
            if (evaluation.operation.feature == NlpControl.TERMLIST_RATING) {
                doTermlistHighlighting = this.ckbTermlistHighlighting;
                if (evaluation.operation.params.has(NlpControl.TERMLIST_RATING_PARAM_POSITIVE)) {
                    positiveTermlist = evaluation.operation.params.get(NlpControl.TERMLIST_RATING_PARAM_POSITIVE);
                }
                if (evaluation.operation.params.has(NlpControl.TERMLIST_RATING_PARAM_NEGATIVE)) {
                    negativeTermlist = evaluation.operation.params.get(NlpControl.TERMLIST_RATING_PARAM_NEGATIVE);
                }
            }
        }

        if (!compendiumResults) {
            let errorMsg: string = "No compendium results even though report has compendium evaluation!";
            console.error(errorMsg);
            return errorMsg;
        }

        //Actual rendering
        for (let compendiumResult of compendiumResults) { //compendium result per segment
            for (let line of compendiumResult) { //compendium results are always split per line
                let sentimentHighlighted: boolean = false;
                if (doSentimentHighlighting) {
                    if (line.profile.label == "positive") {
                        sentimentHighlighted = true;
                        textWithMarkup += '<span class="sentiment-positive">';
                    }
                    if (line.profile.label == "negative") {
                        sentimentHighlighted = true;
                        textWithMarkup += '<span class="sentiment-negative">';
                    }
                }

                let topicHighlighted: boolean = false;
                if (doTopicHighlighting) {

                    switch (topicLib) {
                        case NlpControl.LIB_NMF:
                            //TODO if segmentation == sentence -> highlight sentence with index == row index of max column value from W
                            /*let representativeSentences: number[] = [];
                            for (let i = 0; i < topicResult.topicEstimation.length; i++) {

                            }*/
                            let containsTopic: boolean = false;
                            lineLoop:
                                for (let i = 0; i < line.tokens.length; i++) {
                                    let token: any = line.tokens[i];
                                    for (let entry of topicResult.topicEstimation) {
                                        for (let currentTerm of entry) {
                                            if (token.raw == currentTerm.term) {
                                                containsTopic = true;
                                                break lineLoop;
                                            }

                                        }
                                    }
                                }
                            if (containsTopic) {
                                topicHighlighted = true;
                                textWithMarkup += '<span class="topic-line">';
                            }

                            break;
                    }
                }

                for (let i = 0; i < line.tokens.length; i++) {
                    let token: any = line.tokens[i]; //token is an object
                    let termlistPositiveHit: boolean = false;
                    let termlistNegativeHit: boolean = false;

                    if (doTermlistHighlighting) {
                        let term: string = (token.raw as string).toLowerCase();
                        if (term.length > 2) { //only check for terms with more than two characters
                            positiveLoop:
                                for (let positiveTerm of positiveTermlist) {
                                    if (positiveTerm.indexOf(" ") > -1) { //is n-gram
                                        if (positiveTerm.toLowerCase().indexOf(term) > -1) {
                                            //if (positiveTerm.toLowerCase() == term) {
                                            textWithMarkup += '<span class="termlist-positive">';
                                            termlistPositiveHit = true;
                                            break positiveLoop;
                                        }
                                    } else { //is unigram
                                        if (positiveTerm.toLowerCase() == term) {
                                            textWithMarkup += '<span class="termlist-positive">';
                                            termlistPositiveHit = true;
                                            break positiveLoop;
                                        }
                                    }
                                }
                            if (!termlistPositiveHit) { //avoid unnecessary negative check - assumption: term can't be both positive and negative
                                negativeLoop:
                                    for (let negativeTerm of negativeTermlist) {
                                        if (negativeTerm.indexOf(" ") > -1) { //is n-gram
                                            if (negativeTerm.toLowerCase().indexOf(term) > -1) {
                                                //if (positiveTerm.toLowerCase() == term) {
                                                textWithMarkup += '<span class="termlist-negative">';
                                                termlistNegativeHit = true;
                                                break negativeLoop;
                                            }
                                        } else {
                                            if (negativeTerm.toLowerCase() == term) {
                                                textWithMarkup += '<span class="termlist-negative">';
                                                termlistNegativeHit = true;
                                                break negativeLoop;
                                            }
                                        }
                                    }
                            }
                        }
                    }

                    if (doNounHighlighting && token.pos.startsWith("NN")) {
                        textWithMarkup += '<span class="pos-tag pos-tag-noun"> ' + token.raw + '</span>';
                    }
                    else if (doVerbHighlighting && token.pos.startsWith("VB")) {
                        textWithMarkup += '<span class="pos-tag pos-tag-verb"> ' + token.raw + '</span>';
                    }
                    else if (doAdjHighlighting && token.pos.startsWith("JJ")) {
                        textWithMarkup += '<span class="pos-tag pos-tag-adj"> ' + token.raw + '</span>';
                    }
                    else {
                        textWithMarkup += " " + token.raw;
                    }

                    if (doTermlistHighlighting && (termlistNegativeHit || termlistPositiveHit)) {
                        textWithMarkup += '</span>';
                    }
                }
                if (doSentimentHighlighting && sentimentHighlighted) {
                    textWithMarkup += '</span>';
                }
                if (doTopicHighlighting && topicHighlighted) {
                    textWithMarkup += '</span>';
                }
            }
        }
        return textWithMarkup;
    }
}