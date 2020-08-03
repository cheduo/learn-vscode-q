var nodeq = require("node-q");
nodeq.connect({host: "34.87.88.189", port: 1024}, function(err, con) {
    if (err) throw err;
    console.log("connected");
    // interact with con like demonstrated below
    con.k("sum 1 2 3", function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });

    con.k("()", function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });

    con.k("{x}[1]", function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });

    con.k("{x;}[1]", function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });

    con.k('{{.Q.trp[x;y;{x,"\n",.Q.sbt@(-4)_y}]}[{.Q.S[system"c";0j;.d0.z.res:0 x]};x]}', "1",function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });
    
    con.k('{{.Q.trp[x;y;{x,"\n",.Q.sbt@(-4)_y}]}[{.Q.S[system"c";0j;.d0.z.res:0 x]};x]}', "1+1",function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });

    con.k('{{.Q.trp[x;y;{x,"\n",.Q.sbt@(-4)_y}]}[{.Q.S[system"c";0j;.d0.z.res:0 x]};x]}', "()",function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });

    con.k('{{.Q.trp[x;y;{x,"\n",.Q.sbt@(-4)_y}]}[{.Q.S[system"c";0j;.d0.z.res:0 x]};x]}', "{x;}[1]",function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });

    con.k('{{.Q.trp[x;y;{x,"\n",.Q.sbt@(-4)_y}]}[{.Q.S[system"c";0j;.d0.z.res:0 x]};x]}', "(())",function(err, res) {
        if (err) throw err;
        console.log("result", res); // 6
    });

});

