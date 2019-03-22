/**
 * Created by Martin on 04.09.2017.
 * */
export class NlpControl {

    //Lib-Names
    public static readonly LIB_NONE: string = 'None / Custom Implementation'; //no library = (custom) internal/local implementation
    /*External libs*/
    public static readonly LIB_COMPENDIUM: string = 'compendium';
    public static readonly LIB_COMPROMISE: string = 'compromise'; //currently not supported
    public static readonly LIB_LDA_REMOTE: string = 'lda (remote)'; //remote
    public static readonly LIB_NMF: string = 'nmf'; //local
    public static readonly LIB_DOCUMENT_TFIDF_REMOTE: string = 'document-tfidf (remote)'; //remote
    public static readonly LIB_STOPWORD_REMOTE: string = 'stopword (remote)'; //remote
    public static readonly LIB_SNOWBALL: string = 'snowball';

    //Feature-Names
    public static readonly TERMLIST_RATING: string = 'Termlist Rating'; //Text segmentation for further NLP steps
    public static readonly SEGMENTATION: string = 'Segmentation'; //Text segmentation for further NLP steps
    public static readonly SENTIMENT: string = 'Sentiment';
    public static readonly POS_SELECTION: string = 'Part-of-Speech Selection';
    public static readonly STOP_WORD_REMOVAL: string = 'Stopword Removal';
    public static readonly TOPIC: string = 'Topic Modelling';
    public static readonly TFIDF: string = 'Term Frequency';
    public static readonly STEM: string = 'Stemming';

    //Feature-Lib-Map - also establishes pipeline order
    public static readonly FEATURES: Array<[string, string[]]> = [
        //[NlpControl.STEM, [NlpControl.LIB_COMPENDIUM, NlpControl.LIB_SNOWBALL]], //Stemming disabled because it is included in PoS
        [NlpControl.TERMLIST_RATING, []],
        [NlpControl.SEGMENTATION, []],
        [NlpControl.POS_SELECTION, [NlpControl.LIB_COMPENDIUM /*, NlpControl.LIB_COMPROMISE*/]],
        [NlpControl.STOP_WORD_REMOVAL, [NlpControl.LIB_NONE, NlpControl.LIB_STOPWORD_REMOTE]],
        [NlpControl.SENTIMENT, [NlpControl.LIB_COMPENDIUM]],
        [NlpControl.TOPIC, [NlpControl.LIB_NMF, NlpControl.LIB_LDA_REMOTE]]
    ];

    //Param names
    public static readonly TERMLIST_RATING_PARAM_POSITIVE: string = "Positive Terms";
    public static readonly TERMLIST_RATING_PARAM_NEGATIVE: string = "Negative Terms";
    public static readonly TOPIC_PARAM_COUNT: string = "Topic Count";
    public static readonly TOPIC_PARAM_TERMS_EACH: string = "Terms Each";
    public static readonly SEGMENTATION_PARAM_SPLITTING: string = "Splitting";
    public static readonly STOP_WORD_REMOVAL_PARAM_LIST: string = "Stopword list";
    public static readonly POS_SELECTION_PARAM_NOUN: string = "Noun Selection";
    public static readonly POS_SELECTION_PARAM_VERB: string = "Verb Selection";
    public static readonly POS_SELECTION_PARAM_ADJ: string = "Adjective Selection";
    public static readonly POS_SELECTION_PARAM_HIGHLIGHT_ONLY: string = "Highlight only";

    //Param types
    public static readonly PARAM_TYPE_STRING_ARRAY: string = "string[]";
    public static readonly PARAM_TYPE_NUMBER: string = "number";
    public static readonly PARAM_TYPE_SELECT_ONE: string = "select_one";
    public static readonly PARAM_TYPE_SELECT_MANY: string = "select_many";
    public static readonly PARAM_TYPE_BOOLEAN: string = "boolean"; //for checkboxes: "on" -> true, "off" -> false

    //Param default values
    public static readonly TOPIC_PARAM_COUNT_DEFAULT: number = 2;
    public static readonly TOPIC_PARAM_TERMS_EACH_DEFAULT: number = 3;


    constructor(public feature: string, //name of the feature of the control (see feature-names)
                public library: string, //may be undefined if no library is available
                public params?: Map<string, any[]>) { //optional parameter map
    }

}
