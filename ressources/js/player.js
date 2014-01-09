var context;
var soundSource, soundBuffer;
var buttonPlay, buttonStop, buttonLoad;
var url = '/ressources/multitrack/deep_smoke/guitare.mp3';

// Step 1 - Initialise the Audio Context
// There can be only one!
function init() {
	if (typeof AudioContext == "function") {
		context = new AudioContext();
	} else if (typeof webkitAudioContext == "function") {
		context = new webkitAudioContext();
	} else {
		throw new Error('AudioContext not supported. :(');
	}

	buttonPlay = document.querySelector("#play");
	buttonStop = document.querySelector("#stop");
	buttonLoad = document.querySelector("#load");

}

// Step 2: Load our Sound using XHR
function loadSound() {
	console.log("loading " + url + " using Xhr2");
	// Note: this loads asynchronously
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	// BINARY TRANSFERT !
	request.responseType = "arraybuffer";

	// Our asynchronous callback
	request.onload = function() {
		var audioData = request.response;
		// We got the sound file from the server, let's decode it
		decode(audioData);
	};

	request.send();
}

// Finally: tell the source when to start
function playSound() {
	// play the source now. 
	// First parameter = delay in seconds before starting to play
	// Second parameter = where do we start (0 = beginning of song)
	console.log("playing sound");

	// connect sound samples to the speakers
	buildGraph();

	// BEWARE : the graph should be connected, if sound has been stopped,
	// and if the graph is not built (i.e the previous line of code is not present)
	// Then the next line will do nothing, we need to rebuild the graph
	soundSource.start(0, 0);

	buttonStop.disabled = false;
	buttonPlay.disabled = true;
}

function stopSound() {
	 console.log("Stopping sound, Graph destroyed, cannot be played again without rebuilding the graph !");
	// stop the source now.
	// Parameter : delay before stopping
	// BEWARE : THIS DESTROYS THE NODE ! If we stop, we need to rebuid the graph again !
	// We do not need to redecode the data, just to rebuild the graph
	soundSource.stop(0);
	buttonPlay.disabled = false;
	buttonStop.disabled = true;
}

    
function buildGraph() {
	console.log("Building the audio graph : connecting decoded sound sample to the speakers");
	// create a node with the decoded sound source
	soundSource = context.createBufferSource();
	soundSource.buffer = soundBuffer;

  // Plug the cable from one thing to the other
  // Here we connect the decoded sound sample to the speakers
	soundSource.connect(context.destination);
}

function decode(audioData) {
	console.log("decoding audio data... WebAudio uses RAW sample in memory, not compressed one");
	   
	// The Audio Context handles creating source buffers from raw binary
	context.decodeAudioData(audioData, function onSuccess(soundBufferDecoded) {
		soundBuffer = soundBufferDecoded;

		console.log("sample ready to be played, decoded. It just needs to be inserted into an audio graph");
		
		buttonPlay.disabled = false;
		buttonLoad.disabled = true;
	}, function onFailure() {
		alert("Decoding the audio buffer failed");
	});             
}