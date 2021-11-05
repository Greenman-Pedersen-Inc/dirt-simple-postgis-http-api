const { jsPDF } = require("jspdf"); // will automatically load the node version
const { autoTable } = require("jspdf-autotable"); // will automatically load the node version
const reportHelper = require('./report_maker/report_layout');
const codeTranslator = require('./code_translator');


// *---------------*
//  Jurisdiction Report Helper Functions
// *---------------*
function makeJurisdictionReport(queryArgs, reportData) {
    const juriName = getJurisdictionName(queryArgs.jurisdictionCode);
    const filterObject = getFilterObject(queryArgs);
    console.log(filterObject);
    const doc = reportHelper.generateReportPdf("letter-portrait", filterObject, juriName + " - Comparision Summary"); 
    getPedestrianReportTable(doc, reportData);
    return reportHelper.saveReportPdf(doc, "jurisdictionReport");
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

function getNestedWhere(jurisdictionCode) {
    if (jurisdictionCode.length === 4) {
        const countyCode = jurisdictionCode.slice(0, 2);
        const muniCode = jurisdictionCode.slice(-2);
        return `acc_mun_cty_co = '${countyCode}' AND acc_mun_mu = '${muniCode}'`;
    }
    else {
        return `acc_mun_cty_co = '${jurisdictionCode}'`;
    }
}

function getTableHeader(doc, yPos) {
    doc.autoTable({
        startY: yPos,
        head: [['CRASH CHARACTERISTIC', 'MUNICIPALITY #', 'MUNICIPALITY %', 'STATE %']],
    });
    return doc;
}

// *---------------*
//  PEDESTRIAN TABLES
// *---------------*
function getPedestrianQueries(nestedWhere, startYear, endYear) {
    var queries = [
        {name: "GENDER", query: getPedestrianGenderQuery(nestedWhere, startYear, endYear)},
        {name: "AGE", query: getPedestrianAgeQuery(nestedWhere, startYear, endYear)},
        {name: "PRE-CRASH ACTION", query: getPedestrianPreCrashQuery(nestedWhere, startYear, endYear)}
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
	END AS juriCount, JuriTotal,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
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
	END AS juriCount, JuriTotal,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference FROM (    SELECT State.code, JuriCount, StateCount AS StateCount FROM
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
	END AS juriCount, JuriTotal,
	ROUND(JuriCount * 100.0 / JuriTotal, 2) AS JuriPercent, ROUND(StateCount * 100.0 / StateTotal, 2) AS StatePercent, ROUND(JuriCount * 100.0 / JuriTotal, 2) - ROUND(StateCount * 100.0 / StateTotal, 2) AS difference FROM (        SELECT State.type AS Code, JuriCount, StateCount AS StateCount FROM 
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
            SELECT code, type, SUM(statecount) AS StateCount FROM state_trends.ped_precrash_state
            WHERE year >= ${startYear} AND year <= ${endYear} GROUP BY code, type ORDER BY code
        ) AS State
        ON Juri.code = State.code
    GROUP BY State.type, JuriCount, StateCount
    ) AS data, JuriTotal, StateTotal;
    `;
    return query;
}

function getPedestrianReportTable(doc, reportData) {
    getTableHeader(doc, 25);
    for (var tableType in reportData){
        if (reportData.hasOwnProperty(tableType)) {
            const fields = Object.keys(reportData[tableType][0]);
            var columnArray = [];
            //for each Fieldname in fields:
            for (let i = 0; i < fields.length; i++) {
                var fieldName = fields[i];
                columnArray.push(
                    { 
                        dataKey: fieldName,
                        header: fieldName
                    }
                );
            }

            doc.autoTable({
                startY: doc.lastAutoTable.finalY,
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
                columns: columnArray,
                body: reportData[tableType]
            });
        }
    }
}

// *---------------*
// Module Exports
// *---------------*
module.exports = {
    getNestedWhere: getNestedWhere,
    getPedestrianQueries: getPedestrianQueries,
    makeJurisdictionReport: makeJurisdictionReport
};
