var context;
var source = null;
var audioBuffer = null;
// Les echantillons prêts à être joués, de toutes les pistes
var tracks = [];
var buffers = []; // audio buffers decoded
var samples = []; // audiograph nodes

// Master volume
var masterVolumeNode;
var trackVolumeNodes = [];

var buttonPlay, buttonStop, buttonPause;
var masterVolumeSlider;
var canvas, ctx;
var frontCanvas, frontCtx;

// Sample size in pixels
var SAMPLE_HEIGHT = 100;

// Useful for memorizing when we paused the song
var lastTime = 0;
var currentTime;
var delta;

var elapsedTimeSinceStart = 0;

var paused = true;

// requestAnim shim layer by Paul Irish, like that canvas animation works
// in all browsers
window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function(/* function */ callback, /* DOMElement */ element) {
                window.setTimeout(callback, 1000 / 60);
            };
})();


function init() {
    // Get handles on buttons
    buttonPlay = document.querySelector("#bplay");
    buttonPause = document.querySelector("#bpause");
    buttonStop = document.querySelector("#bstop");

    // canvas where we draw the samples
    canvas = document.querySelector("#myCanvas");
    ctx = canvas.getContext('2d');

    // Create a second canvas
    frontCanvas = document.createElement('canvas');
    frontCanvas.id = 'canvasFront';
    // Add it as a second child of the mainCanvas parent.
    canvas.parentNode.appendChild(frontCanvas);
    // make it same size as its brother
    frontCanvas.height = canvas.height;
    frontCanvas.width = canvas.width;
    frontCtx = frontCanvas.getContext('2d');

    // Master volume slider
    masterVolumeSlider = document.querySelector("#masterVolume");

    // Init audio context
    context = initAudioContext();
    
    // Get the list of the songs available on the server and build a 
    // drop down menu
    loadSongList();

    animateTime();
}


function initAudioContext() {
    // Initialise the Audio Context
    // There can be only one!
    var context;

    if (typeof AudioContext == "function") {
        context = new AudioContext();
        console.log("USING STANDARD WEB AUDIO API");
    } else if (typeof webkitAudioContext == "function") {
        context = new webkitAudioContext();
        console.log("USING WEBKIT AUDIO API");
    } else {
        throw new Error('AudioContext is not supported. :(');
    }
    return context;
}
// SOUNDS AUDIO ETC.


function resetAllBeforeLoadingANewSong() {
    // Marche pas, c'est pour tester...
    samples.forEach(function(s) {
        s.disconnect(0);
    });
}

var bufferLoader;
function loadAllSoundSamples(tracks) {


    bufferLoader = new BufferLoader(
            context,
            tracks,
            finishedLoading
            );
    bufferLoader.load();
}
function finishedLoading(bufferList) {
    console.log("finished loading");
    resetAllBeforeLoadingANewSong();
    buffers = bufferList;
    buttonPlay.disabled = false;
}

function buildGraph(bufferList) {
    var sources = [];
    // Create a single gain node for master volume
    masterVolumeNode = context.createGain();
    bufferList.forEach(function(sample, i) {
// each sound sample is the  source of a graph
        sources[i] = context.createBufferSource();
        sources[i].buffer = sample;
        // connect each sound sample to a vomume node
        trackVolumeNodes[i] = context.createGain();
        // Connect the sound sample to its volume node
        sources[i].connect(trackVolumeNodes[i]);
        // Connects all track volume nodes a single master volume node
        trackVolumeNodes[i].connect(masterVolumeNode);
        // Connect the master volume to the speakers
        masterVolumeNode.connect(context.destination);
        // On active les boutons start et stop
        samples = sources;
    })
}

// ######### SONGS
function loadSongList() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "track", true);

    // Menu for song selection
    var s = $("<select/>");
    s.appendTo("#songs");
    s.change(function(e) {
        console.log("You chose : " + $(this).val());
        loadTrackList($(this).val());
    });

    xhr.onload = function(e) {
        var songList = JSON.parse(this.response);

        songList.forEach(function(songName) {
            console.log(songName);

            $("<option />", {value: songName, text: songName}).appendTo(s);


            /*
            var list = document.getElementById("songs");
            var li = document.createElement('li');
            li.textContent = songName;
            button = document.createElement('button');
            button.setAttribute("onclick", "loadTrackList('" + songName + "');");
            button.textContent = "load";
            li.appendChild(button);
            list.appendChild(li);
            */
        });
    };
    xhr.send();
}


// ######## TRACKS
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function getTrackName(elem) {
// returns the name without the suffix
    var n = elem.lastIndexOf(".");
    return elem.slice(0, n + 1);
}

function loadTrackList(songName) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', "track/" + songName, true);
    xhr.onload = function(e) {
        var track = JSON.parse(this.response);
        // resize canvas depending on number of samples
        resizeSampleCanvas(track.instruments.length);
        var i = 0;

        track.instruments.forEach(function(instrument, trackNumber) {
            // Image
            console.log("on a une image");
            var divTrack = document.getElementById("tracks");
            // Render HTMl
            var span = document.createElement('span');
            var imageURL = "track/" + songName + "/visualisation/" + instrument.visualisation;

            span.innerHTML = instrument.name +
                    "<button id='mute" + trackNumber + "' onclick='muteUnmuteTrack(" + trackNumber + ");'>Mute</button><br/>"
                    /*
                    +
                    "<img class='sample' src='" + imageURL + "'/><br/>";
                    */
            drawSampleImage(imageURL, trackNumber, instrument.name);
            divTrack.appendChild(span);

            // Audio
            console.log("on a un fichier audio");
            // load audio dans un tableau...
            var url = "track/" + songName + "/sound/" + instrument.sound;
            tracks.push(url);
            console.log("Ajout piste audio " + instrument.name);
            

        });
		loadAllSoundSamples(tracks);
    };
    xhr.send();
}


function animateTime() {
    if (!paused) {
        // Draw the time on the front canvas
        currentTime = context.currentTime;
        var delta = currentTime - lastTime;


        var totalTime;

        frontCtx.clearRect(0, 0, canvas.width, canvas.height);
        frontCtx.fillStyle = 'white';
        frontCtx.font = '14pt Arial';
        frontCtx.fillText(elapsedTimeSinceStart.toPrecision(4), 100, 20);
        //console.log("dans animate");

        // at least one track has been loaded
        if (buffers[0] != undefined) {

            var totalTime = buffers[0].duration;
            var x = elapsedTimeSinceStart * canvas.width / totalTime;

            frontCtx.strokeStyle = "white";
            frontCtx.lineWidth = 3;
            frontCtx.beginPath();
            frontCtx.moveTo(x, 0);
            frontCtx.lineTo(x, canvas.height);
            frontCtx.stroke();

            elapsedTimeSinceStart += delta;
            lastTime = currentTime;
        }
    }
    requestAnimFrame(animateTime);
}

function drawSampleImage(imageURL, trackNumber, trackName) {
    var image = new Image();

    image.onload = function() {
        // SAMPLE_HEIGHT pixels height
        var x = 0;
        var y = trackNumber * SAMPLE_HEIGHT;
        ctx.drawImage(image, x, y, canvas.width, SAMPLE_HEIGHT);

        ctx.strokeStyle = "white";
        ctx.strokeRect(x, y, canvas.width, SAMPLE_HEIGHT);

        ctx.font = '14pt Arial';
        ctx.fillStyle = 'white';
        ctx.fillText(trackName, x + 10, y + 20);
    }
    image.src = imageURL;
}

function resizeSampleCanvas(numTracks) {
    canvas.height = SAMPLE_HEIGHT * numTracks;
    frontCanvas.height = canvas.height;
}
function clearAllSampleDrawings() {
    //ctx.clearRect(0,0, canvas.width, canvas.height);
}

function loadSong(song) {
    loadTrackList(song);
}

function playAllTracks(startTime) {
    buildGraph(buffers);



    samples.forEach(function(s) {
// First parameter is the delay before playing the sample
// second one is the offset in the song, in seconds, can be 2.3456
// very high precision !
        s.start(0, startTime);
    })
    buttonPlay.disabled = true;
    buttonStop.disabled = false;
    buttonPause.disabled = false;

    // Note : we memorise the current time, context.currentTime always
    // goes forward, it's a high precision timer
    console.log("start all tracks startTile =" + startTime);
    lastTime = context.currentTime;
    paused = false;
}

function stopAllTracks() {
    samples.forEach(function(s) {
// destroy the nodes
        s.stop(0);
    });
    buttonStop.disabled = true;
    buttonPause.disabled = true;
    buttonPlay.disabled = false;
    elapsedTimeSinceStart = 0;
    paused = true;
}

function pauseAllTracks() {
    if (!paused) {
        // Then stop playing
        samples.forEach(function(s) {
// destroy the nodes
            s.stop(0);
        });
        paused = true;
        buttonPause.innerHTML = "Resume";
    } else {
        paused = false;
// we were in pause, let's start again from where we paused
        playAllTracks(elapsedTimeSinceStart);
        buttonPause.innerHTML = "Pause";
    }
}

function changeMasterVolume(e) {
    var fraction = parseInt(e.value) / parseInt(e.max);
    // Let's use an x*x curve (x-squared) since simple linear (x) does not
    // sound as good.
    masterVolumeNode.gain.value = fraction * fraction;
}


function muteUnmuteTrack(trackNumber) {
// AThe mute / unmute button
    var b = document.querySelector("#mute" + trackNumber);
    if (trackVolumeNodes[trackNumber].gain.value == 1) {
        trackVolumeNodes[trackNumber].gain.value = 0;
        b.innerHTML = "Unmute";
    } else {
        trackVolumeNodes[trackNumber].gain.value = 1;
        b.innerHTML = "Mute";
    }


}
