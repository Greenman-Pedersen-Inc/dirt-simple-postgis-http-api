﻿const { jsPDF } = require("jspdf"); // will automatically load the node version
var callAddFont = function () {
this.addFileToVFS('segoeuib-bold.ttf', font);
this.addFont('segoeuib-bold.ttf', 'segoeuib', 'bold');
};
jsPDF.API.events.push(['addFonts', callAddFont])