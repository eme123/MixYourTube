var fs = require("fs"); // pour la gestion des fichiers - filesystem
// We need to use the express framework: have a real web server that knows how to send mime types etc.
var express=require('express');

// Init globals variables for each module required
var app = express();
var http = require('http');
var server = http.createServer(app);

// Indique que le serveur sera capable de renvoyer des fichiers statiques 
app.configure(function () {  
	app.use(express.static(__dirname + '/'));  
});  

// Config
var PORT = 8082,
	TRACKS_PATH = './ressources/multitrack/';

// launch the http server on given port
server.listen(PORT);

// routing
app.get('/', function (req, res) {
	res.sendfile(__dirname + '/accueil.html');
});