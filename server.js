#!/usr/bin/env node
'use strict';

var mapnik = require('mapnik');
var optimist = require('optimist');
var fs = require('fs');
var path = require('path');
var http = require('http');
var async = require('async');
var mkdirp = require('mkdirp');
var GoogleProjection = require('./googleProjection');

var argv = optimist
  .usage('Usage: server.js [options]')
  .options('cachedir', {
    describe: 'The cache directory.'
  })
  .options('port', {
    default: 9999,
    describe: 'The port to run on.'
  })
  .options('stylesheet', {
    default: path.join(__dirname, "osm.xml"),
    describe: 'The stylesheet filename.'
  })
  .alias('help', 'h')
  .alias('h', '?')
  .demand(['cachedir', 'stylesheet', 'port'])
  .argv;

if (argv.help) {
  optimist.showHelp();
  process.exit(1);
}

process.on('uncaughtException', function(err) {
  console.error('uncaughtException', err.stack || err);
});

function start(options) {
    var tileWidth = 256;
    var tileHeight = 256;

    if (!fs.existsSync(options.stylesheet)) {
        console.error("Could not find stylesheet: ", options.stylesheet);
        return;
    }

    var server = http.createServer(onHttpRequest);
    server.listen(options.port);
    console.log("server started http://localhost:" + options.port);

    function onHttpRequest(req, res) {
        if (req.url == '/favicon.ico') {
            res.writeHead(400);
            return res.end();
        }

        var urlMatch = req.url.match(/\/([0-9]+)\/([0-9]+)\/([0-9]+)\.png/);
        if (!urlMatch) {
            console.error("file not found:", req.url);
            res.writeHead(400);
            return res.end();
        }
        var job = {
            zoom: parseInt(urlMatch[1]),
            tileX: parseInt(urlMatch[2]),
            tileY: parseInt(urlMatch[3]),
            tileWidth: tileWidth,
            tileHeight: tileHeight,
            stylesheet: options.stylesheet
        };
        job.fileName = path.join(options.cachedir, '' + job.zoom, '' + job.tileX, '' + job.tileY + ".png");
        return mapRenderQueue.push(job, function(err, results) {
            if (err) {
                console.error("error", req.url, err);
                res.writeHead(500);
                return res.end();
            }
            console.log("tile served: tileX: " + results.tileX + ", tileY: " + results.tileY + ", zoom: " + results.zoom);
            res.writeHead(200, 'image/png');
            var fileStream = fs.createReadStream(results.fileName);
            fileStream.pipe(res);
        });
    }
}

var mapRenderQueue = async.queue(function (options, callback) {
    return fs.exists(options.fileName, function(exists) {
        if (exists) {
            return callback(null, options);
        }
        return mkdirp(path.dirname(options.fileName), function(err) {
            if (err) {
                return callback(err);
            }

            var map = new mapnik.Map(options.tileWidth, options.tileHeight);
            map.load(options.stylesheet, { strict: true }, function (err) {
                if (err) {
                    return callback(err);
                }

                var maxZoom = 20;
                var prj = new mapnik.Projection(map.srs);
                var tileproj = new GoogleProjection(maxZoom + 1);

                // Calculate pixel positions of bottom-left & top-right
                var p0 = [options.tileX * options.tileWidth, (options.tileY + 1) * options.tileHeight];
                var p1 = [(options.tileX + 1) * options.tileWidth, options.tileY * options.tileHeight];

                // Convert to LatLong (EPSG:4326)
                var l0 = tileproj.fromPixelToLL(p0, options.zoom);
                var l1 = tileproj.fromPixelToLL(p1, options.zoom);

                // Convert to map projection (e.g. mercator co-ords EPSG:900913)
                var c0 = prj.forward([l0[0], l0[1]]);
                var c1 = prj.forward([l1[0], l1[1]]);

//                console.log(options);
//                console.log('p0', p0);
//                console.log('p1', p1);
//                console.log('l0', l0);
//                console.log('l1', l1);
//                console.log('c0', c0);
//                console.log('c1', c1);

                map.resize(options.tileWidth, options.tileWidth);
                map.zoomToBox(c0[0], c0[1], c1[0], c1[1]);
                map.bufferSize = 128;
                console.log("rendering tile: tileX: " + options.tileX + ", tileY: " + options.tileY + ", zoom: " + options.zoom);
                map.renderFile(options.fileName, { scale: 1 }, function(err) {
                    if (err) {
                        return callback(err);
                    }
                    return callback(null, options);
                });
            });
        });
    });
}, 10);

start(argv);
