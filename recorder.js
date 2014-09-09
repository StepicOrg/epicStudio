var ffmpeg;
var mxlight;
var exec = require('child_process').exec;

const SCREEN = '_screen.mp4';
const PROFF = '_professor.TS';
const FFMPEG_EXEC_PATH = "D:/VIDEO/ffmpeg/bin/ffmpeg.exe ";
const MXLIGHT_EXEC_PATH = "D:/VIDEO/MXLight/MXLight.exe ";
const TIMEOUT_TIME = 1000;
module.exports = {

  screen_ext: SCREEN,
  professor_ext: PROFF,

  start: function(filename) {
    console.log(filename);
    filename = typeof filename !== 'undefined' ? filename : "wtf";
    if (!ffmpeg) {
      ffmpeg = exec(FFMPEG_EXEC_PATH + '-y -video_size 1920x1080 -pixel_format uyvy422 -rtbufsize 702000k -framerate 24 -f dshow -i video="Decklink Video Capture" ' + filename+ SCREEN);
    }
    if (!mxlight) {

        //path to MXLIGHT
        mxlight = exec(MXLIGHT_EXEC_PATH +' record-to-file=' + filename+PROFF + ' record=on');
    }
    return !!ffmpeg;
  },

  stop: function() {
    if (ffmpeg) {
        ffmpeg.stdin.write('q\n');
    }
    if (mxlight) {
        mxlight = exec(MXLIGHT_EXEC_PATH + 'exit');
        mxlight = false;

    }

    //Why we need this part? sometimes there is problems with decoding large files.
    //So at first we send q keyevent to ffmpeg and than closing mxligth
    //after 1 second we go back to ffmpeg and killing process
    //Without it there could be asynchronous time of 2 video files.
    if (ffmpeg) {
        setTimeout(function(){
            console.log("Closing ffmpeg");
        },TIMEOUT_TIME);
        ffmpeg.stdin.end("q");
        ffmpeg = false;
    }


  }


}
