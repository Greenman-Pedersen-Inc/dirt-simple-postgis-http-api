// Functions which provide the basic layout of the report including the heading with logos, filter text, and footer layout
// Does not include functions for module-specific formatting such as readable filter text for the Sunglare report.
// Look into the module specific helperFunction files for that.

const path = require('path');
const fs = require('fs');
const { jsPDF } = require("jspdf"); // will automatically load the node version
const { autoTable } = require("jspdf-autotable"); // will automatically load the node version

require('./fonts/SegoeUI/segoeui-normal');     // SegoiUI normal
require('./fonts/SegoeUI/seguisb-normal');     // SegoiUI semi bold

const basePath = 'C:/AppDev/1 Official Projects/NJ Voyager/Node Server/dirt-simple-postgis-http-api/helper_functions/report_maker/';

const pageMarginSides = 19;
const pageMarginEnds = 7;
var currentX = 0;
var currentY = 0;

function createPageLayout(layout) {
    const pageLayout = {
        "letter-portrait": { format: 'letter', orientation: 'portrait', unit: 'mm' },  // (215.9 X 279.4) mm
        "letter-landscape": { format: 'letter', orientation: 'landscape', unit: 'mm' }     // (279.4 X 215.9) mm
    }
    if (layout in pageLayout) {
        return pageLayout[layout];
    }
    else return pageLayout["letter-portrait"];
}

function createFooter (doc, reportTitle) {
    const pageCount = doc.internal.getNumberOfPages();

    for (var i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        // Footer
        doc.setFontSize(6);
        var str = 'Page ' + i + ' of ' + pageCount;
        var pageSize = doc.internal.pageSize;
        var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
        var pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth()
        doc.text(reportTitle + " | " + str, pageWidth - pageMarginSides, pageHeight - pageMarginEnds, null, null, "right");

        const date = new Date();
        doc.text(`Report Created: ${date.toLocaleString()}`, pageMarginSides, pageHeight - pageMarginEnds);
    }
    return doc;
}

function createHeader(doc, reportTitle) {
    const pageSize = doc.internal.pageSize
    const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth()

    const njdotLogo = fs.readFileSync(basePath + 'images/njdotSealSmall.png', 'base64');
    const fhwaLogo = fs.readFileSync(basePath + 'images/fhwaSealSmall.png', 'base64');

    doc
    .addImage(njdotLogo, "PNG", pageMarginSides , pageMarginEnds, 15, 15, undefined, 'FAST')     // FAST to compress image
    .addImage(fhwaLogo, "PNG", pageMarginSides + 15 + 3, pageMarginEnds, 15, 15, undefined, 'FAST')
    .setFontSize(18)
    .setFont("seguisb", "normal")
    .text('NJ Safety Voyager', 71.5 + 52, 13, null, null, "center")
    .text(reportTitle, 71.5 + 52, 20, null, null, "center")
    .setDrawColor("#808080")
    .setLineWidth(.5)
    .line(54, 23, pageWidth - pageMarginSides, 23);

    currentX = pageMarginSides;
    currentY = 30;

    return doc;
}

// {"Year Range": "2019 - 2020"}
function createFiltersSection(doc, filterObject) {
    const fontSize = 10;
    var startX = pageMarginSides;
    doc.setFontSize(fontSize);

    for(var filterTitle in filterObject) {
        if (filterObject.hasOwnProperty(filterTitle)) {
            const filterLabel = filterTitle + ": ";
            const filterValue = filterObject[filterTitle];
            doc
            .setFont("seguisb", "normal")
            .text(filterLabel, pageMarginSides, currentY);

            startX = pageMarginSides + ((doc.getStringUnitWidth(filterLabel) * fontSize) / (72/25.6)) ;
            
            doc
            .setFont("segoeui", "normal")
            .text(filterValue, startX, currentY);

            currentY += 5;
        }
    }
    return currentY;
}

function getCurrentY() {
    return currentY;
}

function generateReportPdf(layout, filters, reportTitle) {
    const docLayout = createPageLayout(layout);
    const doc = new jsPDF(docLayout);
    createHeader(doc, reportTitle);
    if (filters) createFiltersSection(doc, filters);
    return doc;
}

function saveReportPdf(doc, saveTitle){
    return new Promise((resolve, reject) => {
        try {
            const fileName = saveTitle + "_" + Date.now() + `.pdf`;
            const savePath = path.join(__dirname, './output', fileName);
            const fileInfo = {
                'savePath': savePath,
                'fileName': fileName
            }

            doc.save(savePath);
            return resolve(fileInfo);

        } catch (error) {
            return reject(error);
        }
    });
}

module.exports = {
    generateReportPdf: generateReportPdf,
    createFooter: createFooter,
    saveReportPdf: saveReportPdf,
    pageMarginSides: pageMarginSides,
    pageMarginEnds: pageMarginEnds,
    getCurrentY: getCurrentY
};
