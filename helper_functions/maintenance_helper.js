// *---------------*
//  Export Report Helpers
// *---------------*
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');
const json2xls = require('json2xls');
const { jsPDF } = require('jspdf'); // will automatically load the node version
const { autoTable } = require('jspdf-autotable'); // will automatically load the node version

require('./report_maker/fonts/SegoeUI/segoeui-normal');
require('./report_maker/fonts/SegoeUI/seguisb-normal');

// const basePath = 'C:/AppDev/NJDOT/voyager.server/api/helper_functions/report_maker/';
const basePath = `${__dirname}\\`;

function fileExport(queryStrings, data) {
    if (queryStrings.fileFormat == 'pdf') {
        return generatePDF(queryStrings, data);
    } else if (queryStrings.fileFormat == 'csv') {
        return generateCSV(data);
    } else if (queryStrings.fileFormat == 'xlsx') {
        return generateExcel(data);
    } else {
        return 'no file type specified';
    }
}

function generateExcel(data) {
    return new Promise((resolve, reject) => {
        try {
            const fileName = 'maintenanceReport_' + Date.now() + `.xlsx`;
            const savePath = path.join(basePath + 'output', fileName);
            const fileInfo = {
                savePath: savePath,
                fileName: fileName
            };
            const xls = json2xls(data);

            fs.writeFileSync(savePath, xls, 'binary');

            return resolve(fileInfo);
        } catch (error) {
            return reject('file not created');
        }
    });
}

function generateCSV(data) {
    return new Promise((resolve, reject) => {
        try {
            const fileName = 'maintenanceReport_' + Date.now() + `.csv`;
            const savePath = path.join(basePath + 'output', fileName);
            const fields = Object.keys(data[0]);
            const csv = new Parser({ fields });
            const fileInfo = {
                savePath: savePath,
                fileName: fileName
            };

            fs.writeFileSync(fileInfo.savePath, csv.parse(data), function (error) {
                if (error) {
                    return reject(error);
                }
            });

            return resolve(fileInfo);
        } catch (error) {
            return reject(error);
        }
    });
}

function generatePDF(queryStrings, data) {
    return new Promise((resolve, reject) => {
        try {
            const fileName = 'maintenanceReport_' + Date.now() + `.pdf`;
            const savePath = path.join(basePath + 'output', fileName);
            const fileInfo = {
                savePath: savePath,
                fileName: fileName
            };

            const doc = new jsPDF({
                orientation: 'landscape',
                format: 'tabloid',
                unit: 'pt'
            });

            generateHeader(doc, queryStrings);
            generateTable(doc, data);

            doc.save(savePath);
            return resolve(fileInfo);
        } catch (error) {
            return reject(error);
        }
    });
}

// *---------------*
//  PDF Helpers
// *---------------*
function generateHeader(doc, queryStrings) {
    var njdotLogo = fs.readFileSync(basePath + 'report_maker\\images\\njdotSealSmall.png', 'base64');
    var fhwaLogo = fs.readFileSync(basePath + 'report_maker\\images\\fhwaSealSmall.png', 'base64');

    doc.addImage(njdotLogo, 'PNG', 10, 20, 50, 50, undefined, 'FAST') // FAST to compress image
        .addImage(fhwaLogo, 'PNG', 70, 20, 50, 50, undefined, 'FAST')
        .setFontSize(24)
        .setFont('seguisb', 'normal')
        .text('NJ Safety Voyager', 144, 40)
        .text('Maintenance Report', 144, 62)
        .setFontSize(10)
        .text('Date Range: ', 10, 85)
        .setFont('segoeui', 'normal')
        .text(`${queryStrings.startDate.replace(/-/g, '/')} to ${queryStrings.endDate.replace(/-/g, '/')}`, 72, 85)
        .setDrawColor('#808080')
        .line(130, 70, 1212, 70);
}

function generateTable(doc, data) {
    var totalPagesExp = '{total_pages_count_string}';
    const fields = Object.keys(data[0]);
    var tableData = data;
    var headers = {};
    //for each Fieldname in fields:
    for (let i = 0; i < fields.length; i++) {
        var fieldName = fields[i];
        headers[fieldName] = fieldName;
    }

    doc.autoTable({
        head: [headers],
        body: tableData,
        foot: [headers],
        startY: 94,
        rowPageBreak: 'avoid',
        margin: { top: 10, right: 10, bottom: 20, left: 10 },
        theme: 'striped',
        styles: {
            fontSize: 5,
            lineColor: [84, 84, 84],
            lineWidth: 0.1,
            overflow: 'linebreak'
        },
        headStyles: {
            fillColor: [32, 178, 170],
            textColor: 255
        },
        footStyles: {
            fillColor: [32, 178, 170],
            textColor: 255
        },
        didDrawPage: function (data) {
            // Footer
            var str = 'Page ' + doc.internal.getNumberOfPages();
            // Total page number plugin only available in jspdf v1.0+
            if (typeof doc.putTotalPages === 'function') {
                str = str + ' of ' + totalPagesExp;
            }
            doc.setFontSize(6);

            // jsPDF 1.4+ uses getWidth, <1.4 uses .width
            var pageSize = doc.internal.pageSize;
            var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
            var pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
            doc.text('Maintenance Report | ' + str, pageWidth + 55, pageHeight - 10, null, null, 'right');

            const date = new Date();
            doc.text(`Report Created: ${date.toLocaleString()}`, data.settings.margin.left, pageHeight - 10);
        }
    });

    // Total page number plugin only available in jspdf v1.0+
    if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages(totalPagesExp);
    }
}

// *---------------*
// Module Exports
// *---------------*
module.exports = {
    fileExport: fileExport
};
