// *---------------*
//  Export Report Helpers
// *---------------*
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');
const PDFDocument = require("pdfkit-table");
const json2xls = require('json2xls');
const basePath = 'C:/AppDev/NJDOT/voyager.server/dirt/helper_functions/report_maker/';

function FileExport(queryStrings, result) {
    if (queryStrings.fileFormat == 'pdf') {
        return generatePDF(queryStrings, result);
    } else if (queryStrings.fileFormat == 'csv') {
        return generateCSV(result);
    } else if (queryStrings.fileFormat == 'xlsx') {
        return generateExcel(result);
    } else {
        return 'no file type specified';
    }
}

function generateExcel(result) {
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

function generateCSV(result) {
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

function generatePDF(queryStrings, result) {
    return new Promise((resolve, reject) => {
        try {
            const fileName = "maintenanceReport_" + Date.now() + `.pdf`;
            const savePath = path.join(basePath + 'output', fileName);
            const doc = new PDFDocument({ margin: 10, size: 'TABLOID', layout: 'landscape', bufferPages: true });      // 1224 x 792
            const writeStream = fs.createWriteStream(savePath);

            doc.pipe(writeStream);
            generateHeader(doc, queryStrings);
            const tableArray = generateTable(doc, result);
            doc.table(tableArray[0], tableArray[1]);

            //Global Edits to All Pages (Header/Footer, etc)
            let pages = doc.bufferedPageRange();
            const date = new Date();

            for (let i = 0; i < pages.count; i++) {
                doc.switchToPage(i);

                //Footer: Add page number
                if (i === 0) {
                    doc.text(
                        `Page: ${i + 1} of ${pages.count}`,
                        1150,
                        775
                    );
                    // Add date
                    doc.text(
                        `Report Created: ${date.toLocaleDateString()}`,
                        10,
                        775
                    );
                }
                else {
                    doc.text(
                        `Page: ${i + 1} of ${pages.count}`,
                        1150,
                        770, // Centered vertically in bottom margin
                        { align: 'center' }
                    );
                    // Add date
                    doc.text(
                        `Report Created: ${date.toLocaleDateString()}`,
                        10,
                        770, // Centered vertically in bottom margin
                    );
                }
            }

            doc.end();

            // the write stream ends asynchronously
            // to account for this we return a promise that resolves when it finishes
            writeStream.on('finish', function () {
                const fileInfo = {
                    'savePath': savePath,
                    'fileName': fileName
                }

                return resolve(fileInfo);
            });
        } catch (error) {
            return reject(error);
        }
    });
}

// *---------------*
//  PDF Helpers
// *---------------*
function generateHeader(doc, queryStrings) {
    doc.registerFont('Segoe UI Semibold', basePath + 'fonts/SegoeUI/seguisb.ttf');
    doc.registerFont('Segoe UI', basePath + 'fonts/SegoeUI/segoeui.ttf');

    doc
        .image(basePath + 'images/njdotSealSmall.png', 10, 20, { width: 50 })
        .image(basePath + 'images/fhwaSealSmall.png', 70, 20, { width: 50 })
        .fontSize(20)
        .font('Segoe UI Semibold').text('NJ Safety Voyager', 144, 20, { align: 'center right' })
        .font('Segoe UI Semibold').text('Maintenance Report', 144, 42, { align: 'center right' })
        .fontSize(10)
        .font('Segoe UI Semibold').text('Date Range: ', 10, 80, { continued: true })
        .font('Segoe UI').text(`${queryStrings.startDate} to ${queryStrings.endDate}`, 10, 80)
        .moveTo(130, 70)
        .lineTo(1212, 70)
        .strokeColor('grey')
        .stroke()
}

function generateTable(docObj, result) {
    const fields = Object.keys(result.rows[0]);
    var tableData = result.rows;
    var headerArray = [];
    var cellProp = null;

    //for each Fieldname in fields:
    for (let i = 0; i < fields.length; i++) {
        var objs = {
            label: fields[i],
            property: fields[i],
            renderer: (value, indexColumn, indexRow, row, rectRow, rectCell) => {
                cellProp = rectCell;
                return value;
            },
        };

        headerArray.push(objs);
    }

    const tableJson = {
        "headers": headerArray,
        "datas": tableData,
    };

    var options = {
        y: 105,
        prepareHeader: () => docObj.font('Segoe UI Semibold').fontSize(6),
        prepareRow: (row, indexColumn, indexRow, rectRow) => {
            docObj.font('Segoe UI').fontSize(5);
            indexColumn === 0 && docObj.addBackground(rectRow, (indexRow % 2 ? 'grey' : 'white'), 0.1);
            //console.log(rectRow);
            //docObj.rect(rectRow.x, rectRow.y, rectRow.width, rectRow.height).strokeOpacity(.3).stroke();
        }
    };

    return [tableJson, options];
}

// *---------------*
// Module Exports
// *---------------*
module.exports = {
    FileExport: FileExport
};