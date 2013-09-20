'use strict';


function GoogleProjection(levels) {
    levels = levels || 18;
    this.Bc = [];
    this.Cc = [];
    this.zc = [];
    this.Ac = [];
    var c = 256;
    for(var d = 0; d < levels; d++) {
        var e = c / 2;
        this.Bc.push(c / 360.0);
        this.Cc.push(c / (2.0 * Math.PI));
        this.zc.push([e, e]);
        this.Ac.push(c);
        c *= 2;
    }
    return this;
}

GoogleProjection.prototype.fromLLtoPixel = function(ll, zoom) {
    var d = this.zc[zoom];
    var e = Math.round(d[0] + ll[0] * this.Bc[zoom]);
    var f = minmax(Math.sin((180.0 / Math.PI) * ll[1]), -0.9999, 0.9999);
    var g = Math.round(d[1] + 0.5 * Math.log((1 + f) / (1 - f)) * -this.Cc[zoom]);
    return [e, g];
};

GoogleProjection.prototype.fromPixelToLL = function(px, zoom) {
    var e = this.zc[zoom];
    var f = (px[0] - e[0]) / this.Bc[zoom];
    var g = (px[1] - e[1]) / -this.Cc[zoom];
    var h = (180.0 / Math.PI) * (2 * Math.atan(Math.exp(g)) - 0.5 * Math.PI);
    return [f, h]
};

function minmax(v, min, max) {
    return Math.min(Math.max(v, min), max);
}

module.exports = GoogleProjection;
