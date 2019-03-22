import {Component} from '@angular/core';
import {NlpControl} from "../model/nlp-control";
import {AccessService} from "../services/access.service";
import {ReportService} from "../services/report.service";
import {ReportEntry} from "../model/report-entry";
import {ReportEntryEval} from "../model/report-entry-eval";
import {ReportUtils} from "../util/report-utils";

declare let $: any; //jQuery
declare let nlp: any; /// <reference types="compromise" />
declare let compendium: any; //compendium-js
declare let lda: any; //LDA


@Component({
    selector: 'nlp-card',
    templateUrl: '../views/nlp-card.component.html'
})
export class NlpComponent {

    private selectedNlpControlParamName: string;
    private mostRecentlyUsedTopicModellingLibrary: string = NlpControl.LIB_NMF; //nmf is default
    private paramDialogFieldValues: string[] = []; //temporal cache for field values - used in template
    private paramDialogBooleanValues: boolean[] = [];

    //Optimization for compendium-js
    private lastCompendiumResult: any[][] = [];
    private posSelectionDue: boolean = false;
    private sortFeedsByFeedScore: boolean = false;

    //template accessible fields
    nlpControls: NlpControl[] = [];
    showSummary: boolean;
    selectedNlpControl: NlpControl;


    constructor(private accessService: AccessService, private reportService: ReportService) {
        this.addNlpControl();
        //GUI param dialog boolean values need to be registered here
        this.paramDialogBooleanValues[NlpControl.POS_SELECTION_PARAM_NOUN] = false;
        this.paramDialogBooleanValues[NlpControl.POS_SELECTION_PARAM_NOUN] = false;
        this.paramDialogBooleanValues[NlpControl.POS_SELECTION_PARAM_NOUN] = false;
        this.paramDialogBooleanValues[NlpControl.POS_SELECTION_PARAM_HIGHLIGHT_ONLY] = false;
    }


    /* ------------------------------ Reference based methods -------------------------------
    * The following functions are in this component class on purpose(!) because angular templates can't directly access
    * other classes than it's associated component class!
    *
     */
    get FEATURES() {
        return NlpControl.FEATURES;
    }

    featureHasParams(feature: string): boolean {
        switch (feature) {
            case NlpControl.TERMLIST_RATING:
            case NlpControl.TOPIC:
            case NlpControl.SEGMENTATION:
            case NlpControl.STOP_WORD_REMOVAL:
            case NlpControl.POS_SELECTION:
                return true;
        }
        return false;
    }

    possibleParamNamesForFeature(feature: string): Array<string> {
        switch (feature) {
            case NlpControl.TERMLIST_RATING:
                return [NlpControl.TERMLIST_RATING_PARAM_POSITIVE, NlpControl.TERMLIST_RATING_PARAM_NEGATIVE];
            case NlpControl.TOPIC:
                return [NlpControl.TOPIC_PARAM_COUNT, NlpControl.TOPIC_PARAM_TERMS_EACH];
            case NlpControl.SEGMENTATION:
                return [NlpControl.SEGMENTATION_PARAM_SPLITTING];
            case NlpControl.STOP_WORD_REMOVAL:
                return [NlpControl.STOP_WORD_REMOVAL_PARAM_LIST];
            case NlpControl.POS_SELECTION:
                return [NlpControl.POS_SELECTION_PARAM_NOUN, NlpControl.POS_SELECTION_PARAM_VERB, NlpControl.POS_SELECTION_PARAM_ADJ, NlpControl.POS_SELECTION_PARAM_HIGHLIGHT_ONLY];
        }
        return [];
    }

    paramValueType(feature: string, paramName: string): string {
        switch (feature) {
            case NlpControl.TERMLIST_RATING:
                if (paramName == NlpControl.TERMLIST_RATING_PARAM_POSITIVE) {
                    return NlpControl.PARAM_TYPE_STRING_ARRAY;
                }
                if (paramName == NlpControl.TERMLIST_RATING_PARAM_NEGATIVE) {
                    return NlpControl.PARAM_TYPE_STRING_ARRAY;
                }
                break;
            case NlpControl.TOPIC:
                if (paramName == NlpControl.TOPIC_PARAM_COUNT) {
                    return NlpControl.PARAM_TYPE_NUMBER;
                }
                if (paramName == NlpControl.TOPIC_PARAM_TERMS_EACH) {
                    return NlpControl.PARAM_TYPE_NUMBER;
                }
                break;
            case NlpControl.SEGMENTATION:
                return NlpControl.PARAM_TYPE_SELECT_ONE;
            case NlpControl.STOP_WORD_REMOVAL:
                return NlpControl.PARAM_TYPE_STRING_ARRAY;
            case NlpControl.POS_SELECTION:
                return NlpControl.PARAM_TYPE_BOOLEAN;
        }
        return null;
    }

    possibleParamValues(feature: string, paramName: string): Array<string> {
        switch (feature) {
            case NlpControl.SEGMENTATION:
                if (paramName == NlpControl.SEGMENTATION_PARAM_SPLITTING)
                    return ["Sentence", "Paragraph", "Report"];
                break;
        }
        return [];
    }

    readParamValueFromFile(selectedNlpControlParamName: string, event: any) {
        let input = event.target;
        if (!input.files || input.files.length != 1) {
            console.log("No files selected!");
            return;
        }
        let selectedFile: any = input.files[0];
        let fileReader: FileReader = new FileReader();
        fileReader.onload = () => {
            // this 'text' is the content of the file
            let text: string = fileReader.result;
            if (!text || text.length == 0) {
                console.log("No text for this file available");
                return;
            }

            //parsing and prepping
            text = text.replace(/^\s*[\r\n]/gm, ""); //removing empty lines
            this.paramDialogFieldValues[selectedNlpControlParamName] = text.split("\n");
        };
        fileReader.readAsText(selectedFile);
    }

    /**
     * Delivers a selection of available nlp control features
     * @param {string} selectedFeature
     * @returns {Array<string>}
     */
    availableNlpFeatures(selectedFeature?: string): Array<string> {
        let result: Array<string> = [];
        if (selectedFeature) { //existing one is changed
            result.push(selectedFeature);
            for (let i = 0; i < this.nlpControls.length; i++) {
                if (this.nlpControls[i].feature == selectedFeature) {
                    if (i == 0) {
                        if (i == this.nlpControls.length - 1) {
                            this.availableNlpFeaturesAfterLast(result);
                            return result;
                        } else { //all inbetween
                            for (let j = 0; j < this.FEATURES.length; j++) {
                                if (this.FEATURES[j][0] == this.nlpControls[i + 1].feature) {
                                    break;
                                } else {
                                    result.push(this.FEATURES[j][0]);
                                }
                            }
                        }

                    }
                    if (i == this.nlpControls.length - 1) {
                        this.availableNlpFeaturesAfterLast(result);
                        return result;
                    }
                }
            }
        }
        else { //new one is added
            if (!this.nlpControls || this.nlpControls.length == 0) {
                for (let featureLibrariesPair of this.FEATURES) {
                    result.push(featureLibrariesPair[0]);
                }
            } else {
                for (let i = 0; i < this.FEATURES.length; i++) {
                    this.availableNlpFeaturesAfterLast(result);
                }
            }

        }

        return result;
    }

    private indexOfNlpFeature(nlpControlFeature: string): number {
        for (let i = 0; i < this.FEATURES.length; i++) {
            if (nlpControlFeature == this.FEATURES[i][0])
                return i;
        }
        return null; //no index found
    }

    availableNlpFeaturesAfterLast(result: Array<string>) {
        let insertionStarted = false;
        for (let i = 0; i < this.FEATURES.length; i++) {
            if (insertionStarted && !(result.indexOf(this.FEATURES[i][0]) >= 0)) {
                result.push(this.FEATURES[i][0]);
            }
            if (this.FEATURES[i][0] == this.nlpControls[this.nlpControls.length - 1].feature) {
                insertionStarted = true;
            }
        }
    }


    //--------------------------------------UI Methods----------------------------------
    addNlpControl(): void {
        let feature: string = this.availableNlpFeatures()[0];
        this.nlpControls.push(
            new NlpControl(
                feature,
                this.librariesForFeature(feature)[0],
                new Map()
            )
        );
        $(window).trigger('resize');
    }

    removeNlpControl(nlpControl: NlpControl): void {
        this.nlpControls.splice(this.nlpControls.indexOf(nlpControl), 1);
        $(window).trigger('resize');
    }

    onSelectedFeatureChange(nlpControl: NlpControl, featureValue: string): void {
        nlpControl.feature = featureValue;

        //Select first library if available
        let librariesForFeature = this.librariesForFeature(featureValue);
        if (librariesForFeature && librariesForFeature.length > 0) {
            nlpControl.library = librariesForFeature[0].toString();
        }
    }


    onSelectedLibraryChange(nlpControl: NlpControl, libraryValue: string): void {
        nlpControl.library = libraryValue;
    }

    onSelectedParamValueChanged(paramValue: string): void {
        if (!this.selectedNlpControl.params)
            this.selectedNlpControl.params = new Map();

        if (paramValue.includes("\n")) {
            this.selectedNlpControl.params.set(this.selectedNlpControlParamName, paramValue.split("\n"));

        } else {
            this.selectedNlpControl.params.set(this.selectedNlpControlParamName, [paramValue]);
        }
    }

    openNlpControlSettings(nlpControl: NlpControl): void {
        this.selectedNlpControl = nlpControl;

        //set currently selected param name to first available param
        let paramNames = this.possibleParamNamesForFeature(nlpControl.feature);
        if (paramNames && paramNames.length > 0) {
            this.selectedNlpControlParamName = paramNames[0];
        }

        $('#nlpSettingsDialog').modal('show');
    }

    librariesForFeature(featureName: string): Array<string> {
        if (featureName == null || featureName == "") {
            return [];
        }
        let filterResult = this.FEATURES.filter(feature => feature[0] === featureName)[0];
        if (filterResult && filterResult.length > 0) {
            return filterResult[1];
        }
        return [];
    }


    //-----------------------------NLP Operations-----------------------------------
    executeNlpPipeline(): void {
        //cleanup before run
        this.reportService.reset();
        this.lastCompendiumResult = [];
        this.posSelectionDue = false;

        if (ReportService.DEBUG) {
            console.time("pipeline"); //start time measuring for performance analysis
        }

        //Actual execution start
        let index: number = 0;
        for (let feedEntry of this.reportService.report.items) {
            let textStreamResult: string[] = this.applyNlpOperations(feedEntry, index++);
            this.reportService.finalTextStreams.push(textStreamResult);
        }
        if (this.sortFeedsByFeedScore) {
            this.reportService.report.items.sort(ReportUtils.compareReportEntriesBasedOnTermlistScore);
        }
        this.reportService.report = Object.assign({}, this.reportService.report); //cloning report object
        this.reportService.currentTopicModellingLib = this.mostRecentlyUsedTopicModellingLibrary;
        this.reportService.showSummary = this.showSummary;

        if (ReportService.DEBUG) {
            console.timeEnd("pipeline");
        }
    }

    private applyNlpOperations(feedEntry: ReportEntry, feedEntryIndex: number): string[] {
        let textStream: string[];
        let segmentationType: string;

        for (let nlpControl of this.nlpControls) {
            switch (nlpControl.feature) { //all expected features need to here
                case NlpControl.TERMLIST_RATING:
                    this.doTermlistRating(nlpControl, feedEntry, feedEntryIndex);
                    break;
                case NlpControl.SEGMENTATION: //
                    textStream = this.doSegmentation(nlpControl, feedEntry, feedEntryIndex);
                    if (nlpControl.params.has(NlpControl.SEGMENTATION_PARAM_SPLITTING)) { //sanity check for param
                        let segParSpl: string[] = nlpControl.params.get(NlpControl.SEGMENTATION_PARAM_SPLITTING);
                        if (segParSpl && segParSpl.length == 1) {
                            segmentationType = segParSpl[0];
                        }
                    }
                    break;
                case NlpControl.STEM:
                    textStream = this.doStemming(nlpControl, feedEntry, feedEntryIndex, textStream);
                    break;
                case NlpControl.POS_SELECTION:
                    textStream = this.doPos(nlpControl, feedEntry, feedEntryIndex, textStream);
                    break;
                case NlpControl.STOP_WORD_REMOVAL:
                    textStream = this.doStopwordRemoval(nlpControl, feedEntry, feedEntryIndex, textStream, segmentationType);
                    break;
                case NlpControl.SENTIMENT:
                    textStream = this.doSentiment(nlpControl, feedEntry, feedEntryIndex, textStream);
                    break;
                case NlpControl.TOPIC:
                    textStream = this.doTopics(nlpControl, feedEntry, feedEntryIndex, textStream);
                    break;
                case NlpControl.TFIDF:
                    textStream = this.doTfidf(nlpControl, feedEntry, feedEntryIndex, textStream);
                    break;
            }
        }

        return textStream;

    }

    resetNlpOperations(): void {
        this.nlpControls = [];
        this.lastCompendiumResult = [];
        this.posSelectionDue = false;
        this.paramDialogFieldValues = [];
        this.paramDialogBooleanValues = [];
        this.showSummary = false;

        this.sortFeedsByFeedScore = false;

        this.reportService.reset(false);

        this.addNlpControl();
    }


    //------------------------------------------Specific NLP operations----------------------------------------

    private doTermlistRating(nlpControl: NlpControl, elem: ReportEntry, feedEntryIndex: number, textStream?: string[]): string[] {
        if (!nlpControl.params ||
            nlpControl.params.size == 0 ||
            (!nlpControl.params.has(NlpControl.TERMLIST_RATING_PARAM_POSITIVE) && !nlpControl.params.has(NlpControl.TERMLIST_RATING_PARAM_NEGATIVE))) {
            console.log("Nothing to do with termlist rating since no terms provided");
            return null;
        }
        let plainText: string = ReportUtils.removeHtmlTagsFromString(elem.content).toLowerCase();

        let positiveResult: number = 0;
        let positiveMap: Map<string, number>;
        if (nlpControl.params.has(NlpControl.TERMLIST_RATING_PARAM_POSITIVE)) {
            let positiveTerms: string[] = nlpControl.params.get(NlpControl.TERMLIST_RATING_PARAM_POSITIVE);
            positiveMap = ReportUtils.countOccurencesOfTermsInText(positiveTerms, plainText);
            for (let value of Array.from(positiveMap.values())) {
                positiveResult += value;
            }
        }


        let negativeResult: number = 0;
        let negativeMap: Map<string, number>;
        if (nlpControl.params.has(NlpControl.TERMLIST_RATING_PARAM_NEGATIVE)) {
            let negativeTerms: string[] = nlpControl.params.get(NlpControl.TERMLIST_RATING_PARAM_NEGATIVE);
            negativeMap = ReportUtils.countOccurencesOfTermsInText(negativeTerms, plainText);
            for (let value of Array.from(negativeMap.values())) {
                negativeResult += value;
            }
        }

        //do sorting if successful
        this.sortFeedsByFeedScore = true;

        if (positiveMap && negativeMap) {
            elem.evals.push(
                new ReportEntryEval(
                    nlpControl,
                    {
                        "PositiveSum": positiveResult,
                        "NegativeSum": negativeResult,
                        "PositiveMap": positiveMap,
                        "NegativeMap": negativeMap
                    } //Strings as keys accepted here only
                )
            );
        } else {
            elem.evals.push(
                new ReportEntryEval(
                    Object.assign({}, nlpControl),
                    {"PositiveSum": positiveResult, "NegativeSum": negativeResult} //Strings as keys accepted here only
                )
            );
        }

        return textStream;
    }

    private doSegmentation(nlpControl: NlpControl, elem: ReportEntry, feedEntryIndex: number, textStream?: string[]): string[] {
        if (!nlpControl.params) {
            nlpControl.params = new Map();
        }
        if (!nlpControl.params.has(NlpControl.SEGMENTATION_PARAM_SPLITTING)) {
            nlpControl.params.set(NlpControl.SEGMENTATION_PARAM_SPLITTING, ["Sentence"]); //default
        }
        let splitting: string = nlpControl.params.get(NlpControl.SEGMENTATION_PARAM_SPLITTING)[0];

        let text: string = textStream ? textStream.join() : elem.content; //latter containing html tags
        return ReportUtils.splitHtmlString(text, splitting);
    }


    private doStemming(nlpControl: NlpControl, elem: ReportEntry, feedEntryIndex: number, textStream?: string[]): string[] {
        if (!textStream) {
            console.log("Stemming: No text stream to be processed!");
            textStream = [ReportUtils.removeHtmlTagsFromString(elem.content)];
        }
        switch (nlpControl.library) {
            case NlpControl.LIB_COMPENDIUM:
                if (!this.lastCompendiumResult[feedEntryIndex]) {
                    this.lastCompendiumResult[feedEntryIndex] = [];
                }
                for (let i = 0; i < textStream.length; i++) {
                    if (!this.lastCompendiumResult[feedEntryIndex][i]) {
                        this.lastCompendiumResult[feedEntryIndex][i] = compendium.analyse(textStream[i]); //one compendium result per document segment
                    }
                }
                let compRes = this.lastCompendiumResult[feedEntryIndex];
                elem.evals.push(new ReportEntryEval(Object.assign({}, nlpControl), compRes));
                break;

        }
        return textStream;
    }

    private doPos(nlpControl: NlpControl, elem: ReportEntry, feedEntryIndex: number, textStream?: string[]): string[] {
        if (!textStream) {
            console.log("PoS: No text stream to be processed! Using document content.");
            textStream = [ReportUtils.removeHtmlTagsFromString(elem.content)];
        }


        if (nlpControl.params && nlpControl.params.size > 0) {
            if (nlpControl.params.has(NlpControl.POS_SELECTION_PARAM_NOUN)) {
                this.reportService.posSelection.nouns = nlpControl.params.get(NlpControl.POS_SELECTION_PARAM_NOUN)[0] === "true";
            }

            if (nlpControl.params.has(NlpControl.POS_SELECTION_PARAM_VERB)) {
                this.reportService.posSelection.verbs = nlpControl.params.get(NlpControl.POS_SELECTION_PARAM_VERB)[0] === "true";
            }

            if (nlpControl.params.has(NlpControl.POS_SELECTION_PARAM_ADJ)) {
                this.reportService.posSelection.adjectives = nlpControl.params.get(NlpControl.POS_SELECTION_PARAM_ADJ)[0] === "true";
            }

            if (nlpControl.params.has(NlpControl.POS_SELECTION_PARAM_HIGHLIGHT_ONLY)) {
                this.posSelectionDue = nlpControl.params.get(NlpControl.POS_SELECTION_PARAM_HIGHLIGHT_ONLY)[0] !== "true";
            }
        }


        this.posSelectionDue = this.reportService.posSelection.nouns || this.reportService.posSelection.verbs ||this.reportService.posSelection.adjectives;

        switch (nlpControl.library) {
            case NlpControl.LIB_COMPENDIUM: //this actually only creates a compendium result, actual selection is lazy
                if (!this.lastCompendiumResult[feedEntryIndex]) {
                    this.lastCompendiumResult[feedEntryIndex] = [];
                }
                for (let i = 0; i < textStream.length; i++) {
                    if (!this.lastCompendiumResult[feedEntryIndex][i]) {
                        /*if (!textStream[i]) { //should not happen
                            throw Error("Text stream for document entry " + feedEntryIndex + " and segment " + i + " is undefined!");
                        }*/
                        this.lastCompendiumResult[feedEntryIndex][i] = compendium.analyse(textStream[i]); //one compendium result per document segment
                    }
                }
                let compRes = this.lastCompendiumResult[feedEntryIndex];
                elem.evals.push(new ReportEntryEval(Object.assign({}, nlpControl), compRes));
                break;
            case NlpControl.LIB_COMPROMISE:
                let doc = nlp(textStream);
                elem.evals.push(new ReportEntryEval(Object.assign({}, nlpControl), doc));
                break;
        }

        if (this.posSelectionDue) {
            return this.doPosSelection(textStream, feedEntryIndex, this.reportService.posSelection, nlpControl.library);
        }

        return textStream;
    }

    private doPosSelection(textStream: string[], feedEntryIndex: number, posSelection: any, library?: string): string[] {
        if (!textStream || textStream.length == 0) {
            console.error("PoS selection: No text stream passed to PoS selection!");
            return null;
        }

        if (!posSelection || (!posSelection.nouns && !posSelection.verbs && !posSelection.adjectives)) {
            console.log("PoS selection: No part of speech tags to be selected! Aborting.");
            return textStream;
        }

        if (!library) {
            library = NlpControl.LIB_COMPENDIUM; //default lib is compendium, may be extended in future
        }

        if (library == NlpControl.LIB_COMPENDIUM) {
            if (!this.lastCompendiumResult || !this.lastCompendiumResult[feedEntryIndex] || this.lastCompendiumResult[feedEntryIndex].length == 0) {
                console.error("PoS selection: No compendium result for document at index " + feedEntryIndex + "!");
                return null;
            }

            let compRes: any = this.lastCompendiumResult[feedEntryIndex];
            textStream = ReportUtils.posSelectionUsingCompendiumResult(compRes, posSelection);
        }

        return textStream;

    }

    private doSentiment(nlpControl: NlpControl, elem: ReportEntry, feedEntryIndex: number, textStream?: string[]): string[] {
        if (!textStream) {
            console.log("sentiment: No text stream to be processed!");
            textStream = [ReportUtils.removeHtmlTagsFromString(elem.content)];
        }

        switch (nlpControl.library) {
            case NlpControl.LIB_COMPENDIUM:
                if (!this.lastCompendiumResult[feedEntryIndex]) {
                    this.lastCompendiumResult[feedEntryIndex] = [];
                }
                for (let i = 0; i < textStream.length; i++) {
                    if (!this.lastCompendiumResult[feedEntryIndex][i]) {
                        this.lastCompendiumResult[feedEntryIndex][i] = compendium.analyse(textStream[i]); //one compendium result per document segment
                    }
                }
                let compRes = this.lastCompendiumResult[feedEntryIndex];
                elem.evals.push(new ReportEntryEval(Object.assign({}, nlpControl), compRes));
                break;
        }
        return textStream;
    }

    private doTopics(nlpControl: NlpControl, elem: ReportEntry, feedEntryIndex: number, textStream?: string[]): string[] {
        if (!textStream) {
            console.log("topic-modelling: No text stream to be processed!");
            textStream = [ReportUtils.removeHtmlTagsFromString(elem.content)];
        }

        if (!nlpControl.params) {
            nlpControl.params = new Map();
        }

        if (!nlpControl.params.has(NlpControl.TOPIC_PARAM_COUNT)) {
            nlpControl.params.set(NlpControl.TOPIC_PARAM_COUNT, [NlpControl.TOPIC_PARAM_COUNT_DEFAULT]); //2 is default
        }
        let topicCount: number = nlpControl.params.get(NlpControl.TOPIC_PARAM_COUNT)[0];
        this.reportService.topicModellingParamTopicCount = topicCount; //passing topic count to reportservice for global summary

        if (!nlpControl.params.has(NlpControl.TOPIC_PARAM_TERMS_EACH)) {
            nlpControl.params.set(NlpControl.TOPIC_PARAM_TERMS_EACH, [NlpControl.TOPIC_PARAM_TERMS_EACH_DEFAULT]); //3 is default
        }
        let termsEach: number = nlpControl.params.get(NlpControl.TOPIC_PARAM_TERMS_EACH)[0];
        this.reportService.topicModellingParamTermsEach = topicCount; //passing terms each to reportservice for global summary

        this.mostRecentlyUsedTopicModellingLibrary = nlpControl.library; //can only be one per pipeline execution

        switch (nlpControl.library) {
            case NlpControl.LIB_NMF:
                /* Remote term-document-matrix (dtm) with tf-idf weighting
                let nmfResult: any;
                this.reportService.getTermDocumentMatrix(textStream).then(res => {
                    console.log("text-miner result: ");
                    console.log(res);
                    nmfResult = ReportUtils.nmfTopicModelling(textStream, topicCount, termsEach, [elem.title]);
                    elem.evals.push(new ReportEntryEval(nlpControl, nmfResult));
                });*/
                let nmfResult = ReportUtils.nmfTopicModelling(textStream, topicCount, termsEach, [elem.title]);
                elem.evals.push(new ReportEntryEval(Object.assign({}, nlpControl), nmfResult));
                break;
            case NlpControl.LIB_LDA_REMOTE:
                this.reportService.getLda(textStream, topicCount, termsEach).then(res => {
                    elem.evals.push(new ReportEntryEval(Object.assign({}, nlpControl), res));
                });
                break;
        }
        return textStream;
    }

    //remote tfidf!
    private doTfidf(nlpControl: NlpControl, elem: ReportEntry, feedEntryIndex: number, textStream?: string[]): string[] {
        if (!textStream) {
            console.log("tf-idf: No text stream to be processed!");
            textStream = [ReportUtils.removeHtmlTagsFromString(elem.content)];
        }
        switch (nlpControl.library) {
            case NlpControl.LIB_DOCUMENT_TFIDF_REMOTE:
                if (!nlpControl.params || nlpControl.params.size == 0) {
                    nlpControl.params = new Map();
                    //nlpControl.params.set("Splitting", ["Sentence"]);
                }
                //let splitting = nlpControl.params.get("Splitting")[0];

                this.reportService.getTfidf(textStream).then(res => {
                    elem.evals.push(new ReportEntryEval(nlpControl, res));
                    console.log("tfidf result: ");
                    console.log(res);
                });

                break;
        }
        return textStream;
    }

    private doStopwordRemoval(nlpControl: NlpControl, elem: ReportEntry, feedEntryIndex: number, textStream?: string[], segmentationType?: string): string[] {
        if (!textStream) {
            console.log("stopwordremoval: No text stream to be processed!");
            textStream = [ReportUtils.removeHtmlTagsFromString(elem.content)];
        }
        let customStopwordList: string[];
        if (nlpControl.params.has(NlpControl.STOP_WORD_REMOVAL_PARAM_LIST)) {
            customStopwordList = nlpControl.params.get(NlpControl.STOP_WORD_REMOVAL_PARAM_LIST) as string[];
        }
        switch (nlpControl.library) {
            case NlpControl.LIB_NONE:
                let result = ReportUtils.stopwordRemoval(textStream, segmentationType, customStopwordList);
                textStream = result;
                elem.evals.push(new ReportEntryEval(Object.assign({}, nlpControl), result));
                break;
            case NlpControl.LIB_STOPWORD_REMOTE:
                this.reportService.getStopWordRemovalResult(textStream, customStopwordList).then(res => {
                    elem.evals.push(new ReportEntryEval(Object.assign({}, nlpControl), res));
                    textStream = res;
                });

                break;
        }
        return textStream;
    }


}

