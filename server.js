var querystring = require('querystring');
var users = require('./users_db.js').users;
var recorder = require('./recorder.js');

path_folder = [];
path_files = [];

var fs = require("fs");

//Globals for templates
var loginhtml, recorderhtml, recstarted, video_error, filescreated;

//Global for filename to record
var filename = 'NONAME.mp4';

//read templates
require('fs').readFile('./login.html', function (err, data) {
    if (err) {
        throw err;
    }
    loginhtml = data;
});
require('fs').readFile('./recorder.html', function (err, data) {
    if (err) {
        throw err;
    }
    recorderhtml = data;
});
require('fs').readFile('./recstarted.html', function (err, data) {
    if (err) {
        throw err;
    }
    recstarted = data;
});
require('fs').readFile('./video_error.html', function (err, data) {
    if (err) {
        throw err;
    }
    video_error = data;
});
require('fs').readFile('./files_created.html', function (err, data) {
    if (err) {
        throw err;
    }
    filescreated = data;
});

const code = '0123456789abcdef';

require('http').createServer( function (req, res) {

        if (req.method == 'POST') {
            var fullBody = '';
            req.on('data', function (chunk) {
                fullBody += chunk.toString();
            });

            // if user trying to POST from login page (first login)
            if(req.url == "/login"){
                req.on('end', function () {
                    var decodedBody = querystring.parse(fullBody);
                    if (checkAndSetCredentials(decodedBody.username, decodedBody.password)) {
                        res.statusCode = 302;
                        res.setHeader("Location", "/"+ generateTokenTo(decodedBody.username) + "/start");
                    }
                    else {
                        //Handling wrong usernames ans passwords
                        res.statusCode = 302;
                        res.end(redirect("/login", res));
                    }
                    res.end();
                });
            } else
            // processing POST request from Recording pages
            {
                req.on('end', function () {
                    //Update filename
                    filename = querystring.parse(fullBody).filename;
                    if (is_acceptable(filename)) {
                        res.statusCode = 302;
                        res.setHeader("Location", "/"+ tokenOfLoggedUser() + "/recording");
                    }
                    res.end();
                });
            }
        } else {

            //processing usual url cases
            res.writeHead(200, {'Content-Type': 'text/html'});
            //Main function for processing URL's
            processUrl(req.url, res);
        }
    }
).listen(12345, '0.0.0.0');


//returns back token of Logged User;
function tokenOfLoggedUser() {
    for (var i=0; i < users.length; i++) {
        if (users[i].logged == true)
            return users[i].token;
    }
    return null;
}

function is_acceptable(filename){
    //TODO : ADD CHECHING FOR FILE NAMES AND MODIFIERS
    return filename;
}


function findUserByToken(pass) {
    for (var i=0; i < users.length; i++) {
        if (users[i].token == pass)
            return users[i];
    }
    return null;
}

//Generator of new token. Token is assigned to user once, while server is running
function newRandomToken(len) {
    var id = '';
    for(var i = 0; i < len; i++)
        id += code.charAt(Math.floor(Math.random() * code.length));
    return id;
}

function generateTokenTo(name){
    for (var i=0; i < users.length; i++) {
        if (users[i].username == name) {
            users[i].token = newRandomToken(32);
            console.log("Token generated: " + users[i].token);
            return users[i].token;
        }
    }
}

function prseUrl(url) {
    return url.split('/').splice(1);
}

function LoginPage(){
    return loginhtml;
}
//few redirects and other things. This one redirects to login page and handles login form
function processUrl(url, res) {
    switch (url) {
        case "/favicon.ico" :
        {
            res.end("");
            break;
        }
        case "/":
        {
            res.end(redirect("/login", res));
            break;
        }
        case "/login"   :
        {
            res.end(LoginPage());
            break;
        }
        default :
        {
            console.log('Request url: ' + url);
            var args = prseUrl(url);
            var user = findUserByToken(args[0]);
            console.log(user);
            if (user ) {
                onUserAction(user, args, res);
            }
            else {
                res.end(redirect("/login", res));
                break;
            }
        }
    }
}

//link wrapper
function a(path, text) {
    return '<a href="' + path + '">' + text + '</a>';
}

//Process url and returns html code for page
function onUserAction(user, args, res) {
    var answer = "";
    switch (args[1]) {
        case "start":
        {
            try {
                answer = fs.readdirSync(user.project_folder);
                answer = answer.sort()
                answer = answer.join("<h3><br>");
                answer = recorderhtml + '<div class="row"><div class = "span1"></div><div class = "span4">' + answer + '</div></div></div></body></html>';
                res.end(answer);
                break;
            } catch (err) {
                res.end(redirect("/login", res));
                break;
            }
        }

        case "recording":
            {
            try {
                filename = verify(filename);
                recorder.start((user.project_folder + "/" + filename));
                answer = video_error + '<h2>' +
                    a(("/" + (user.token + "/start")), "Back") + '</h1></body>' + '</html>';
                //FilesInFolder = fs.readdirSync(user.project_folder);

                var count = 25;
                var counter = setInterval(timer, 500); //500 will  run it every 0.5 second
                function timer() {
                    console.log(filename);
                    count = count - 1;
                    if (count <= 0) {
                        clearInterval(counter);
                        //counter ended, do something here
                        res.end(answer);
                        return;
                    }
                    if (contains(fs.readdirSync(user.project_folder), filename + recorder.screen_ext) &&
                        contains(fs.readdirSync(user.project_folder), filename + recorder.professor_ext)) {
                        console.log(filename);
                        answer = recstarted + "<h1><br>To stop, press: " + a(("/" + user.token + "/stop"), "Stop") + '</h1></body>' + '</html>';
                        res.end(answer)
                        return;
                    }
                }

                break;
            } catch (err){
                res.end(redirect("/login", res));
                break;
            }
        }
        case "stop":
        {
            try {
                recorder.stop();
                answer = filescreated + '<b>' + filename + recorder.screen_ext + '</b>' + ' and ' + '<b>' + filename + recorder.professor_ext + '</b>';
                answer += a(("/" + (user.token + "/start")), "<br>Record stopped. Come and visit Studio room!");
                answer += '</h1></div></div></div></body></html>';
                res.end(answer);
                break;
            } catch (err){
                res.end(redirect("/login", res));
                break;
            }
        }
        }
}

//You so hAx0r? No way
function verify(filename){
    return filename.replace(/[^A-Za-z0-9_-]/g,'');
}

//Function checks if user entered right username and password and this function also logs out other users
function checkAndSetCredentials(name,pass){
    x = false;
    for (var i=0; i < users.length; i++){
        users[i].logged = false;
        if (users[i].username == name && users[i].password == pass) {
            x = users[i];
            x.logged = true;
        }
    }
    return x;
}

//check if obj in in array
function contains(arr, obj) {
    var i = arr.length;
    while (i--) {
        if (arr[i] === obj) {
            return true;
        }
    }
    return false;
}

console.log('Server running at http://http://172.21.202.68:12345/');

console.log("users:");

for (i in users) {
    console.log("user = " + users[i].username);
}

function redirect(path, res) {
  return '<head><meta http-equiv="refresh" content="0; url=' + path + '"/></head>';
}

