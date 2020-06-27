"use strict";
exports.__esModule = true;
var request = require("request");
var f = "([]sym:`a`b;qty:1 2)";

request('http://localhost:1800/?' + f, function (err, _res, body) {
    if (err) {
        return console.log(err);
    }
    // console.log(res);
    console.log(body);
});


