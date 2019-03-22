/*jslint node: true */
/*jslint esversion: 6*/
/*jslint eqeqeq: true */
//dependencies
let express = require('express');
let app = express();
let fs = require("fs");
let expressWs = require('express-ws')(app);
let http = require('http');

let bodyParser = require('body-parser');
let jwt = require('jsonwebtoken');
let cors = require('cors');

let lda = require('lda');
let stopword = require('stopword');
let tm = require('text-miner');
let tfidf = require('document-tfidf');

//Temporary solution for single user - needs to be changed for multiple users
let user;
let invalid_tokens = [];

let system_start = new Date();
let failed_logins = 0;

let parseXlsx = require('excel');

app.set('secret', "superSecret");
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());


/*
 Login and logout methods to authenticate the user via REST
 using JSON Web Tokens (JWT)
 */
/**
 * User login and creation of JWT token for this user
 */
app.post('/login',
    function (req, res) {
        "use strict";
        if (!req.body.username || !req.body.password) {
            res.json({status: 422, message: "Unprocessable entity"});
            return;
        }

        if (req.body.username !== user.username || req.body.password !== user.password) {
            res.json({status: 400, message: "Bad credentials"});
            failed_logins++;
            return;
        }
        failed_logins = 0;
        // create a token
        user.timestamp = new Date().toLocaleString();
        let token = jwt.sign(user, app.get('secret'), {expiresIn: "1d"});
        res.json({status: 200, token: token});
    }
);

/**
 * Logout of user and invalidation of token (JWT)
 */
app.post('/logout',
    function (req, res) {
        "use strict";
        let token = getToken(req);
        if (token) {
            // überprüft JWT und ob JWT abgelaufen ist
            jwt.verify(token, app.get('secret'), {ignoreExpiration: false}, function (err, decoded) {
                if (err || typeof decoded === "undefined") {
                    res.json({status: 401, message: "Unauthorized"});
                } else {
                    invalid_tokens.push(token);
                    res.json({status: 200, message: "Logout successfully"});
                }
            });
        } else {
            res.json({status: 401, message: "Unauthorized"});
        }
    }
);

/**
 * GET request for server state
 */
app.get('/status', function (req, res) {
    "use strict";
    let token = getToken(req);

    if (token) {
        // überprüft JWT und ob JWT abgelaufen ist
        jwt.verify(token, app.get('secret'), {ignoreExpiration: false}, function (err, decoded) {
            if (err || typeof decoded === "undefined" || invalid_tokens.indexOf(token) >= 0) {
                res.json({status: 401, message: "Unauthorized"});
            } else {
                res.json({status: 200, date: system_start, failed: failed_logins});
            }
        });
    } else {
        res.json({status: 401, message: "Unauthorized"});
    }
});

/**
 * Update password for login
 */
app.post('/updatePW', function (req, res) {
    "use strict";
    if (typeof  req === "undefined" || typeof req.body === "undefined" || typeof req.body.new_password === "undefined" || typeof req.body.repeat_password === "undefined" || typeof req.body.old_password === "undefined") {
        res.json({status: 422, message: "Unprocessable entity"});
        return;
    }

    let token = getToken(req);
    if (token) {
        // checks whether token is still valid
        jwt.verify(token, app.get('secret'), {ignoreExpiration: false}, function (err, decoded) {
            if (err || typeof decoded === "undefined" || invalid_tokens.indexOf(token) >= 0) {
                res.json({status: 401, message: "Unauthorized"});
            } else {
                let new_password = req.body.new_password;
                let old_password = req.body.old_password;
                let repeat_password = req.body.repeat_password;

                if (old_password !== user.password) {
                    res.json({status: 401, errorNum: 0, message: "Old password wrong"});
                    return;
                } else if (new_password !== repeat_password) {
                    res.json({status: 401, errorNum: 1, message: "Passwords do not match"})
                    return;
                }
                user.password = new_password;

                let data = "username: " + user.username + "\r\n" + "password: " + user.password;
                fs.writeFile('./resources/login.config', data, {}, function (err) {
                    if (err) {
                        console.log("Error writing user config.");
                        res.json({status: 400, errorNum: 2, message: "Password could not be written"});
                        return;
                    }
                    res.json({status: 200, message: "Password successfully updated"});
                });

            }
        });
    } else {
        res.json({status: 401, message: "Unauthorized"});
    }
});


/**
 * Latent Dirichlet Analysis for texts
 */
app.post('/lda',
    function (req, res) {
        "use strict";
        if (!req.body.text) {
            res.json({status: 422, message: "Unprocessable entity"});
            return;
        }

        let text = req.body.text;

        let topicCount = req.body.topicCount;
        if (!topicCount)
            topicCount = 2;

        let termsEach = req.body.termsEach;
        if (!termsEach)
            termsEach = 5;

        /*let splitting = req.body.splitting;
        if (!splitting)
            splitting = "Sentence";


        let splitText = splitHtmlString(text, splitting);*/

        let result = lda(text, topicCount, termsEach);
        res.json({status: 200, lda: result});
    }
);

/**
 * term frequency * inverse document frequency stats for texts
 */
app.post('/tfidf',
    function (req, res) {
        "use strict";
        if (!req.body.text) {
            res.json({status: 422, message: "Unprocessable entity"});
            return;
        }

        let text = req.body.text;

        //text = removeHtmlTagsFromString(text);

        let result = [];
        for (let i = 0; i < text.length; i++) {
            result[i] = tfidf.fullTFIDFAnalysis(text[i]);
        }
        res.json({status: 200, tfidf: result});
    }
);

/**
 * Creating a term-document matrix weighted using tf-idf
 */
app.post('/termDocumentMatrix',
    function (req, res) {
        "use strict";
        if (!req.body.text) {
            res.json({status: 422, message: "Unprocessable entity"});
            return;
        }

        let textArray = req.body.text;

        let corpus = new tm.Corpus(textArray);

        let terms = new tm.Terms(corpus);

        let result = terms.weighting(tm.weightTfIdf).dtm;

        res.json({status: 200, tm: result});
    }
);

/**
 * Node server based stopword-removal for given text
 *
 * POST body contents are
 * text as string[] represents the split text segments
 * stopwords as string[] represents the indiviudal stopwords to be removed
 */
app.post('/stopword',
    function (req, res) {
        "use strict";
        if (!req.body.text) {
            res.json({status: 422, message: "Unprocessable entity"});
            return;
        }

        let text = req.body.text;

        //text = removeHtmlTagsFromString(text);

        let stopwords = req.body.stopwords;

        let result = [];

        if (Array.isArray(text)) {
            if (stopwords) {
                for (let i = 0; i < text.length; i++) {
                    result[i] = stopword.removeStopwords(text[i].split(' '), stopwords).join(" ");
                }
            } else {
                for (let i = 0; i < text.length; i++) {
                    result[i] = stopword.removeStopwords(text[i].split(' ')).join(" ");
                }
            }
        } else {
            result[0] = stopwords ?
                stopword.removeStopwords(text.split(' '), stopwords) :
                stopword.removeStopwords(text.split(' '));
            result[0] = result[0].join(" ");
        }

        res.json({status: 200, stopwordremoval: result});
    }
);


app.get('/indicators',
    function (req, res) {
        let indicatorUrls;
        parseXlsx('./resources/indicators.xlsx', function (err, data) {
            if (err) {
                res.json({status: 404, message: err.message});
                return;
            }
            // data is an array of arrays
            indicatorUrls = data;
            res.json({status: 200, message: indicatorUrls});
        });
    }
);

function splitHtmlString(text, splitting) {
    let splitText;
    switch (splitting) {
        case "Paragraph":
            splitText = text.match(/<p>.*?<\/p>/g);
            splitText = removeHtmlTagsFromString(splitText);
            break;
        case "Sentence":
            text = removeHtmlTagsFromString(text);
            splitText = text.match(/[^\.!\?]+[\.!\?]+/g);
            break;
        case "Report":
            splitText = text;
            splitText = removeHtmlTagsFromString(splitText);
            break;
        default:
            splitText = text.match(/[^\.!\?]+[\.!\?]+/g);

    }
    return splitText;
}

/**
 * Read JWT header from requests
 * @param req
 * @returns {*}
 */
function getToken(req) {
    "use strict";
    return req.headers['access-token'];
}

/**
 * Read user credentials from login.config file
 * Attention: Only temporal solution until proper user and rights management is implemented
 */
function readUser() {
    "use strict";
    let input = fs.readFileSync('./resources/login.config');

    let data = input.toString().split("\r\n");
    let user_line = data[0];
    let password_line = data[1];

    let password = password_line.substring(password_line.indexOf(":") + 2, password_line.length);
    let username = user_line.substring(user_line.indexOf(":") + 2, user_line.length);

    user = {
        username: username,
        password: password
    };
}

function getIndicatorUrls() {
    let data1;
    parseXlsx('./resources/indicators.xlsx', function (err, data) {
        if (err) throw err;
        // data is an array of arrays
        data1 = data[0];
    });
    return data1;
}

function removeHtmlTagsFromString(input) {
    if (Array.isArray(input)) {
        let result = [];
        for (let i = 0; i < input.length; i++) {
            input[i] = input[i].replace(/<\/?[^>]+(>|$)/g, "");
            if (input[i] && input[i].length && input[i].length > 0) { //Avoid empty lines or paragraphs
                result.push(input[i]);
            }
        }
        return result;
    }
    return input.replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * Program start
 * Creating an http server at port 8081 and providing REST interfaces
 * Use this for development and prototype builds
 * @type {http.Server}
 */
let server = app.listen(8081, function () {

    "use strict";
    readUser();
    getIndicatorUrls();

    let host = server.address().address;
    let port = server.address().port;

    console.log("Data Analysis REST Server listening at http://%s:%s", host, port);

});



