
const trendsHelper = require('./trends_helper');   // re-use some functions in here

// returns all EA tables to query from the postgres DB 
function getQueryTables() {
    return [
        "emphasisareas.dw_aggressivedriving",
        "emphasisareas.dw_drowsydistracted",
        "emphasisareas.dw_heavyvehicle",
        "emphasisareas.dw_impaireddriving",
        "emphasisareas.dw_intersections",
        "emphasisareas.dw_lanedepart",
        "emphasisareas.dw_motorcycle",
        "emphasisareas.dw_olderdrivers",
        "emphasisareas.dw_pedbike",
        "emphasisareas.dw_trainvehicle",
        "emphasisareas.dw_unbelted",
        "emphasisareas.dw_unlicensed",
        "emphasisareas.dw_workzone",
        "emphasisareas.dw_youngdrivers"
    ];
}

function createWhereClause(queryArgs) {
    const queryCategory = queryArgs.jurisdictionLevel.toLowerCase();
    var whereClauses = [];
    if (queryArgs.startYear && queryArgs.endYear) whereClauses.push(`year BETWEEN ${parseInt(queryArgs.startYear) - 4} AND ${queryArgs.endYear}`);

    if (queryCategory === 'mpo') {
        var countyCode = trendsHelper.getMpoCounties(queryArgs.jurisdictionValue);
        whereClauses.push(`mun_cty_co IN (${trendsHelper.formatCodes(countyCode)})`);  
    }
    else if (queryCategory === 'county') {
        whereClauses.push(`mun_cty_co = '${queryArgs.jurisdictionValue.substring(0,2)}'`);
    }
    else if (queryCategory === 'municipality') {
        whereClauses.push(`mun_cty_co = '${queryArgs.jurisdictionValue.substring(0,2)}'`);
        whereClauses.push(`mun_mu = '${queryArgs.jurisdictionValue.substring(2,4)}'`);
    }
    return whereClauses.join(' AND ');
}

function createGroupByClause(queryArgs) {
    const queryCategory = queryArgs.jurisdictionLevel.toLowerCase();
    if (queryCategory === 'county') {
        return 'year, mun_cty_co';
    }
    else if (queryCategory === 'municipality') {
        return 'year, mun_cty_co, mun_mu';
    }
    else return 'year';
}

function createQuery(queryArgs, tableName) {
    const whereClause = createWhereClause(queryArgs);
    const groupClause = createGroupByClause(queryArgs);

    var sql = `
    SELECT CAST(t2.year AS INTEGER), 
    CASE WHEN t1.total_incapacitated > 0 THEN CAST(t1.total_incapacitated AS INTEGER) ELSE 0 END AS total_incapacitated, 
    CASE WHEN t1.total_killed > 0 THEN CAST(t1.total_killed AS INTEGER) ELSE 0 END AS total_killed
    FROM 
	    (select year from ${tableName} group by year having (year BETWEEN ${parseInt(queryArgs.startYear) - 4} AND ${queryArgs.endYear})) AS t2 
    FULL OUTER JOIN 
        (SELECT year, sum(incapacitated) as total_incapacitated , sum(killed) as total_killed FROM ${tableName} 
        WHERE ${whereClause}
        GROUP BY ${groupClause} ORDER BY year) t1 
    ON t1.year = t2.year ORDER BY year;
    `;
    return sql;
}

// returns object with the format: {dw_drowsydistracted: {query: "...""}, dw_heavyvehicle: {query: "..."}, ...}
function getQueryObject(queryArgs) {
    const tables = getQueryTables();
    var returnObj = {};
    tables.forEach(table => {
        var sql = createQuery(queryArgs, table)
        var tableKey = table.substring(table.indexOf(".") + 1);
        returnObj[tableKey] = {query: sql};
    });
    return returnObj;
}

function getHmvmtsQuery() {
    return `SELECT year, hmvmts FROM emphasisareas.hmvmts_rolling_avg`;
}

// ensures that there are data rows between the start and end years
function cleanData(dataArray, startYear, endYear) {
    var returnData = [];
    var rollingYearStart = startYear - 4;

    for (let index = 0; index < dataArray.length; index++) {
        if (dataArray[index]['year'] !== rollingYearStart) {
            returnData.push({
                year: rollingYearStart, 
                total_incapacitated: 0, 
                total_killed: 0 
            });
            returnData.push(dataArray[index]);
        }
        else {
            returnData.push(dataArray[index]);
        }
        rollingYearStart = dataArray[index]['year']+1;
    }
    return returnData;
}

function calculateAverageData(dataArray, rowIndex) {
    var incapSum = 0
    var killedSum = 0;
    var calcDataArray = dataArray.slice(rowIndex - 4, rowIndex + 1);
    calcDataArray.forEach(data => {
        incapSum = incapSum + data["total_incapacitated"];
        killedSum = killedSum + data["total_killed"];
    });
    return {
        "Incapacitated": (incapSum * 1.0) / 5,
        "Killed": (killedSum * 1.0) / 5
    };
}

function calculateHmvmtData(averageData, hmvmtValue) {
    return {
        "Incapacitated": (averageData["Incapacitated"] * 1.0) / hmvmtValue,
        "Killed": (averageData["Killed"] * 1.0) / hmvmtValue
    };
}

// *---------------*
// Module Exports
// *---------------*

module.exports = {
    getQueryObject: getQueryObject,
    getQueryTables: getQueryTables,
    getHmvmtsQuery: getHmvmtsQuery,
    calculateAverageData: calculateAverageData,
    calculateHmvmtData: calculateHmvmtData,
    cleanData: cleanData
};
