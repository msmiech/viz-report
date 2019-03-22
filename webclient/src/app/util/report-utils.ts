import {Report} from "../model/report";
import {ReportEntry} from "../model/report-entry";
import {NlpControl} from "../model/nlp-control";

/**
 * Needs to available before first usage!
 */
declare let Snowball: any;
declare let nmf: any; //ext nmf library lib
declare let nlp: any; //compromise
declare let d3: any; //d3

/**
 * A utility class for report related operations. It's designed to contain static functions only.
 */
export class ReportUtils {

    private static readonly en_stopwords: string[] = ["a", "a's", "able", "about", "above", "according", "accordingly", "across", "actually", "after", "afterwards", "again", "against", "ain't", "all", "allow", "allows",
        "almost", "alone", "along", "already", "also", "although", "always", "am", "among", "amongst", "an", "and", "another", "any", "anybody", "anyhow", "anyone", "anything", "anyway", "anyways",
        "anywhere", "apart", "appear", "appreciate", "appropriate", "are", "aren't", "around", "as", "aside", "ask", "asking", "associated", "at", "available", "away", "awfully", "b", "be", "became",
        "because", "become", "becomes", "becoming", "been", "before", "beforehand", "behind", "being", "believe", "below", "beside", "besides", "best", "better", "between", "beyond", "both", "brief",
        "but", "by", "c", "c'mon", "c's", "came", "can", "can't", "cannot", "cant", "cause", "causes", "certain", "certainly", "changes", "clearly", "co", "com", "come", "comes", "concerning",
        "consequently", "consider", "considering", "contain", "containing", "contains", "corresponding", "could", "couldn't", "course", "currently", "d", "definitely", "described", "despite",
        "did", "didn't", "different", "do", "does", "doesn't", "doing", "don't", "done", "down", "downwards", "during", "e", "each", "edu", "eg", "eight", "either", "else", "elsewhere", "enough",
        "entirely", "especially", "et", "etc", "even", "ever", "every", "everybody", "everyone", "everything", "everywhere", "ex", "exactly", "example", "except", "f", "far", "few", "fifth",
        "first", "five", "followed", "following", "follows", "for", "former", "formerly", "forth", "four", "from", "further", "furthermore", "g", "get", "gets", "getting", "given", "gives", "go",
        "goes", "going", "gone", "got", "gotten", "greetings", "h", "had", "hadn't", "happens", "hardly", "has", "hasn't", "have", "haven't", "having", "he", "he's", "hello", "help", "hence", "her",
        "here", "here's", "hereafter", "hereby", "herein", "hereupon", "hers", "herself", "hi", "him", "himself", "his", "hither", "hopefully", "how", "howbeit", "however", "i", "i'd", "i'll", "i'm",
        "i've", "ie", "if", "ignored", "immediate", "in", "inasmuch", "inc", "indeed", "indicate", "indicated", "indicates", "inner", "insofar", "instead", "into", "inward", "is", "isn't", "it",
        "it'd", "it'll", "it's", "its", "itself", "j", "just", "k", "keep", "keeps", "kept", "know", "knows", "known", "l", "last", "lately", "later", "latter", "latterly", "least", "less", "lest",
        "let", "let's", "like", "liked", "likely", "little", "look", "looking", "looks", "ltd", "m", "mainly", "many", "may", "maybe", "me", "mean", "meanwhile", "merely", "might", "more", "moreover",
        "most", "mostly", "much", "must", "my", "myself", "n", "name", "namely", "nd", "near", "nearly", "necessary", "need", "needs", "neither", "never", "nevertheless", "new", "next", "nine", "no",
        "nobody", "non", "none", "noone", "nor", "normally", "not", "nothing", "novel", "now", "nowhere", "o", "obviously", "of", "off", "often", "oh", "ok", "okay", "old", "on", "once", "one", "ones",
        "only", "onto", "or", "other", "others", "otherwise", "ought", "our", "ours", "ourselves", "out", "outside", "over", "overall", "own", "p", "particular", "particularly", "per", "perhaps",
        "placed", "please", "plus", "possible", "presumably", "probably", "provides", "q", "que", "quite", "qv", "r", "rather", "rd", "re", "really", "reasonably", "regarding", "regardless", "regards",
        "relatively", "respectively", "right", "s", "said", "same", "saw", "say", "saying", "says", "second", "secondly", "see", "seeing", "seem", "seemed", "seeming", "seems", "seen", "self",
        "selves", "sensible", "sent", "serious", "seriously", "seven", "several", "shall", "she", "should", "shouldn't", "since", "six", "so", "some", "somebody", "somehow", "someone", "something",
        "sometime", "sometimes", "somewhat", "somewhere", "soon", "sorry", "specified", "specify", "specifying", "still", "sub", "such", "sup", "sure", "t", "t's", "take", "taken", "tell", "tends",
        "th", "than", "thank", "thanks", "thanx", "that", "that's", "thats", "the", "their", "theirs", "them", "themselves", "then", "thence", "there", "there's", "thereafter", "thereby", "therefore",
        "therein", "theres", "thereupon", "these", "they", "they'd", "they'll", "they're", "they've", "think", "third", "this", "thorough", "thoroughly", "those", "though", "three", "through",
        "throughout", "thru", "thus", "to", "together", "too", "took", "toward", "towards", "tried", "tries", "truly", "try", "trying", "twice", "two", "u", "un", "under", "unfortunately", "unless",
        "unlikely", "until", "unto", "up", "upon", "us", "use", "used", "useful", "uses", "using", "usually", "uucp", "v", "value", "various", "very", "via", "viz", "vs", "w", "want", "wants", "was",
        "wasn't", "way", "we", "we'd", "we'll", "we're", "we've", "welcome", "well", "went", "were", "weren't", "what", "what's", "whatever", "when", "whence", "whenever", "where", "where's",
        "whereafter", "whereas", "whereby", "wherein", "whereupon", "wherever", "whether", "which", "while", "whither", "who", "who's", "whoever", "whole", "whom", "whose", "why", "will", "willing",
        "wish", "with", "within", "without", "won't", "wonder", "would", "would", "wouldn't", "x", "y", "yes", "yet", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
        "yourselves", "z", "zero"];

    //Seperators for typical data sets and sentences.
    private static readonly separators: string[] = [' ', '\\\(', '\\\)', '\\\.', '\\\,', '\\\"', '\\\:', "\\\[", "\\\]", "\\\;", "\\\|", "\\\@", "\\\?"];

    private static readonly filterSymbols: string[] = ["–", "-", "_", "'", "↵", "↵↵", "↵↵↵", "[", "]", "|", "↑", "→", "↓", "{}",
        "//", "=", "{", "}", "+", "?", "$", ">", "<", "''", "•", "/", "%", "--", "---", "&", "»", "«", "€"];

    private static readonly stemmer = Snowball ? new Snowball('English') : null; //declared js var instead of require


    /**
     * Removes HTML Tags from given string
     * @param {string} input
     * @returns {string}
     */
    public static removeHtmlTagsFromString(input: string): string {
        if (input == "") {
            return "";
        }
        if (!input) {
            console.error("removeHtmlTagsFromString: No input provided.");
            return null;
        }
        return input.replace(/<\/?[^>]+(>|$)/g, "");
    }

    /**
     * Removes HTML Tags from given string
     * @param {string} input
     * @returns {string}
     */
    public static removeHtmlTagsFromStringArray(input: string[]): string[] {
        for (let i = 0; i < input.length; i++) {
            input[i] = input[i].replace(/<\/?[^>]+(>|$)/g, "");
        }
        return input;
    }

    /**
     * Splits an HTML string using HTML tag info
     * @param {string} text A text string containing HTML tags
     * @param {string} splitting Type of splitting to be applied, e.g. "Sentence" or "Paragraph"
     * @returns {string[]}
     */
    public static splitHtmlString(text: string, splitting: string): string[] {
        let splitText: string[];
        switch (splitting) {
            case "Paragraph":
                text = text.replace(/^\s*[\r\n]/gm, ""); //remove empty lines
                splitText = text.match(/<p>.*?<\/p>/g);
                splitText = this.removeHtmlTagsFromStringArray(splitText);
                break;
            case "Sentence":
                text = this.removeHtmlTagsFromString(text);
                text = text.replace(/^\s*[\r\n]/gm, ""); //remove empty lines
                splitText = text.match(/[^\.!\?]+[\.!\?]+/g);
                break;
            case "Report":
                text = text.replace(/^\s*[\r\n]/gm, ""); //remove empty lines
                splitText = [text];
                splitText = this.removeHtmlTagsFromStringArray(splitText);
                break;
            default:
                text = text.replace(/^\s*[\r\n]/gm, ""); //remove empty lines
                splitText = text.match(/[^\.!\?]+[\.!\?]+/g);

        }
        return splitText;
    }

    /**
     * Compare function for report entries based on report score
     * This function calculates a report score for two feeds
     */
    public static compareReportEntriesBasedOnTermlistScore(fA: ReportEntry, fB: ReportEntry): number {
        if (!fA || !fB) {
            console.error("At least of the parameters to compare is undefined");
            return null;
        }
        if (!fA.evals || !fB.evals || fA.evals.length == 0 || fB.evals.length == 0) {
            console.error("At least one of the parameters has no evaluations");
            return null;
        }
        //assuming termlist scoring is the first eval
        if (!(fA.evals[0].operation.feature == NlpControl.TERMLIST_RATING) || !(fB.evals[0].operation.feature == NlpControl.TERMLIST_RATING)) {
            console.error("At least one of the parameters has no termlist rating evaluation");
            return null;
        }

        let resultA = fA.evals[0].result;
        let resultB = fB.evals[0].result;
        let feedScoreA: number = resultA.PositiveSum - resultA.NegativeSum;
        let feedScoreB: number = resultB.PositiveSum - resultB.NegativeSum;

        if (feedScoreA == feedScoreB) {
            //the difference is equal so take higher frequency
            feedScoreA = resultA.PositiveSum;
            feedScoreB = resultB.PositiveSum;
        }
        //for descending sort gt and lt are swapped!
        if (feedScoreA > feedScoreB) {
            return -1;
        }
        if (feedScoreA < feedScoreB) {
            return 1;
        }
        return 0; //equal
    }

    /**
     * Simple term frequency count
     * @param {Array<string>} termlist
     * @param {string} text
     * @returns {Map<string, number>}
     */
    public static countOccurencesOfTermsInText(termlist: Array<string>, text: string): Map<string, number> {
        let resultMap: Map<string, number> = new Map();
        for (let term of termlist) {
            let occurenceSum: number = ReportUtils.countOccurencesOfTermInText(term, text);
            resultMap.set(term, occurenceSum);
        }
        return resultMap;
    }

    private static countOccurencesOfTermInText(term: string, text: string): number {
        let result = text.toLowerCase().match(new RegExp(term.toLowerCase(), "g"));
        if (result) {
            return result.length;
        }
        return 0;
    }

    public static countPositiveSentiments(feedEntryEval: any): number {
        let count: number = 0;
        if (feedEntryEval.operation.feature) {
            switch (feedEntryEval.operation.library) {
                case NlpControl.LIB_COMPENDIUM:
                    for (let resSegment of feedEntryEval.result) {
                        for (let resLine of resSegment) {
                            if (resLine.profile.label == "positive") {
                                count++;
                            }
                        }
                    }
                    return count;
            }
        }
        return count;
    }

    public static countNeutralSentiments(feedEntryEval: any): number {
        let count: number = 0;
        if (feedEntryEval.operation.feature) {
            switch (feedEntryEval.operation.library) {
                case NlpControl.LIB_COMPENDIUM:
                    for (let resSegment of feedEntryEval.result) {
                        for (let resLine of resSegment) {
                            if (resLine.profile.label == "neutral") {
                                count++;
                            }
                        }
                    }
                    return count;
            }
        }
        return count;
    }

    public static countNegativeSentiments(feedEntryEval: any): number {
        let count: number = 0;
        if (feedEntryEval.operation.feature) {
            switch (feedEntryEval.operation.library) {
                case NlpControl.LIB_COMPENDIUM:
                    for (let resSegment of feedEntryEval.result) {
                        for (let resLine of resSegment) {
                            if (resLine.profile.label == "negative") {
                                count++;
                            }
                        }
                    }
                    return count;
            }
        }
        return count;
    }

    /**
     * Performs check all report entries whether its evaluation contains a certain feature
     * @param {ReportEntry[]} feedEntries Document entry objects including analysis result
     * @param {string} feature String name of feature that is looked for
     * @returns {boolean} Binary result whether it is contained or not
     */
    public static reportHasFeature(feedEntries: ReportEntry[], feature: string): boolean {
        for (let feedEntry of feedEntries) {
            if (ReportUtils.reportEntryHasFeature(feedEntry, feature)) {
                return true;
            }
        }
        return false;
    }


    /**
     * Performs check whether an document entry evaluation contains a certain feature
     * @param {ReportEntry} feedEntry Document entry object including analysis result
     * @param {string} feature String name of feature that is looked for
     * @returns {boolean} Binary result whether it is contained or not
     */
    public static reportEntryHasFeature(feedEntry: ReportEntry, feature: string): boolean {
        if (feedEntry.evals) {
            for (let evaluation of feedEntry.evals) {
                if (evaluation.operation.feature == feature)
                    return true;
            }
        }
        return false;
    }

    /**
     * Checking whether a given report entry does have an evaluation using a given library
     * @param {ReportEntry} feedEntry
     * @param {string} library
     * @returns {boolean}
     */
    public static reportEntryHasLibraryResult(feedEntry: ReportEntry, library: string): boolean {
        if (feedEntry.evals) {
            for (let evaluation of feedEntry.evals) {
                if (evaluation.operation.library == library)
                    return true;
            }
        }
        return false;
    }

    /**
     * Local stop word removal implementation using regex and filters
     * @param {string[]} texts Segmented string array for stopword removal
     * @param segmentation Info about type of segmentation regarding texts array (how it is split)
     * @param customStopwords An array of custom stopwords to be used in addition to standard english stopwords
     * @returns {string[]} Results in (same-way segmented) string array with removed stop words (if any)
     */
    public static stopwordRemoval(texts: string[], segmentation?: string, customStopwords?: string[]): string[] {
        if (!texts || texts.length == 0) {
            console.log("No texts passed for stopword removal! Doing nothing.");
            return null;
        }
        let result: string[] = texts;
        if (segmentation && segmentation != 'Sentence') { //need to preserve segmentation structure
            for (let i = 0; i < texts.length; i++) {
                let segmentResult: string = "";
                let sentences = texts[i].split(new RegExp("\\\.|\\\?|\\\!", 'g')); //split sentences withing segments
                for (let j = 0; j < sentences.length; j++) {
                    segmentResult += this.stopwordRemovalOnSentence(sentences[j], customStopwords) //joining words in array back to sentence.
                }
                result[i] = segmentResult;
            }
        } else { //if no segmentation has been provided or it is sentence based (default)
            for (let i = 0; i < texts.length; i++) {
                result[i] = this.stopwordRemovalOnSentence(texts[i], customStopwords);
            }
        }
        //removing empty segments
        result = this.removeEmptyArrayElements(result); //Cleaning result array

        return result;
    }

    private static stopwordRemovalOnSentence(sentence: string, customStopWords?: string[]): string {
        sentence = sentence.replace(/\d+/g, '');

        sentence = sentence.replace(/\s/g, " ");

        sentence = sentence.toLowerCase();

        let array = sentence.split(new RegExp(this.separators.join('|'), 'g')); //Split into words/unigrams

        array = array.filter(x => x != '');

        array = array.filter(x => this.filterSymbols.every(t => t != x));

        let stopwords = this.en_stopwords;
        if (customStopWords && customStopWords.length > 0) {
            stopwords = stopwords.concat(customStopWords);
        }
        array = array.filter(x => stopwords.every(t => t != x));

        //stemming (snowball) removed

        return array.join(" "); //joining words in array back to sentence
    }

    /**
     * Removes empty array elements that either have null as value or size 0
     * @param {string[]} segments string elements to be checked and cleaned
     * @returns {string[]} New string[] without empty elements.
     */
    public static removeEmptyArrayElements(segments: string[]): string[] {
        if (!segments || segments.length == 0)
            return segments;
        let result: string[] = [];
        for (let i = 0; i < segments.length; i++) {
            if (segments[i] && segments[i].length > 0) {
                result.push(segments[i]);
            }
        }
        return result;
    }

    /**
     * Stemming using Snowball.js stemmer
     * @param {string[]} text String text containing text for stemming
     * @returns {string[]} Results in stem map
     */
    public static stemming(text: string): any {
        if (!ReportUtils.stemmer) {
            console.error("ReportUtils.stemming: stemmer not initialized!");
            return;
        }

        let array = text.split(new RegExp(this.separators.join('|'), 'g'));

        let stemArray: string[] = [];

        let termMap = {};

        array.forEach(x => {
            this.stemmer.setCurrent(x);
            this.stemmer.stem();
            let stem = this.stemmer.getCurrent();
            stemArray.push(stem);

            if (!termMap.hasOwnProperty(stem))
                termMap[stem] = x;
        });

        return {stemArray: stemArray, stemTermMap: termMap};
    }


    //------------------------------NMF Topic Modelling Implementation-------------------------------------------------

    /**
     * A topic modelling implementation based on NMF using tf-idf results and compromise filtering.
     *
     * @param {string[]} documents Array of string documents
     * @param {number} topicCount Amount of topics to be created
     * @param {number} termsEach Amount of terms per topic to be created
     * @param {string[]} documentNames Name or title of the document in text so that documentNames.length == 1 or documentNames.length == documents.length (i.e. documentNames[i] is the name of documents[i])
     * @param {string[]} posFilter posSelection PoS filters to be applied
     * @returns {any}
     */
    public static nmfTopicModelling(documents: string[], topicCount: number, termsEach: number, documentNames?: string[], posFilter?: string[]): Map<string, any> {
        if (!documents || documents.length == 0) {
            console.error("ReportUtils.nmfTopicModelling: No document input array given!");
            return null;
        }
        //documentNames array length has to be either one, to represent
        if (documentNames && !(documentNames.length == 1 || documentNames.length == documents.length)) {
            console.error("ReportUtils.nmfTopicModelling: Document names array is there but it's length is neither one nor does it match document array length!");
            return null;
        }

        //Fabricate input data based on text documents to fit keyTermGenerator impl input
        let nmfInputData: any[] = [];
        //loop the following for multiple queries
        let query: any = {}; //assuming only one query object for data
        let queryData: any[] = []; //is a snippet array

        if (documents.length == 1) {
            console.warn("NMF topic modelling executed with only 1 document! This will lead to a only-0 result. Perhaps you could apply some splitting?");
        }

        for (let i = 0; i < documents.length; i++) {
            let doc: string = documents[i];
            let snippet: any = {};
            if (documentNames) {
                if (documentNames.length == 1) {
                    snippet.title = documentNames[0];
                } else { //length is the same
                    snippet.title = documentNames[i];
                }
            } else {
                snippet.title = ""; //no title since it would falsify output
            }
            snippet.snippet = doc;
            queryData.push(snippet);
        }
        query.data = queryData;
        nmfInputData.push(query);

        //Create corpus based on data and calculate tf-idf result
        let tfidfWordMap: Map<any, any> = this.generateWordMap(nmfInputData);

        const score: string = "nmf tfidf"; //iqf = inverse query frequency -> "query" is semantically equivalent to "document" in this case
        let result: any = this.nmf(tfidfWordMap, topicCount, termsEach, score);

        console.log("nmf tf-idf result:");
        console.log(result);
        return result;
    }

    /**
     * @param {Map<any, any[][]>} corpus Map of document vectors ([number][string]) and tf-idf results
     * @param {number} topicNum Number of topics to be evaluated
     * @param {number} termsPerTopic Number of terms per topic to be evaluated
     * @param {string} score Has to be tf-idf otherwise not supported
     * @returns {Map<any, any>} Element probability map
     */
    private static nmf(corpus: Map<any, any[][]>, topicNum: number, termsPerTopic: number, score: string): any {
        if (score != "nmf tfidf") { //only tf-idf supported
            console.error("This nmf implementation only supports tf-idf scores");
        }
        const maxItr: number = 75; //lower this to improve performance, increase this to improve accuracy
        const tolerance: number = 0.001;
        const prop: string = "tfidf_svec"; //property = svec = snippet vector (qvec = query vector)

        // nmf input
        // A is a term-by-document matrix
        let termDocumentMatrix: any[] = [];
        let names: any[][] = [];
        Array.from(corpus.entries()).forEach((docvec: any[][]) => {
            if (!docvec || docvec.length < 2 || !docvec[1][prop]) {
                console.error("report-utils.nmf: document vector property is undefined for " + prop);
                return null;
            } else {
                termDocumentMatrix.push(docvec[1][prop]);
                names.push(docvec[0]);
            }
        });

        //does not terminate if any dimension of A is 0
        let nmfFactorized: any = nmf.mu(termDocumentMatrix, topicNum, maxItr, tolerance);

        //topic estimation
        let topicEstimation: any[] = [];
        for (let b = 0; b < topicNum; b++) {
            let termArr: any[] = [];
            for (let a = 0; a < corpus.size; a++) {
                termArr[a] = {};
            }
            topicEstimation[b] = termArr;
        }

        nmfFactorized.W.forEach((wordvec: any[][], i: number) => {
            let term = names[i];
            wordvec.forEach((entry, j) => {
                topicEstimation[j][i] = {term: term, score: entry};
            });
        });


        topicEstimation.forEach((topic, i) => {
            topicEstimation[i] = topic.sort((a: any, b: any) => {
                return b.score - a.score;
            });
            //var cutoff = termGen.findIndexGreaterThen(concArr[i], 3);
            topicEstimation[i] = topicEstimation[i].slice(0, termsPerTopic);
        });

        //Preparing result
        let resultMap: Map<string, any> = new Map();
        topicEstimation.forEach((topic) => {
            topic.forEach((word: any) => {
                if (!resultMap.has(word.term)) {
                    resultMap.set(word.term, corpus.get(word.term));
                }
            });
        });

        // H matrix allows to approximate V
        let H: any = nmfFactorized.H;
        let W: any = nmfFactorized.W;

        //console.log(H);
        //console.log(topicEstimation);
        return {resultMap: resultMap, topicEstimation: topicEstimation, W: W, H: H};

    }

    /**
     * This method uses compromise.js features to calculate the tf and tf*idf scores for all words in the corpus.
     *
     * @method generateScores
     */
    private static generateWordMap(data: any[]): any {
        let corp = this.generateDictionaries(data);
        return this.generateTfidfScore(corp);
    }

    private static generateDictionaries(data: any): Map<any, any> {
        let corpus: Map<any, any> = new Map();

        let joinMaps = function (joinedMap: Map<any, any>, singularMap: Map<any, any>, property: any) {
            singularMap.forEach((value, key) => {
                if (!joinedMap.has(key)) {
                    joinedMap.set(key, value);
                } else {
                    let oldval = joinedMap.get(key)[property];
                    let val = {};
                    val[property] = value[property] + oldval;
                    joinedMap.set(key, val);
                }
            });
        };

        data.forEach((query: any) => {
            let joinedDict = new Map();
            query.data.forEach((snippet: any) => {
                snippet.content = snippet.snippet;
                if (snippet.title && snippet.title.length > 0) {
                    snippet.content = snippet.title + " " + snippet.snippet;
                }
                let procContent: string[] = ReportUtils.preprocessData(snippet.content);

                let nounsContent: string[] = ReportUtils.filterTags(procContent, ["Noun"]); //compromise based joining
                let adjContent: string[] = ReportUtils.filterTags(procContent, ["Adjective"]);
                //let verbContent: string[] = ReportUtils.filterTags(procContent, ["Adjective"]);
                snippet.dict = ReportUtils.countWords(nounsContent.concat(adjContent));

                joinMaps(joinedDict, snippet.dict, "count");
            });
            query.dict = joinedDict;
            joinMaps(corpus, joinedDict, "count");
        });

        Array.from(corpus.keys()).forEach((word) => {
            let qvec: any[] = []; //Query Vector
            let svec: any[] = [];
            let sets: any[] = [];
            data.forEach((query: any, i: number) => {
                query.data.forEach((snippet: any) => {
                    if (snippet.dict.has(word)) {
                        svec.push(snippet.dict.get(word).count);
                    } else {
                        svec.push(0);
                    }
                });
                if (query.dict.has(word)) {
                    qvec.push(query.dict.get(word).count);
                    sets.push(i);
                } else {
                    qvec.push(0);
                }
            });
            let value = corpus.get(word);
            value.count_qvec = qvec;
            value.count_svec = svec;
            value.sets = sets;
            corpus.set(word, value);
        });
        return corpus;
    }

    /**
     * @method filterTags Method takes string array of words, and filters them based on the provided Array of compromise tags.
     * @param text
     * @param tagArr
     */
    private static filterTags(text: string[], tagArr: string[]) {
        let tagged = nlp(text).tag();

        let taggedWords: any[] = [];
        tagged.list.forEach(function (object: any) {
            if (object.terms.length > 0) {
                let tags = object.terms[0].tags;

                if (tagArr.some((tag: any) => {
                        return tags.hasOwnProperty(tag);
                    })) {
                    taggedWords.push(object.terms[0].root);
                }
            }
        });

        return taggedWords;
    }

    /**
     * Counts the words in an Array by using the array.reduce() to sort all elements into an map and count them.
     *
     * @method countWords
     * @param termArray {Array}, an Array of which the content elements frequencies should be counted.
     * @return termMap {Map}, an map where the key is the term and in it is an object with count property.
     */
    private static countWords(termArray: any[]) {
        return termArray.reduce((map: Map<any, any>, key: any) => map.set(key, {count: (map.get(key)) ? map.get(key).count + 1 : 1}), new Map());
    }

    private static preprocessData(text: string): string[] {
        if (!text || text.length == 0) {
            console.error("No text to process");
            return null;
        }

        text = text.replace(/\d+/g, '');

        text = text.replace(/\s/g, " ");

        text = text.toLowerCase();


        let array: any[] = nlp(text).terms().out('array');

        array = array.filter(x => x != '');

        array = array.filter(x => this.filterSymbols.every(t => t != x));

        array = array.filter(x => ReportUtils.en_stopwords.every(t => t != x));

        return array;
    }

    private static generateTfidfScore(corpus: any) {
        let computeTfidf = function (vec: any) {
            let df = 0;
            let tfidf_vec: any[] = [];
            vec.forEach((element: number) => {
                if (element > 0) df++
            });
            vec.forEach((element: number) => {
                tfidf_vec.push(element * Math.log10(vec.length / df));
            });
            return tfidf_vec;
        };

        Array.from(corpus.keys()).forEach((word) => {
            let data = corpus.get(word);
            data.tfidf_svec = computeTfidf(data.count_svec);
            data.tfisf = data.tfidf_svec.reduce((a: number, b: number) => Math.max(a, b));
            corpus.set(word, data);
        });

        return corpus;
    }

    public static posSelectionUsingCompendiumResult(compRes: any, posSelection: any): string[] {
        if (!posSelection || (!posSelection.nouns && !posSelection.verbs && !posSelection.adjectives)) {
            console.error("Compendium PoS selection: No part of speech tags to be selected from compendium result!");
            return null;
        }

        let resultTextStream: string[] = [];
        for (let segmentResult of compRes) {
            let resultTextStreamSegment: string = "";
            for (let lineResult of segmentResult) {
                let resultTextStreamLine: string = "";
                for (let i = 0; i < lineResult.tokens.length; i++) {
                    let token: any = lineResult.tokens[i]; //token is an object
                    if (posSelection.nouns && token.pos.startsWith("NN")) {
                        resultTextStreamLine += " " + token.raw;
                    }
                    if (posSelection.verbs && token.pos.startsWith("VB")) {
                        resultTextStreamLine += " " + token.raw;
                    }
                    if (posSelection.adjectives && token.pos.startsWith("JJ")) {
                        resultTextStreamLine += " " + token.raw;
                    }
                }
                resultTextStreamSegment += resultTextStreamLine.trim(); // + ".";
            }
            resultTextStream.push(resultTextStreamSegment);
        }
        return resultTextStream;
    }
}