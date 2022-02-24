const { jsPDF } = require('jspdf'); // will automatically load the node version
const { autoTable } = require('jspdf-autotable'); // will automatically load the node version
const reportHelper = require('./report_maker/report_layout');
const codeTranslator = require('./code_translator');
require('./report_maker/fonts/SegoeUI/segoeui-normal'); // SegoiUI normal
require('./report_maker/fonts/SegoeUI/seguisb-normal'); // SegoiUI semi bold
// *---------------*
//  Jurisdiction Report Helper Functions
// *---------------*
function makeJurisdictionReport(queryArgs, reportData) {
    const juriName = getJurisdictionName(queryArgs.jurisdictionCode);
    const filterObject = getFilterObject(queryArgs);
    const doc = reportHelper.generateReportPdf('letter-portrait', filterObject, juriName + ' - Comparision Summary');
    getLegend(doc, juriName, 39);
    const tablesStart = 62;
    getReportTable(doc, reportData['pedestrians'], 'PEDESTRIAN & PEDACYCLIST TABLES', tablesStart);
    getReportTable(doc, reportData['drivers'], 'DRIVER TABLES', doc.lastAutoTable.finalY + 10);
    getReportTable(doc, reportData['vehicles'], 'VEHICLE TABLES', doc.lastAutoTable.finalY + 10);
    getReportTable(doc, reportData['crashes'], 'CRASH TABLES', doc.lastAutoTable.finalY + 10);
    if ('police' in reportData) {
        getReportTable(
            doc,
            reportData['police'],
            'CRASH COUNTS BY EWING MUNICIPALITY POLICE',
            doc.lastAutoTable.finalY + 10,
            'police',
            2
        );
        getReportTable(doc, reportData['police2'], null, doc.lastAutoTable.finalY + 10, 'police', 3, queryArgs);
    }
    reportHelper.createFooter(doc, juriName + ' - Comparision Summary');
    return reportHelper.saveReportPdf(doc, 'jurisdictionReport');
}

function getReportQueries(queryArgs) {
    var pedQueries = getPedestrianQueries(queryArgs);
    var driverQueries = getDriverQueries(queryArgs);
    var vehiclesQueries = getVehicleQueries(queryArgs);
    var crashesQueries = getCrashQueries(queryArgs);
    var reportQueries = {
        pedestrians: pedQueries,
        drivers: driverQueries,
        vehicles: vehiclesQueries,
        crashes: crashesQueries
    };

    // additional police tables for Ewing
    if (queryArgs.jurisdictionCode === '1102') {
        reportQueries['police'] = getPoliceQueries(queryArgs, false);
        reportQueries['police2'] = getPoliceQueries(queryArgs, true);
    }
    return reportQueries;
}

// translates the input filters for the report
function getFilterObject(queryArgs) {
    return { 'Year Range': queryArgs.startYear + ' - ' + queryArgs.endYear };
}

function getJurisdictionName(jurisdictionCode) {
    if (jurisdictionCode.length === 4) {
        return codeTranslator.convertCodeDescription('mun_mu', jurisdictionCode);
    } else {
        return codeTranslator.convertCodeDescription('mun_cty_co', jurisdictionCode);
    }
}

function getNestedWhere(jurisdictionCode, category) {
    var cty = 'acc_mun_cty_co';
    var muni = 'acc_mun_mu';

    if (category === 'drivers') {
        cty = 'veh_acc_mun_cty_co';
        muni = 'veh_acc_mun_mu';
    } else if (category === 'crashes' || category === 'police') {
        cty = 'mun_cty_co';
        muni = 'mun_mu';
    }

    if (jurisdictionCode.length === 4) {
        const countyCode = jurisdictionCode.slice(0, 2);
        const muniCode = jurisdictionCode.slice(-2);
        return `${cty} = '${countyCode}' AND ${muni} = '${muniCode}'`;
    } else {
        return `${cty} = '${jurisdictionCode}'`;
    }
}

function getTableTitleHeader(doc, tableTitle, yPos) {
    const leftMargin = reportHelper.pageMarginSides;
    const pageSize = doc.internal.pageSize;
    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
    var currYPos = yPos;

    if (tableTitle) {
        doc.setFont('seguisb', 'normal').setFontSize(14).text(tableTitle, leftMargin, yPos);
        currYPos += 1;
        doc.setDrawColor(0)
            .setLineWidth(0.5)
            .line(leftMargin, currYPos, pageWidth - leftMargin, currYPos);
        currYPos += 3;
    }
    return currYPos;
}

function getTableHeader(doc, currYPos, isPoliceTable = false, numPoliceCols = 2) {
    var headerSettings = {
        startY: currYPos,
        margin: { right: reportHelper.pageMarginSides, left: reportHelper.pageMarginSides },
        styles: {
            lineColor: [84, 84, 84],
            lineWidth: 0.1,
            fontStyle: 'bold',
            fillColor: [40, 127, 186],
            textColor: 255
        }
    };

    if (!isPoliceTable) {
        headerSettings['body'] = [['CRASH CHARACTERISTIC', 'MUNICIPALITY COUNT', 'MUNICIPALITY %', 'STATE %']];
        headerSettings['columnStyles'] = {
            0: { cellWidth: 64, halign: 'center', fillColor: [40, 127, 186] },
            1: { cellWidth: 45, halign: 'center', fillColor: [40, 127, 186] },
            2: { cellWidth: 37, halign: 'center', fillColor: [40, 127, 186] },
            3: { cellWidth: 32, halign: 'center', fillColor: [40, 127, 186] }
        };
    } else {
        if (numPoliceCols === 2) {
            headerSettings['body'] = [['YEAR', 'CRASH COUNT']];
            headerSettings['columnStyles'] = {
                0: { cellWidth: 89, halign: 'center', fillColor: [40, 127, 186] },
                1: { cellWidth: 89, halign: 'center', fillColor: [40, 127, 186] }
            };
        } else {
            headerSettings['body'] = [['YEAR', 'ATTRIBUTE', 'CRASH COUNT']];
            headerSettings['columnStyles'] = {
                0: { cellWidth: 59, halign: 'center', fillColor: [40, 127, 186] },
                1: { cellWidth: 59, halign: 'center', fillColor: [40, 127, 186] },
                2: { cellWidth: 60, halign: 'center', fillColor: [40, 127, 186] }
            };
        }
    }

    doc.autoTable(headerSettings);
    return doc;
}

function getLegend(doc, juriName, yPos) {
    const leftMargin = reportHelper.pageMarginSides;
    const pageSize = doc.internal.pageSize;
    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
    var currYPos = yPos;

    doc.setFont('seguisb', 'normal').setFontSize(14).text('LEGEND', leftMargin, yPos);
    currYPos += 1;
    doc.setDrawColor(0) // draw black lines
        .setLineWidth(0.5)
        .line(leftMargin, currYPos, pageWidth - leftMargin, currYPos);
    currYPos += 5;
    doc.setFont('segoeui', 'normal')
        .setFontSize(12)
        .text(`Difference between ${juriName} % and State %`, leftMargin, currYPos);
    currYPos += 3;
    doc.setDrawColor(0)
        .setFillColor(255, 255, 128)
        .rect(reportHelper.pageMarginSides, currYPos, 5, 5, 'FD')
        .text('2% - 5%', leftMargin + 5 + 3, currYPos + 4)
        .setFillColor(239, 93, 87)
        .rect(leftMargin + 5 + 3 + 35, currYPos, 5, 5, 'FD')
        .text('> 5%', leftMargin + 5 + 3 + 35 + 8, currYPos + 4);
    return doc;
}

function getReportTable(doc, reportData, headerTitle, yPos, category, policeCols, queryArgs) {
    var currY = getTableTitleHeader(doc, headerTitle, yPos);
    if (category === 'police' || category === 'police2') {
        getTableHeader(doc, currY, true, policeCols);
    } else getTableHeader(doc, currY);

    reportData.forEach((dataTable) => {
        var tableType = Object.keys(dataTable)[0];
        var tableData = dataTable[tableType];
        var tableCols = Object.keys(tableData[0]).length;

        if (category !== 'police') {
            tableData.push({
                code: 'Total',
                juricount: tableData[0].juritotal,
                juripercent: 100.0,
                statepercent: ''
            });
        }

        var tableSettings = {
            startY: doc.lastAutoTable.finalY,
            margin: { right: reportHelper.pageMarginSides, left: reportHelper.pageMarginSides },
            styles: {
                lineColor: [84, 84, 84],
                lineWidth: 0.1,
                textColor: [0, 0, 0],
                rowPageBreak: 'always',
                pageBreak: 'auto'
            },
            head: [
                [
                    {
                        content: tableType,
                        colSpan: tableCols,
                        styles: {
                            halign: 'center',
                            fillColor: [32, 178, 170],
                            textColor: 255
                        }
                    }
                ]
            ]
        };

        if (category === 'police') {
            if (tableCols === 3) {
                tableSettings['columns'] = [
                    { dataKey: 'year', header: 'year' },
                    { dataKey: 'code', header: 'code' },
                    { dataKey: 'count', header: 'count' }
                ];
                tableSettings['columnStyles'] = {
                    0: { cellWidth: 59, halign: 'center' },
                    1: { cellWidth: 59, halign: 'center' },
                    2: { cellWidth: 60, halign: 'center' }
                };
                var body = [];
                var year = queryArgs.startYear;
                var yearSpanLength = 0;
                var spanRowIdx = 0;

                for (var i = 0; i < tableData.length; i++) {
                    var row = [];

                    var aRow = tableData[i];
                    if (i === tableData.length - 1) {
                        var yearSpan = {
                            rowSpan: yearSpanLength,
                            content: year,
                            styles: { valign: 'middle', halign: 'center' }
                        };

                        var targetRow = body[spanRowIdx];
                        targetRow.unshift(yearSpan);
                        break;
                    }

                    for (var key in tableData[i]) {
                        if (key !== 'year') row.push(tableData[i][key]);
                    }

                    if (year.toString() === aRow.year) {
                        yearSpanLength++;
                    } else {
                        var yearSpan = {
                            rowSpan: yearSpanLength,
                            content: year,
                            styles: { valign: 'middle', halign: 'center' }
                        };

                        var targetRow = body[spanRowIdx];
                        targetRow.unshift(yearSpan);
                        year++;
                        yearSpanLength = 1;
                        spanRowIdx = i;
                    }
                    body.push(row);
                }
                tableSettings['body'] = body;
            } else if (category === 'police') {
                tableSettings['columns'] = [
                    { dataKey: 'year', header: 'year' },
                    { dataKey: 'count', header: 'count' }
                ];
                tableSettings['columnStyles'] = {
                    0: { cellWidth: 89, halign: 'center' },
                    1: { cellWidth: 89, halign: 'center' }
                };
                tableSettings['body'] = tableData;
            }
        } else {
            tableSettings['columns'] = [
                { dataKey: 'code', header: 'code' },
                { dataKey: 'juricount', header: 'juricount' },
                { dataKey: 'juripercent', header: 'juripercent' },
                { dataKey: 'statepercent', header: 'statepercent' }
            ];
            tableSettings['columnStyles'] = {
                0: { cellWidth: 64 },
                1: { cellWidth: 45, halign: 'center' },
                2: { cellWidth: 37, halign: 'center' },
                3: { cellWidth: 32, halign: 'center' }
            };
            tableSettings['allSectionHooks'] = true;
            tableSettings['didParseCell'] = function (data) {
                if (data.column.dataKey === 'juripercent' || data.column.dataKey === 'statepercent') {
                    if (data.cell.raw === null || data.cell.raw === 'null') {
                        data.cell.text = '0.00%';
                    } else if (data.cell.raw !== '') {
                        data.cell.text = data.cell.raw + '%'; // add % signs to the percent cols
                    }
                }
                if (data.row.section === 'body') {
                    if (parseFloat(data.row.raw['difference']) > 5.0) {
                        data.cell.styles.fillColor = [239, 93, 87]; // Red
                    } else if (
                        parseFloat(data.row.raw['difference']) <= 5.0 &&
                        parseFloat(data.row.raw['difference']) >= 2.0
                    ) {
                        data.cell.styles.fillColor = [255, 255, 128]; // Yellow
                    }
                }
                if (data.row.index === tableData.length - 1) {
                    data.cell.styles.fontStyle = 'bold'; // bold the TOTAL row
                }
            };
            tableSettings['body'] = tableData;
        }

        doc.autoTable(tableSettings);
    });
}

// *---------------*
//  PEDESTRIAN TABLES
// *---------------*
function getPedestrianQueries(queryArgs) {
    const category = 'pedestrians';
    const nestedWhere = getNestedWhere(queryArgs.jurisdictionCode, category);
    var queries = [
        {
            name: 'GENDER',
            category: category,
            query: getPedestrianGenderQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'AGE',
            category: category,
            query: getPedestrianAgeQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'PRE-CRASH ACTION',
            category: category,
            query: getPedestrianPreCrashQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        }
    ];
    return queries;
}

function getPedestrianGenderQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.ped_gender_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians_partition where ${nestedWhere} 
    and acc_year >= ${startYear} and acc_year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
    (SELECT (CASE sex
                WHEN 'F' THEN 'Female'
                WHEN 'M' THEN 'Male'
                ELSE 'Unknown'
                END)
                AS code, count(*) as JuriCount
                FROM ard_pedestrians_partition where ${nestedWhere} and acc_year >= ${startYear} and acc_year <= ${endYear}
                group by sex order by sex) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;
    return query;
}

function getPedestrianAgeQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.ped_age_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians_partition where ${nestedWhere} 
    and acc_year >= ${startYear} and acc_year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount, 
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
    (
        SELECT AgeBucket AS Code, count(*) AS JuriCount FROM (
            SELECT 
            CASE
            WHEN age < 10 THEN '0-9'
            WHEN age >= 10 and age < 20 THEN '10-19'
            WHEN age >= 20 and age < 30 THEN '20-29'
            WHEN age >= 30 and age < 40 THEN '30-39'
            WHEN age >= 40 and age < 50 THEN '40-49'
            WHEN age >= 50 and age < 60 THEN '50-59'
            WHEN age >= 60 and age < 70 THEN '60-69'
            WHEN age >= 70 THEN '70+'
            ELSE 'Unknown'
            END
            AS AgeBucket
            FROM ard_pedestrians_partition where ${nestedWhere} and acc_year >= ${startYear} and acc_year <= ${endYear}
        ) AS ageData
        GROUP BY AgeBucket ORDER BY AgeBucket
    ) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;
    return query;
}

function getPedestrianPreCrashQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.ped_precrash_state';
    const juriTable = 'state_trends.crash_pre_crash_action';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians_partition where ${nestedWhere} 
    and acc_year >= ${startYear} and acc_year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount, 
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (        SELECT State.type AS Code, JuriCount, StateCount AS StateCount FROM 
        (
            SELECT * FROM (
                SELECT (CASE 
                WHEN pre_crash_type IS NULL THEN '-20'
                ELSE pre_crash_type
                END), count(*) AS JuriCount 
                FROM ard_pedestrians_partition
                WHERE ${nestedWhere} AND (acc_year >= ${startYear} and acc_year <= ${endYear})
                GROUP BY pre_crash_type ORDER BY pre_crash_type
            ) AS preCrashCount
            LEFT JOIN
            ${juriTable} ON pre_crash_type = code ORDER BY pre_crash_type
        ) AS Juri 
        RIGHT JOIN
        (
            SELECT code, type, SUM(statecount) AS StateCount FROM ${stateTable}
            WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code, type ORDER BY code
        ) AS State
        ON Juri.code = State.code
    GROUP BY State.type, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;
    return query;
}

// *---------------*
//  DRIVER TABLES
// *---------------*
function getDriverQueries(queryArgs) {
    const category = 'drivers';
    const nestedWhere = getNestedWhere(queryArgs.jurisdictionCode, category);
    var queries = [
        {
            name: 'GENDER',
            category: category,
            query: getDriverGenderQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'AGE',
            category: category,
            query: getDriverAgeQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        }
    ];
    return queries;
}

function getDriverGenderQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.driver_gender_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_occupants_partition where ${nestedWhere} and position_in_code = '01'
    and veh_acc_year >= ${startYear} and veh_acc_year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
    (SELECT (CASE sex
                WHEN 'F' THEN 'Female'
                WHEN 'M' THEN 'Male'
                ELSE 'Unknown'
                END)
                AS code, count(*) as JuriCount
                FROM ard_occupants_partition where ${nestedWhere} and position_in_code = '01' and veh_acc_year >= ${startYear} and veh_acc_year <= ${endYear}
                group by sex order by sex) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;
    return query;
}

function getDriverAgeQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.ped_age_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_occupants_partition where ${nestedWhere} and position_in_code = '01'
    and veh_acc_year >= ${startYear} and veh_acc_year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount, 
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
    (
        SELECT AgeBucket AS Code, count(*) AS JuriCount FROM (
            SELECT 
            CASE
            WHEN age < 10 THEN '0-9'
            WHEN age >= 10 and age < 20 THEN '10-19'
            WHEN age >= 20 and age < 30 THEN '20-29'
            WHEN age >= 30 and age < 40 THEN '30-39'
            WHEN age >= 40 and age < 50 THEN '40-49'
            WHEN age >= 50 and age < 60 THEN '50-59'
            WHEN age >= 60 and age < 70 THEN '60-69'
            WHEN age >= 70 THEN '70+'
            ELSE 'Unknown'
            END
            AS AgeBucket
            FROM ard_occupants_partition where ${nestedWhere} and position_in_code = '01' and veh_acc_year >= ${startYear} and veh_acc_year <= ${endYear}
        ) AS ageData
        GROUP BY AgeBucket ORDER BY AgeBucket
    ) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;
    return query;
}

// *---------------*
//  VEHICLE TABLES
// *---------------*
function getVehicleQueries(queryArgs) {
    const category = 'vehicles';
    const nestedWhere = getNestedWhere(queryArgs.jurisdictionCode, category);
    var queries = [
        {
            name: 'CONTRIBUTING CIRCUMSTANCES',
            category: category,
            query: getContrQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'HIT & RUN',
            category: category,
            query: getHitRunQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        }
    ];
    return queries;
}

function getContrQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.veh_contr_state';
    const juriTable = 'state_trends.veh_contr_code';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_vehicles_partition where ${nestedWhere} 
    and acc_year >= ${startYear} and acc_year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount, 
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (        SELECT State.type AS Code, JuriCount, StateCount AS StateCount FROM 
        (
            SELECT * FROM (SELECT (CASE 
                WHEN contr_circum_code1 IS NULL THEN '-20'
                ELSE contr_circum_code1
                END), count(*) AS JuriCount 
                FROM ard_vehicles_partition
                WHERE ${nestedWhere} AND (acc_year >= ${startYear} and acc_year <= ${endYear})
                GROUP BY contr_circum_code1 ORDER BY contr_circum_code1
            ) AS preCrashCount
            LEFT JOIN
            ${juriTable} ON contr_circum_code1 = code ORDER BY contr_circum_code1
        ) AS Juri 
        RIGHT JOIN
        (
            SELECT code, type, SUM(statecount) AS StateCount FROM ${stateTable}
            WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code, type ORDER BY code
        ) AS State
        ON Juri.code = State.code
    GROUP BY State.type, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;
    return query;
}

function getHitRunQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.veh_hitrun_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_vehicles_partition where ${nestedWhere} 
    and acc_year >= ${startYear} and acc_year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
        (SELECT (CASE flg_hit_run
            WHEN 'Y' THEN 'Yes'
            ELSE 'No'
            END)
            as code, count(*) as JuriCount
            FROM (select * from public.ard_vehicles_partition where ${nestedWhere} AND (acc_year >= ${startYear} and acc_year <= ${endYear})) as foo
            group by flg_hit_run) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;
    return query;
}
// *---------------*
//  CRASH TABLES
// *---------------*
function getCrashQueries(queryArgs) {
    const category = 'crashes';
    const nestedWhere = getNestedWhere(queryArgs.jurisdictionCode, category);
    var queries = [
        {
            name: 'ALCOHOL INVOLVED',
            category: category,
            query: getAlcoholQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'AT INTERSECTION',
            category: category,
            query: getIntersectionQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'CRASH YEAR',
            category: category,
            query: getYearQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'CRASH MONTH',
            category: category,
            query: getMonthQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'CRASH DAY',
            category: category,
            query: getDayQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'TIME OF DAY',
            category: category,
            query: getTimeQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'LIGHT CONDITION',
            category: category,
            query: getLightQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        },
        {
            name: 'SEVERITY',
            category: category,
            query: getSeverityQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)
        }
    ];
    return queries;
}
function getAlcoholQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.crash_alcohol_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_accidents where ${nestedWhere} 
    and year >= ${startYear} and year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
        (SELECT (CASE alcohol_involved
            WHEN 'Y' THEN 'Yes'
            ELSE 'No'
            END)
            as code, count(*) as JuriCount
            FROM (select * from ard_accidents where ${nestedWhere} AND (year >= ${startYear} and year <= ${endYear})) as foo
            group by alcohol_involved) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;

    return query;
}
function getIntersectionQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.crash_intersection_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_accidents where ${nestedWhere} 
    and year >= ${startYear} and year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
        (SELECT (CASE intersection
            WHEN 'Y' THEN 'Yes'
            ELSE 'No'
            END)
            as code, count(*) as JuriCount
            FROM (select * from ard_accidents where ${nestedWhere} AND (year >= ${startYear} and year <= ${endYear})) as foo
            group by intersection) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;

    return query;
}

function getYearQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.crash_year_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_accidents where ${nestedWhere} 
    and year >= ${startYear} and year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
        (Select year as Code, count(*) as JuriCount from (Select year from ard_accidents where ${nestedWhere} AND (year >= ${startYear} and year <= ${endYear})) as foo
        group by year) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;

    return query;
}

function getMonthQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.crash_month_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_accidents where ${nestedWhere} 
    and year >= ${startYear} and year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
        (Select 
            (
                CASE acc_month
                WHEN  '1' THEN 'January'
                WHEN  '2' THEN 'February'
                WHEN  '3' THEN 'March'
                WHEN  '4' THEN 'April'
                WHEN  '5' THEN 'May'
                WHEN  '6' THEN 'June'
                WHEN  '7' THEN 'July'
                WHEN  '8' THEN 'August'
                WHEN  '9' THEN 'September'
                WHEN  '10' THEN 'October'
                WHEN  '11' THEN 'November'
                WHEN  '12' THEN 'December'
                ELSE 'Unknown'
                END
            )
            AS code, count(*) AS JuriCount, acc_month
            from ard_accidents where ${nestedWhere} AND (year >= ${startYear} and year <= ${endYear})
            GROUP BY acc_month ORDER BY acc_month) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;

    return query;
}

function getDayQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.crash_day_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_accidents where ${nestedWhere} 
    and year >= ${startYear} and year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
        (Select 
            (CASE acc_dow
            WHEN  'SU' THEN 'Sunday'
            WHEN  'MO' THEN 'Monday'
            WHEN  'TU' THEN 'Tuesday'
            WHEN  'WE' THEN 'Wednesday'
            WHEN  'TH' THEN 'Thursday'
            WHEN  'FR' THEN 'Friday'
            WHEN  'SA' THEN 'Saturday'
            ELSE 'Unknown'
            END) as Code,
                                    
            (CASE acc_dow
            WHEN  'SU' THEN '1'
            WHEN  'MO' THEN '2'
            WHEN  'TU' THEN '3'
            WHEN  'WE' THEN '4'
            WHEN  'TH' THEN '5'
            WHEN  'FR' THEN '6'
            WHEN  'SA' THEN '7'
            ELSE 'Unknown'
            END) as ordr,
            count(*)  AS JuriCount
            from ard_accidents where ${nestedWhere} AND (year >= ${startYear} and year <= ${endYear})
            group by acc_dow  order by ordr) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;

    return query;
}

function getTimeQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.crash_hour_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_accidents where ${nestedWhere} 
    and year >= ${startYear} and year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
        (Select 
            (CASE hour
            WHEN  '00' THEN '12 am'
            WHEN  '01' THEN ' 1 am'
            WHEN  '02' THEN ' 2 am'
            WHEN  '03' THEN ' 3 am'
            WHEN  '04' THEN ' 4 am'
            WHEN  '05' THEN ' 5 am'
            WHEN  '06' THEN ' 6 am'
            WHEN  '07' THEN ' 7 am'
            WHEN  '08' THEN ' 8 am'
            WHEN  '09' THEN ' 9 am'
            WHEN  '10' THEN '10 am'
            WHEN  '11' THEN '11 am'
            WHEN  '12' THEN '12 pm'
            WHEN  '13' THEN ' 1 pm'
            WHEN  '14' THEN ' 2 pm'
            WHEN  '15' THEN ' 3 pm'
            WHEN  '16' THEN ' 4 pm'
            WHEN  '17' THEN ' 5 pm'
            WHEN  '18' THEN ' 6 pm'
            WHEN  '19' THEN ' 7 pm'
            WHEN  '20' THEN ' 8 pm'
            WHEN  '21' THEN ' 9 pm'
            WHEN  '22' THEN '10 pm'
            WHEN  '23' THEN '11 pm'
            ELSE 'Unknown'
            END) as Code,
            count(*) as JuriCount, hour
            from (Select left(acc_time,2) as hour from ard_accidents where ${nestedWhere} AND (year >= ${startYear} and year <= ${endYear})) as foo
            group by hour order by hour) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;

    return query;
}

function getLightQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.crash_light_state';
    const juriTable = 'state_trends.crash_light_condition';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_accidents where ${nestedWhere} 
    and year >= ${startYear} and year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount, 
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (        SELECT State.type AS Code, JuriCount, StateCount AS StateCount FROM 
        (
            SELECT * FROM (SELECT (CASE 
                WHEN light_cond_code IS NULL THEN '-20'
                ELSE light_cond_code
                END), count(*) AS JuriCount 
                FROM ard_accidents
                where ${nestedWhere} AND (year >= ${startYear} and year <= ${endYear})
                GROUP BY light_cond_code ORDER BY light_cond_code) AS lightCount
            LEFT JOIN
            ${juriTable} ON light_cond_code = code ORDER BY light_cond_code
        ) AS Juri 
        RIGHT JOIN
        (
            SELECT code, type, SUM(statecount) AS StateCount FROM ${stateTable}
            WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code, type ORDER BY code
        ) AS State
        ON Juri.code = State.code
    GROUP BY State.type, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;

    return query;
}

function getSeverityQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.crash_severity_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_accidents where ${nestedWhere} 
    and year >= ${startYear} and year <= ${endYear}),

    StateTotal AS (SELECT SUM(statecount) AS StateTotal FROM ${stateTable} WHERE year >= ${startYear} AND year <= ${endYear})

    SELECT code, 
	CASE 
		WHEN juriCount > 0 THEN juriCount
		ELSE 0
	END AS juriCount,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference, JuriTotal FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
        (SELECT (CASE severity_code
            WHEN 'F' THEN 'Fatal'
            WHEN 'I' THEN 'Injury'
            ELSE 'Prop. Damage'
            END)
            as code, count(*) as JuriCount
            FROM (select * from ard_accidents WHERE ${nestedWhere} AND (year >= ${startYear} and year <= ${endYear})) as foo
            group by severity_code) AS Juri
    RIGHT JOIN
    (SELECT code, SUM(statecount) AS StateCount FROM ${stateTable}
    WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code ORDER BY code) AS State
    ON Juri.code = State.code
    GROUP BY State.code, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;

    return query;
}

// *---------------*
// Police Tables for specific jurisdiction codes
// *---------------*
function getPoliceQueries(queryArgs, getExtendedQueries) {
    const category = 'police';
    if (getExtendedQueries) {
        var queries = [
            // these hvae 3 cols: year, label, count
            {
                name: 'CRASHES BY ROAD SURFACE CONDITIONS',
                category: category + '2',
                query: getRoadCondQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES BY ROAD TYPE',
                category: category + '2',
                query: getRoadSysQuery(queryArgs.startYear, queryArgs.endYear)
            }
        ];
        return queries;
    } else {
        var queries = [
            {
                name: 'TOTAL CRASHES',
                category: category,
                query: getTotalCrashQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES ON ROADWAYS',
                category: category,
                query: getRoadwayQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES ON PRIVATE PROPERTY',
                category: category,
                query: getPrivatePropQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH SERIOUS INJURY PERSONS',
                category: category,
                query: getInjuryQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH FATALITIES',
                category: category,
                query: getFatalQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH IMPAIRED DRIVING (ALCOHOL, DRUGS, MEDICATION)',
                category: category,
                query: getImpairedQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH PASSENGER VEHICLES',
                category: category,
                query: getPassengerVehQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH COMMERCIAL VEHICLES (<=10,000 LBS, EXCLUDES BUSES)',
                category: category,
                query: getCommercialVehQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH MOTORCYCLES',
                category: category,
                query: getMotorcycleQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES INVOLVING PEDACYCLES',
                category: category,
                query: getPedcycleQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES INVOLVING MINI-BIKES OR MOPED',
                category: category,
                query: getMopedQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH SCHOOL BUSES',
                category: category,
                query: getSchoolbusQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH TRANSIT BUSES',
                category: category,
                query: getTransitBusQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH EMERGENCY VEHICLES',
                category: category,
                query: getEmercencyVehQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH SUV',
                category: category,
                query: getSuvQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES WITH UNKNOWN/OTHER OBJECTS (FIXED/NON-FIXED OBJECT, RAILCARS)',
                category: category,
                query: getObjCrashQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES INVOLVING ANIMALS',
                category: category,
                query: getAnimalQuery(queryArgs.startYear, queryArgs.endYear)
            },
            {
                name: 'CRASHES INVOLVING PEDESTRIANS',
                category: category,
                query: getPedCrashQuery(queryArgs.startYear, queryArgs.endYear)
            }
        ];
        return queries;
    }
}

function getTotalCrashQuery(startYear, endYear) {
    const query = `
    SELECT year, COUNT(*) FROM ARD_ACCIDENTS
    WHERE
    YEAR >= ${startYear} AND YEAR <= ${endYear}
    AND
    MUN_CTY_CO = '11'
    AND
    MUN_MU = '02'
    AND
    DEPT_NUM IN ('01', '1')
    AND
    DEPT_NAME LIKE 'EWING%'
    GROUP BY year ORDER BY year;    
    `;

    return query;
}

function getRoadwayQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT year, COUNT(*) FROM ARD_ACCIDENTS
        WHERE
        YEAR >= ${startYear} AND YEAR <= ${endYear}
        AND
        MUN_CTY_CO = '11'
        AND
        MUN_MU = '02'
        AND
        DEPT_NUM IN ('01', '1')
        AND
        DEPT_NAME LIKE 'EWING%'
        AND 
        ROAD_SYS_CODE <> '09'
        GROUP BY year ORDER BY year
    ) crashes
    ON years.year = crashes.year;  
    `;

    return query;
}

function getPrivatePropQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT year, COUNT(*) FROM ARD_ACCIDENTS
        WHERE
        YEAR >= ${startYear} AND YEAR <= ${endYear}
        AND
        MUN_CTY_CO = '11'
        AND
        MUN_MU = '02'
        AND
        DEPT_NUM IN ('01', '1')
        AND
        DEPT_NAME LIKE 'EWING%'
        AND 
        ROAD_SYS_CODE = '09'
        GROUP BY year ORDER BY year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getInjuryQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT year, COUNT(*) FROM ARD_ACCIDENTS
        WHERE
        YEAR >= ${startYear} AND YEAR <= ${endYear}
        AND
        MUN_CTY_CO = '11'
        AND
        MUN_MU = '02'
        AND
        DEPT_NUM IN ('01', '1')
        AND
        DEPT_NAME LIKE 'EWING%'
        AND 
        SEVERITY_CODE = 'I'
        GROUP BY year ORDER BY year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getFatalQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT year, COUNT(*) FROM ARD_ACCIDENTS
        WHERE
        YEAR >= ${startYear} AND YEAR <= ${endYear}
        AND
        MUN_CTY_CO = '11'
        AND
        MUN_MU = '02'
        AND
        DEPT_NUM IN ('01', '1')
        AND
        DEPT_NAME LIKE 'EWING%'
        AND 
        SEVERITY_CODE = 'F'
        GROUP BY year ORDER BY year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getImpairedQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (

        SELECT ard_accidents.year, COUNT(DISTINCT ard_accidents.crashid) FROM
        ard_accidents, ard_vehicles_partition
        WHERE ard_accidents.crashid = ard_vehicles_partition.crashid AND (ard_accidents.year >= ${startYear} AND ard_accidents.year <= ${endYear}) AND
        (
            ard_accidents.ALCOHOL_INVOLVED = 'Y'
            OR
            ard_vehicles_partition.driver_phys_stat_code1 in ('02','03', '04' ,'05') -- Alcohol, Illicit drug use, Medication, alcohol/drug use
            OR
            ard_vehicles_partition.driver_phys_stat_code2 in ('02','03', '04', '05') -- Alcohol, Illicit drug use, Medication, alcohol/drug use
        )
        AND
        MUN_CTY_CO = '11' 
        AND
        MUN_MU = '02'
        AND
        DEPT_NUM IN ('01', '1')
        AND
        DEPT_NAME LIKE 'EWING%'
        GROUP BY ard_accidents.year ORDER BY ard_accidents.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getPassengerVehQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_vehicles_partition v
        WHERE 
        v.ACC_MUN_CTY_CO = '11' 
        AND v.ACC_MUN_MU = '02'
        AND v.TYPE_CODE BETWEEN '01' AND '19'
        AND (v.acc_year >= ${startYear} AND v.acc_year <= ${endYear})
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = v.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getCommercialVehQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_vehicles_partition v
        WHERE 
        v.ACC_MUN_CTY_CO = '11' 
        AND v.ACC_MUN_MU = '02'
        AND (v.TYPE_CODE BETWEEN '20' AND '29' OR ((v.VEH_WEIGHT_RATING = '2' OR v.VEH_WEIGHT_RATING = '3') AND v.TYPE_CODE <> '30' AND v.TYPE_CODE <> '31'))
        AND v.VEH_USE_CODE = '02'
        AND (v.acc_year >= ${startYear} AND v.acc_year <= ${endYear})
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = v.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getMotorcycleQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_vehicles_partition v
        WHERE 
        v.ACC_MUN_CTY_CO = '11' 
        AND v.ACC_MUN_MU = '02'
        AND v.TYPE_CODE = '08'
        AND (v.acc_year >= ${startYear} AND v.acc_year <= ${endYear})
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = v.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getPedcycleQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_pedestrians_partition p
        WHERE 
        p.ACC_MUN_CTY_CO = '11' 
        AND p.ACC_MUN_MU = '02'
        AND (p.IS_BICYCLIST IS NOT NULL OR a.crash_type = '14')
        AND (p.acc_year >= ${startYear} AND p.acc_year <= ${endYear})
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = p.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getMopedQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_vehicles_partition v
        WHERE 
        v.ACC_MUN_CTY_CO = '11' 
        AND v.ACC_MUN_MU = '02'
        AND v.TYPE_CODE = '11'
        AND (v.acc_year >= 2018 AND v.acc_year <= 2019)
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = v.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getSchoolbusQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_vehicles_partition v
        WHERE 
        v.ACC_MUN_CTY_CO = '11' 
        AND v.ACC_MUN_MU = '02'
        AND (v.SPECIAL_VEH_CODE  = '07' OR v.SPECIAL_VEH_CODE = '09')
        AND (v.acc_year >= ${startYear} AND v.acc_year <= ${endYear})
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = v.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getTransitBusQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_vehicles_partition v
        WHERE 
        v.ACC_MUN_CTY_CO = '11' 
        AND v.ACC_MUN_MU = '02'
        AND (v.TYPE_CODE = '30' OR v.TYPE_CODE = '31')
        AND (v.SPECIAL_VEH_CODE  <> '07' AND v.SPECIAL_VEH_CODE <> '09')
        AND (v.acc_year >= ${startYear} AND v.acc_year <= ${endYear})
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = v.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getEmercencyVehQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_vehicles_partition v
        WHERE 
        v.ACC_MUN_CTY_CO = '11' 
        AND v.ACC_MUN_MU = '02'
        AND (v.SPECIAL_VEH_CODE = '02' OR v.SPECIAL_VEH_CODE = '04' OR v.SPECIAL_VEH_CODE = '05')
        AND (v.acc_year >= ${startYear} AND v.acc_year <= ${endYear})
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = v.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getSuvQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT a.year, COUNT(DISTINCT a.crashid) FROM ard_accidents a, ard_vehicles_partition v
        WHERE 
        v.ACC_MUN_CTY_CO = '11' 
        AND v.ACC_MUN_MU = '02'
        AND v.TYPE_CODE = '04'
        AND (v.acc_year >= ${startYear} AND v.acc_year <= ${endYear})
        AND a.DEPT_NUM IN ('01', '1')
        AND a.DEPT_NAME LIKE 'EWING%'
        AND a.crashid = v.crashid
        GROUP BY a.year ORDER BY a.year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getObjCrashQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT year, COUNT(*) FROM ARD_ACCIDENTS
        WHERE
        YEAR >= ${startYear} AND YEAR <= ${endYear}
        AND
        MUN_CTY_CO = '11'
        AND
        MUN_MU = '02'
        AND
        DEPT_NUM IN ('01', '1')
        AND
        DEPT_NAME LIKE 'EWING%'
        AND 
        (CRASH_TYPE = '11' OR CRASH_TYPE = '15' OR CRASH_TYPE = '16' OR CRASH_TYPE = '99')                
        GROUP BY year ORDER BY year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getAnimalQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT year, COUNT(*) FROM ARD_ACCIDENTS
        WHERE
        YEAR >= ${startYear} AND YEAR <= ${endYear}
        AND
        MUN_CTY_CO = '11'
        AND
        MUN_MU = '02'
        AND
        DEPT_NUM IN ('01', '1')
        AND
        DEPT_NAME LIKE 'EWING%'
        AND 
        CRASH_TYPE = '12'     -- animal crash type
        GROUP BY year ORDER BY year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getPedCrashQuery(startYear, endYear) {
    const query = `
    SELECT years.year, 
    CASE WHEN crashes.count IS NULL THEN 0
    ELSE crashes.count 
    END

    FROM

    (SELECT DISTINCT year FROM ard_accidents WHERE (YEAR >= ${startYear} AND YEAR <= ${endYear})) AS years

    LEFT JOIN

    (
        SELECT year, COUNT(*) FROM ARD_ACCIDENTS
        WHERE
        YEAR >= ${startYear} AND YEAR <= ${endYear}
        AND
        MUN_CTY_CO = '11'
        AND
        MUN_MU = '02'
        AND
        DEPT_NUM IN ('01', '1')
        AND
        DEPT_NAME LIKE 'EWING%'
        AND 
        CRASH_TYPE = '13'     -- pedestrian crash type     
        GROUP BY year ORDER BY year
    ) crashes 
    ON years.year = crashes.year;
    `;

    return query;
}

function getRoadCondQuery(startYear, endYear) {
    const query = `
    SELECT a.year,
    CASE
        WHEN a.SURF_COND_CODE = '01' THEN 'DRY'
        WHEN a.SURF_COND_CODE = '02' THEN 'WET'
        WHEN a.SURF_COND_CODE = '03' THEN 'SNOWY'
        WHEN a.SURF_COND_CODE = '04' THEN 'ICY'
        WHEN a.SURF_COND_CODE = '05' THEN 'SLUSH'
        WHEN a.SURF_COND_CODE = '06' THEN 'WATER (STANDING/MOVING)'
        WHEN a.SURF_COND_CODE = '07' THEN 'SAND/MUD/DIRT'
        WHEN a.SURF_COND_CODE = '08' THEN 'OIL'
        ELSE 'OTHER/UNKNOWN'
    END AS code,
    COUNT(*) FROM ard_accidents a
    WHERE
    a.MUN_CTY_CO = '11'
    AND a.MUN_MU = '02'
    AND (a.year >= ${startYear} AND a.year <= ${endYear})
    AND a.DEPT_NUM IN ('01', '1')
    AND a.DEPT_NAME LIKE 'EWING%'
    GROUP BY a.year, code
    ORDER BY a.year, code
    `;

    return query;
}

function getRoadSysQuery(startYear, endYear) {
    const query = `
    SELECT a.year,
    CASE
        WHEN a.ROAD_SYS_CODE = '00' THEN 'OTHER/UNKNOWN'
        WHEN a.ROAD_SYS_CODE = '01' THEN 'INTERSTATE'
        WHEN a.ROAD_SYS_CODE = '02' THEN 'STATE HIGHWAY'
        WHEN a.ROAD_SYS_CODE = '03' THEN 'STATE/INTERSTATE HIGHWAY'
        WHEN a.ROAD_SYS_CODE = '04' THEN 'STATE PARK OR INSTITUTION'
        WHEN a.ROAD_SYS_CODE = '05' THEN 'COUNTY'
        WHEN a.ROAD_SYS_CODE = '06' THEN 'COUNTY AUTHORITY PARK OR INSTITUTION'
        WHEN a.ROAD_SYS_CODE = '07' THEN 'MUNICIPAL'
        WHEN a.ROAD_SYS_CODE = '08' THEN 'MUNICIPAL AUTHORITY PARK OR INSTITUTION'
        WHEN a.ROAD_SYS_CODE = '09' THEN 'PRIVATE PROPERTY'
        WHEN a.ROAD_SYS_CODE = '10' THEN 'U.S. GOVERNMENT PROPERTY'
        ELSE 'OTHER/UNKNOWN'
    END AS code,
    COUNT(*) FROM ard_accidents a
    WHERE
    a.MUN_CTY_CO = '11'
    AND a.MUN_MU = '02'
    AND (a.year >= ${startYear} AND a.year <= ${endYear})
    AND a.DEPT_NUM IN ('01', '1')
    AND a.DEPT_NAME LIKE 'EWING%'
    GROUP BY a.year, code
    ORDER BY a.year, code
    `;

    return query;
}

// *---------------*
// Module Exports
// *---------------*
module.exports = {
    makeJurisdictionReport: makeJurisdictionReport,
    getReportQueries: getReportQueries
};
