﻿const { jsPDF } = require("jspdf"); // will automatically load the node version
var callAddFont = function () {
this.addFileToVFS('segoeui-normal.ttf', font);
this.addFont('segoeui-normal.ttf', 'segoeui', 'normal');
};
jsPDF.API.events.push(['addFonts', callAddFont])