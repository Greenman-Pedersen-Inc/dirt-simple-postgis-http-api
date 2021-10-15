// Functions which provide the basic layout of the report including the heading with logos, filter text, and footer layout
// Does not include functions for module-specific formatting such as readable filter text for the Sunglare report.
// Look into the module specific helperFunction files for that.

const path = require('path');
const PDFDocument = require("pdfkit-table");
const fs = require('fs');

var basePath = 'C:/AppDev/1 Official Projects/NJ Voyager/Node Server/dirt-simple-postgis-http-api/helper_functions/report_maker/';

function CreatePageLayout(layout) {
    const pageLayout = {
        "letter-portrait": { margin: 36, size: 'letter', layout: 'portrait' },  // (612.00 X 792.00)
        "letter-landscape": { margin: 36, size: 'letter', layout: 'landscape' }     // (792.00 X 612.00)
    }
    if (layout in pageLayout) {
        return pageLayout[layout];
    }
    else return pageLayout["letter-portrait"];
}

function CreateHeader(doc, reportTitle) {
    const pageMarginSides = 55;
    const pageMarginEnds = 23;

    doc.registerFont('Segoe UI Semibold', basePath + 'fonts/SegoeUI/seguisb.ttf');

    doc
    .image(basePath + 'images/njdotSealSmall.png', pageMarginSides, pageMarginEnds, {width: 50})
    .image(basePath + 'images/fhwaSealSmall.png', pageMarginSides+50+5, pageMarginEnds, {width: 50})

    doc
    .fontSize(16)
    .font('Segoe UI Semibold').text('NJ Safety Voyager', 145, pageMarginEnds, {width: 431, align: 'center'})
    .font('Segoe UI Semibold').text(reportTitle, 145, pageMarginEnds+20, {width: 431, align: 'center'})

    doc
    .moveTo(150, 74)
    .lineTo(612-pageMarginSides, 74)
    .strokeColor('grey')
    .stroke()
}

function CreateFiltersSection(filterObject) {

}

function GenerateReportPdf(layout, reportTitle) {
    const fileName = "reportSample_" + Date.now() + `.pdf`;
    const savePath = path.join(__dirname, './output', fileName);
    const doc = new PDFDocument(CreatePageLayout(layout));
    doc.pipe(fs.createWriteStream(savePath));
    CreateHeader(doc, reportTitle);

    // done
    doc.end();
    return savePath;
}

module.exports = {
    GenerateReportPdf: GenerateReportPdf,
};

