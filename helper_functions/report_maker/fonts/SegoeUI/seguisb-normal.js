﻿const { jsPDF } = require("jspdf"); // will automatically load the node version
var callAddFont = function () {
this.addFileToVFS('seguisb-normal.ttf', font);
this.addFont('seguisb-normal.ttf', 'seguisb', 'normal');
};
jsPDF.API.events.push(['addFonts', callAddFont])