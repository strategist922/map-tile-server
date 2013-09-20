#!/usr/bin/env node
'use strict';

var mapnik = require('mapnik');
var optimist = require('optimist');
var path = require('path');
var GoogleProjection = require('./googleProjection');

var argv = optimist
  .usage('Usage: render_tile.js [options]')
  .options('out', {
    describe: 'The output filename.'
  })
  .options('stylesheet', {
    default: path.join(__dirname, "osm.xml"),
    describe: 'The stylesheet filename.'
  })
  .options('width', {
    default: 256,
    describe: 'The width of the map.'
  })
  .options('height', {
    default: 256,
    describe: 'The height of the map.'
  })
  .options('x', {
    describe: 'Tile X.'
  })
  .options('y', {
    describe: 'Tile Y.'
  })
  .options('zoom', {
    describe: 'The zoom level.'
  })
  .alias('help', 'h')
  .alias('h', '?')
  .demand(['out', 'stylesheet', 'width', 'height'])
  .argv;

if (argv.help) {
  optimist.showHelp();
  process.exit(1);
}

process.on('uncaughtException', function(err) {
  console.error('uncaughtException', err.stack || err);
  process.exit(1);
});

function render(argv) {
    var tileX = argv.x;
    var tileY = argv.y;
    var tileWidth = parseInt(argv.width);
    var tileHeight = parseInt(argv.height);

    console.log(argv, tileWidth, tileHeight);
    var map = new mapnik.Map(tileWidth, tileHeight);
    map.loadSync(argv.stylesheet, { strict: true });

    var maxZoom = 20;
    var prj = new mapnik.Projection(map.srs);
    var tileproj = new GoogleProjection(maxZoom + 1);

    // Calculate pixel positions of bottom-left & top-right
    var p0 = [tileX * tileWidth, (tileY + 1) * tileHeight];
    var p1 = [(tileX + 1) * tileWidth, tileY * tileHeight];
    console.log('p0', p0);
    console.log('p1', p1);

    // Convert to LatLong (EPSG:4326)
    var l0 = tileproj.fromPixelToLL(p0, argv.zoom);
    var l1 = tileproj.fromPixelToLL(p1, argv.zoom);
    console.log('l0', l0);
    console.log('l1', l1);

    // Convert to map projection (e.g. mercator co-ords EPSG:900913)
    var c0 = prj.forward([l0[0], l0[1]]);
    var c1 = prj.forward([l1[0], l1[1]]);
    console.log('c0', c0);
    console.log('c1', c1);

    map.resize(tileWidth, tileHeight);
    map.zoomToBox(c0[0], c0[1], c1[0], c1[1]);
    map.bufferSize = 128;
    map.renderFileSync(argv.out);
}

render(argv);