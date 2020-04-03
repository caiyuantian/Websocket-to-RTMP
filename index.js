var WebSocket = require('ws');
const child_process = require('child_process');

// source websocket video, change to your own
var ws = new WebSocket('ws://v.test.com:8000');
ws.on('open', function () {
  process.stderr.write('open')
  var width = 480
  var height = 270
  var wh1 = (width >> 4),
    wh2 = ((width & 0xf) << 4) | (height >> 8),
    wh3 = (height & 0xff);
  var blob = new Buffer(new Uint8Array([
    0x00, 0x00, 0x01, 0xb3, // Sequence Start Code
    wh1, wh2, wh3, // Width & height
    0x13, // aspect ratio & framerate
    0xff, 0xff, 0xe1, 0x58, // Meh. Bitrate and other boring stuff
    0x00, 0x00, 0x01, 0xb8, 0x00, 0x08, 0x00, // GOP
    0x00, 0x00, 0x00, 0x01, 0x00 // First Picture Start Code
  ]));
  process.stdout.write(blob, 'binary');

  // destination rtmp video, we can make this work with Node-Media-Server to create a rtmp server
  const rtmpUrl = 'rtmp://localhost:443/live/video1';
  const ffmpeg = child_process.spawn('ffmpeg', [
    '-i', '-',
    '-r', '15', '-g', '45', '-s', '480x270', '-maxrate', '600k', '-bufsize', '600k', '-crf', '25'
    , '-pix_fmt', 'yuv420p', '-c:v', 'libx264', '-vprofile', 'baseline', '-tune', 'zerolatency',
    '-f', 'flv',
    rtmpUrl
  ]);
  ffmpeg.on('close', (code, signal) => {
    console.log('FFmpeg child process closed, code ' + code + ', signal ' + signal);
    ws.terminate();
  });

  ffmpeg.stdin.on('error', (e) => {
    console.log('FFmpeg STDIN Error', e);
  });
  ffmpeg.stderr.on('data', (data) => {
    console.log('FFmpeg STDERR:', data.toString());
  });
  ws.on('message', (msg) => {
    ffmpeg.stdin.write(msg);
  });

});
function heartbeat() {
  clearTimeout(this.pingTimeout);
  this.pingTimeout = setTimeout(() => {
    this.terminate();
  }, 5000);
}
ws.on('ping', heartbeat);
ws.on('close', function clear() {
  clearTimeout(this.pingTimeout);
});