const { jsPDF } = require("jspdf"); // will automatically load the node version
const { autoTable } = require("jspdf-autotable"); // will automatically load the node version
const reportHelper = require('./report_maker/report_layout');
const codeTranslator = require('./code_translator');
require('./report_maker/fonts/SegoeUI/segoeui-normal');     // SegoiUI normal
require('./report_maker/fonts/SegoeUI/seguisb-normal');     // SegoiUI semi bold
// *---------------*
//  Jurisdiction Report Helper Functions
// *---------------*
function makeJurisdictionReport(queryArgs, reportData) {
    const juriName = getJurisdictionName(queryArgs.jurisdictionCode);
    const filterObject = getFilterObject(queryArgs);
    const doc = reportHelper.generateReportPdf("letter-portrait", filterObject, juriName + " - Comparision Summary"); 
    getLegend(doc, juriName, 35);
    getReportTable(doc, reportData["pedestrians"], "PEDESTRIAN & PEDACYCLIST TABLES", 60);
    getReportTable(doc, reportData["drivers"], "DRIVER TABLES", doc.lastAutoTable.finalY + 10);
    getReportTable(doc, reportData["vehicles"], "VEHICLE TABLES", doc.lastAutoTable.finalY + 10);
    getReportTable(doc, reportData["crashes"], "CRASH TABLES", doc.lastAutoTable.finalY + 10);
    return reportHelper.saveReportPdf(doc, "jurisdictionReport");
}

function getReportQueries(queryArgs) {
    var pedQueries = getPedestrianQueries(queryArgs);
    var driverQueries = getDriverQueries(queryArgs);
    var vehiclesQueries = getVehicleQueries(queryArgs);
    var crashesQueries = getCrashQueries(queryArgs);
    var reportQueries = {
        "pedestrians": pedQueries,
        "drivers": driverQueries,
        "vehicles": vehiclesQueries,
        "crashes": crashesQueries
    };
    return reportQueries;
}

// translates the input filters for the report
function getFilterObject(queryArgs){
    return {"Year Range": queryArgs.startYear + " - " + queryArgs.endYear};
}

function getJurisdictionName(jurisdictionCode) {
    if (jurisdictionCode.length === 4) {
        return(codeTranslator.convertCodeDescription("mun_mu", jurisdictionCode));
    }
    else {
        return(codeTranslator.convertCodeDescription("mun_cty_co", jurisdictionCode));
    }
}

function getNestedWhere(jurisdictionCode, category) {
    var cty = "acc_mun_cty_co";
    var muni = "acc_mun_mu";

    if (category === "drivers") {
        cty = "veh_acc_mun_cty_co";
        muni = "veh_acc_mun_mu";
    }
    else if (category === "crashes") {
        cty = "mun_cty_co";
        muni = "mun_mu";
    }

    if (jurisdictionCode.length === 4) {
        const countyCode = jurisdictionCode.slice(0, 2);
        const muniCode = jurisdictionCode.slice(-2);
        return `${cty} = '${countyCode}' AND ${muni} = '${muniCode}'`;
    }
    else {
        return `${cty} = '${jurisdictionCode}'`;
    }
}

function getTableHeader(doc, tableTitle, yPos) {
    const leftMargin = reportHelper.pageMarginSides;
    const pageSize = doc.internal.pageSize
    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
    var currYPos = yPos;

    doc
    .setFont("seguisb", "normal")
    .setFontSize(12)
    .text(tableTitle, leftMargin, yPos);
    currYPos += 1;
    doc
    .setDrawColor(0)
    .setLineWidth(0.5)
    .line(leftMargin, currYPos, pageWidth - leftMargin, currYPos);
    currYPos += 3;

    doc.autoTable({
        startY: currYPos,
        margin: {right: reportHelper.pageMarginSides, left: reportHelper.pageMarginSides},
        styles: { 
            lineColor: [84, 84, 84],
            lineWidth: 0.1,
            fontStyle: 'bold',
            fillColor: [40,127,186],
            textColor: 255
        },
        body: [['CRASH CHARACTERISTIC', 'MUNICIPALITY COUNT', 'MUNICIPALITY %', 'STATE %']],
        columnStyles: {
            0: { cellWidth: 64, halign: 'center', fillColor: [40,127,186] },
            1: { cellWidth: 45, halign: 'center', fillColor: [40,127,186] },
            2: { cellWidth: 37, halign: 'center', fillColor: [40,127,186] },
            3: { cellWidth: 31.9, halign: 'center', fillColor: [40,127,186] }        
        }
    });
    return doc;
}

function getLegend(doc, juriName, yPos) {
    const leftMargin = reportHelper.pageMarginSides;
    const pageSize = doc.internal.pageSize
    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
    var currYPos = yPos;

    doc
    .setFont("seguisb", "normal")
    .setFontSize(12)
    .text("LEGEND", leftMargin, yPos);
    currYPos += 1;
    doc
    .setDrawColor(0) // draw black lines
    .setLineWidth(0.5)
    .line(leftMargin, currYPos, pageWidth - leftMargin, currYPos);
    currYPos += 5;
    doc
    .setFont("segoeui", "normal")
    .setFontSize(12)
    .text(`Difference between ${juriName} % and State %`, leftMargin, currYPos);
    currYPos += 3;
    doc
    .setDrawColor(0)
    .setFillColor(255,255,128)
    .rect(reportHelper.pageMarginSides, currYPos, 5, 5, "FD")
    .text("2% - 5%", leftMargin + 5 + 3, currYPos+4)
    .setFillColor(239,93,87)
    .rect(leftMargin + 5 + 3 + 20, currYPos, 5, 5, "FD")
    .text("> 5%", leftMargin + 5 + 3 + 20 + 8, currYPos+4)
    return doc;
}

function getReportTable(doc, reportData, headerTitle, yPos) {
    var totalPagesExp = '{total_pages_count_string}';
    var pageNumbers = [];
    getTableHeader(doc, headerTitle, yPos);
    reportData.forEach(dataTable => {
        var tableType = Object.keys(dataTable)[0];
        var tableData = dataTable[Object.keys(dataTable)[0]];

        tableData.push({
            code: 'Total',
            juricount: tableData[0].juritotal,
            juripercent: 100.00,
            statepercent: ''
        });
        doc.autoTable({
            startY: doc.lastAutoTable.finalY,
            margin: {right: reportHelper.pageMarginSides, left: reportHelper.pageMarginSides},
            styles: { 
                lineColor: [84, 84, 84],
                lineWidth: 0.1,
                textColor: [0, 0, 0],
                rowPageBreak: 'avoid'
            },
            head: [
                [
                    {
                        content: tableType,
                        colSpan: 4,
                        styles: { 
                            halign: 'center', 
                            fillColor: [32, 178, 170],
                            textColor: 255
                        },
                    },
                ],
            ],
            columns: [
                { dataKey: 'code', header: 'code' },
                { dataKey: 'juricount', header: 'juricount'},
                { dataKey: 'juripercent', header: 'juripercent'},
                { dataKey: 'statepercent', header: 'statepercent' },
            ],
            body: tableData,
            columnStyles: {
                0: { cellWidth: 64 },
                1: { cellWidth: 45, halign: 'center' },
                2: { cellWidth: 37, halign: 'center' },
                3: { cellWidth: 31.9, halign: 'center' },
            },
            allSectionHooks: true,
            didParseCell: function(data) {
                if (data.column.dataKey === 'juripercent' || data.column.dataKey === 'statepercent') {
                    if (data.cell.raw === null || data.cell.raw === 'null') {data.cell.text = "0.00%"} 
                    else if (data.cell.raw !== '') {
                        data.cell.text = data.cell.raw + '%';   // add % signs to the percent cols
                    }
                }
                if (data.row.section === 'body') {
                    if (parseFloat(data.row.raw['difference']) > 5.00) {
                        data.cell.styles.fillColor = [239, 93, 87]; // Red
                    }
                    else if (parseFloat(data.row.raw['difference']) <= 5.00 && parseFloat(data.row.raw['difference']) >= 2.00) {
                        data.cell.styles.fillColor = [255,255,128]; // Yellow
                    }
                }
                if (data.row.index === tableData.length - 1) {
                    data.cell.styles.fontStyle = 'bold'; // bold the TOTAL row
                    // if (data.cell.index === 3) data.cell.styles.fillColor = [210,210,210]; // Yellow
                }
            },
            didDrawPage: function(data) {
            //     // Footer
            //     var str = 'Page ' + doc.internal.getNumberOfPages();

            //     // check if the page number footer has already been added.
            //     if (pageNumbers.indexOf(str) === -1) {
            //         pageNumbers.push(str);
            //         // Total page number plugin only available in jspdf v1.0+
            //         if (typeof doc.putTotalPages === 'function') {
            //             str = str + ' of ' + totalPagesExp
            //         }
            //         doc.setFontSize(6);

            //         // jsPDF 1.4+ uses getWidth, <1.4 uses .width
            //         var pageSize = doc.internal.pageSize
            //         var pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
            //         var pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth()
            //         doc.text("Jurisdiction Report | " + str, pageWidth, pageHeight - reportHelper.pageMarginEnds, null, null, "right");

            //         const date = new Date();
            //         doc.text(`Report Created: ${date.toLocaleString()}`, reportHelper.pageMarginSides, pageHeight - reportHelper.pageMarginEnds);
            //     }
            }
        });

        // Total page number plugin only available in jspdf v1.0+
        if (typeof doc.putTotalPages === 'function') {
            doc.putTotalPages(totalPagesExp)
        }
    });
}

// *---------------*
//  PEDESTRIAN TABLES
// *---------------*
function getPedestrianQueries(queryArgs) {
    const category = "pedestrians";
    const nestedWhere = getNestedWhere(queryArgs.jurisdictionCode, category);
    var queries = [
        {name: "GENDER", category: category, query: getPedestrianGenderQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "AGE", category: category, query: getPedestrianAgeQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "PRE-CRASH ACTION", category: category, query: getPedestrianPreCrashQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)}
    ];
    return queries;
}

function getPedestrianGenderQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.ped_gender_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians where ${nestedWhere} 
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
                FROM ard_pedestrians where ${nestedWhere} and acc_year >= ${startYear} and acc_year <= ${endYear}
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
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians where ${nestedWhere} 
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
            FROM ard_pedestrians where ${nestedWhere} and acc_year >= ${startYear} and acc_year <= ${endYear}
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
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_pedestrians where ${nestedWhere} 
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
                FROM ard_pedestrians
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
    const category = "drivers";
    const nestedWhere = getNestedWhere(queryArgs.jurisdictionCode, category);
    var queries = [
        {name: "GENDER", category: category,  query: getDriverGenderQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "AGE", category: category,  query: getDriverAgeQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
    ];
    return queries;
}

function getDriverGenderQuery(nestedWhere, startYear, endYear) {
    console.log(nestedWhere);
    const stateTable = 'state_trends.driver_gender_state';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_occupants where ${nestedWhere} and position_in_code = '01'
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
                FROM ard_occupants where ${nestedWhere} and position_in_code = '01' and veh_acc_year >= ${startYear} and veh_acc_year <= ${endYear}
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
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_occupants where ${nestedWhere} and position_in_code = '01'
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
            FROM ard_occupants where ${nestedWhere} and position_in_code = '01' and veh_acc_year >= ${startYear} and veh_acc_year <= ${endYear}
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
    const category = "vehicles";
    const nestedWhere = getNestedWhere(queryArgs.jurisdictionCode, category);
    var queries = [
        {name: "CONTRIBUTING CIRCUMSTANCES", category: category,  query: getContrQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "HIT & RUN", category: category,  query: getHitRunQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)}
    ];
    return queries;
}

function getContrQuery(nestedWhere, startYear, endYear) {
    const stateTable = 'state_trends.veh_contr_state';
    const juriTable = 'state_trends.veh_contr_code';
    const query = `
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_vehicles where ${nestedWhere} 
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
                FROM ard_vehicles
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
    WITH JuriTotal AS (SELECT COUNT(*) AS JuriTotal from ard_vehicles where ${nestedWhere} 
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
            FROM (select * from public.ard_vehicles where ${nestedWhere} AND (acc_year >= ${startYear} and acc_year <= ${endYear})) as foo
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
    const category = "crashes";
    const nestedWhere = getNestedWhere(queryArgs.jurisdictionCode, category);
    var queries = [
        {name: "ALCOHOL INVOLVED", category: category,  query: getAlcoholQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "AT INTERSECTION", category: category,  query: getIntersectionQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "CRASH YEAR", category: category,  query: getYearQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "CRASH MONTH", category: category,  query: getMonthQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "CRASH DAY", category: category,  query: getDayQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "TIME OF DAY", category: category,  query: getTimeQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "LIGHT CONDITION", category: category,  query: getLightQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)},
        {name: "SEVERITY", category: category,  query: getSeverityQuery(nestedWhere, queryArgs.startYear, queryArgs.endYear)}
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
    console.log(query);
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
    console.log(query);

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
    console.log(query);

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
    console.log(query);

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
    console.log(query);

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
    console.log(query);

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
    console.log(query);

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
    console.log(query);
    return query;
}
// *---------------*
// Module Exports
// *---------------*
module.exports = {
    getNestedWhere: getNestedWhere,
    getPedestrianQueries: getPedestrianQueries,
    getDriverQueries: getDriverQueries,
    makeJurisdictionReport: makeJurisdictionReport,
    getReportQueries: getReportQueries
};
