// *---------------*
//  Export Report Helpers
// *---------------*
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');
const json2xls = require('json2xls');
const { jsPDF } = require("jspdf"); // will automatically load the node version
const { autoTable } = require("jspdf-autotable"); // will automatically load the node version

require('./report_maker/fonts/SegoeUI/segoeui-normal');
require('./report_maker/fonts/SegoeUI/seguisb-normal');

const basePath = 'C:/AppDev/1 Official Projects/NJ Voyager/Node Server/dirt-simple-postgis-http-api/helper_functions/report_maker/';

function FileExport(queryStrings, result) {
    if (queryStrings.fileFormat == 'pdf') {
        return GeneratePDF(queryStrings, result);
    } else if (queryStrings.fileFormat == 'csv') {
        return GenerateCSV(result);
    } else if (queryStrings.fileFormat == 'xlsx') {
        return GenerateExcel(result);
    } else {
        return 'no file type specified';
    }
}

function GenerateExcel(result) {
    return new Promise((resolve, reject) => {
        try {
            const fileName = "maintenanceReport_" + Date.now() + `.xlsx`;
            const savePath = path.join(basePath + 'output', fileName);
            const fileInfo = {
                'savePath': savePath,
                'fileName': fileName
            }
            const xls = json2xls(result.rows);

            fs.writeFileSync(savePath, xls, 'binary');

            return resolve(fileInfo);
        } catch (error) {
            return reject('file not created')
        }
    });
}

function GenerateCSV(result) {
    return new Promise((resolve, reject) => {
        try {
            const fileName = "maintenanceReport_" + Date.now() + `.csv`;
            const savePath = path.join(basePath + 'output', fileName);
            const fields = Object.keys(result.rows[0]);
            const csv = new Parser({ fields });
            const fileInfo = {
                'savePath': savePath,
                'fileName': fileName
            };

            fs.writeFileSync(fileInfo.savePath, csv.parse(result.rows), function (error) {
                if (error) {
                    return reject(error)
                }
            });

            return resolve(fileInfo);
        } catch (error) {
            return reject(error);
        }
    });
}

function GeneratePDF(queryStrings, result) {
    return new Promise((resolve, reject) => {
        try {
            const fileName = "maintenanceReport_" + Date.now() + `.pdf`;
            const savePath = path.join(basePath + 'output', fileName);
            const fileInfo = {
                'savePath': savePath,
                'fileName': fileName
            }
        
            const doc = new jsPDF({
                orientation: "landscape",
                format: "tabloid",
                unit: "pt"
            });
        
            GenerateHeader(doc, queryStrings);
            GenerateTable(doc, result);

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
function GenerateHeader(doc, queryStrings) {
    var njdotLogo = fs.readFileSync(basePath + 'images/njdotSealSmall.png', 'base64');
    var fhwaLogo = fs.readFileSync(basePath + 'images/fhwaSealSmall.png', 'base64');

    doc
    .addImage(njdotLogo, "PNG", 10 , 20, 50, 50, undefined, 'FAST')     // FAST to compress image
    .addImage(fhwaLogo, "PNG", 70 , 20, 50, 50, undefined, 'FAST')
    .setFontSize(24)
    .setFont("seguisb", "normal")
    .text('NJ Safety Voyager', 144, 40)
    .text('Maintenance Report', 144, 62)
    .setFontSize(10)
    .text('Date Range: ', 10, 85)
    .setFont("segoeui", "normal")
    .text(`${queryStrings.startDate} to ${queryStrings.endDate}`, 72, 85)
    .setDrawColor("#808080")
    .line(130, 70, 1212, 70)
}

function GenerateTable(doc, result) {
    var totalPagesExp = '{total_pages_count_string}'
    const fields = Object.keys(result.rows[0]);
    var tableData = result.rows;
    var headers = {};
    //for each Fieldname in fields:
    for (let i = 0; i < fields.length; i++) {
        var fieldName = fields[i];
        headers[fieldName] = fieldName;
    }

    doc.autoTable({
        head: [headers],
        body: tableData,
        startY: 94,
        margin: 10,
        theme: 'striped',
        styles: { 
            fontSize: 6,       
            lineColor: [73, 138, 159],
            lineWidth: 0.2 
        },
        didDrawPage: function (data) {
            // Footer
            var str = 'Page ' + doc.internal.getNumberOfPages()
            // Total page number plugin only available in jspdf v1.0+
            if (typeof doc.putTotalPages === 'function') {
                str = str + ' of ' + totalPagesExp
            }
            doc.setFontSize(6)

            // jsPDF 1.4+ uses getWidth, <1.4 uses .width
            var pageSize = doc.internal.pageSize
            var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
            var pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth()
            doc.text(str, data.settings.margin.left, pageHeight - 10);

            const date = new Date();
            doc.text(`Report Created: ${date.toLocaleString()}`, pageWidth - 10, pageHeight - 10, null, null, "right");
        }
    });

    // Total page number plugin only available in jspdf v1.0+
    if (typeof doc.putTotalPages === 'function') {
        doc.putTotalPages(totalPagesExp)
    }
}


// *---------------*
// Module Exports
// *---------------*
module.exports = {
    FileExport: FileExport
};