// *---------------*
// SQL formatters
// *---------------*

// returns an array of category strings to query for
function getQueryCategories(juriLevel) {
    const queryCategories = ['state', 'mpo', 'county', 'municipality'];
    const idx = queryCategories.indexOf(juriLevel.toLowerCase());
    return queryCategories.slice(0, idx + 1);
}

// returns a list of county codes for an MPO based on the jurisdiction value
function getMpoCounties(juriValue) {
    if (juriValue.toLowerCase() === 'njtpa') return '02,07,09,10,12,13,14,15,16,18,19,20,21';
    else if (juriValue.toLowerCase() === 'sjtpo') return '01,05,06,17';
    else if (juriValue.toLowerCase() === 'dvrpc') return '03,04,08,11';
}

// gets the MPO category based on the county code
function getMpoByCounty(countyCode) {
    const njtpa = '02,07,09,10,12,13,14,15,16,18,19,20,21';
    const sjtpo = '01,05,06,17';
    const dvrpc = '03,04,08,11';
    if (njtpa.indexOf(countyCode) >= 0) return njtpa;
    else if (sjtpo.indexOf(countyCode) >= 0) return sjtpo;
    else if (dvrpc.indexOf(countyCode) >= 0) return dvrpc;
}

function getTableNameByAttribute(attribute) {
    if (attribute === 'intersections') return 'trends.crash_accident_crs_strt_intrsctn_code_y';
    else if (attribute === 'cellphones') return 'trends.crash_accident_cell_phone_code_y';
}

// Splits a code string by "," to return an array of codes
// INPUT: "07,08,15,16,18"
// OUTPUT: [07, 08, ...]
function splitCodes(codeString) {
    var splitCodes = [];
    if (codeString !== undefined && codeString !== null) {
        splitCodes = codeString.split(',');
    }
    return splitCodes;
}

// This formats the codes for the IN statement by adding single quotes and commas to each code from the request parameters.
// EXAMPLE: enviornmentCode = "01,02,03"
// RETURNS: "'01','02','03'"
function formatCodes(codeString) {
    var returnCodes = '';
    var codes = splitCodes(codeString);
    if (codes.length > 0) {
        var formattedCodes = [];
        codes.forEach((splitCode) => {
            formattedCodes.push("'" + splitCode + "'");
        });
        returnCodes = formattedCodes.join(', ');
    }
    return returnCodes;
}

function createWhereClause(queryCategory, queryArgs) {
    var whereClauses = [];
    if (queryArgs.startYear && queryArgs.endYear)
        whereClauses.push(`yr_num BETWEEN ${queryArgs.startYear} AND ${queryArgs.endYear}`);
    if (queryArgs.startTime) whereClauses.push(`(hour >= '${queryArgs.startTime.substring(0, 2)}')`);
    if (queryArgs.endTime) whereClauses.push(`(hour <= '${queryArgs.endTime.substring(0, 2)}')`);
    if (queryArgs.crashType !== '00') whereClauses.push(`crash_type = '${queryArgs.crashType}'`);

    if (queryCategory === 'mpo') {
        if (
            queryArgs.jurisdictionLevel.toLowerCase() === 'county' ||
            queryArgs.jurisdictionLevel.toLowerCase() === 'municipality'
        ) {
            const codeList = getMpoByCounty(queryArgs.jurisdictionValue.substring(0, 2));
            whereClauses.push(`cnty_code IN (${formatCodes(codeList)})`);
        } else {
            var countyCode = getMpoCounties(queryArgs.jurisdictionValue);
            whereClauses.push(`cnty_code IN (${formatCodes(countyCode)})`);
        }
    } else if (queryCategory === 'county') {
        whereClauses.push(`cnty_code = '${queryArgs.jurisdictionValue.substring(0, 2)}'`);
    } else if (queryCategory === 'municipality') {
        whereClauses.push(`cnty_code = '${queryArgs.jurisdictionValue.substring(0, 2)}'`);
        whereClauses.push(`mncplty_code = '${queryArgs.jurisdictionValue.substring(2, 4)}'`);
    }
    return whereClauses.join(' AND ');
}

function createGroupByClause(queryCategory) {
    if (queryCategory === 'county') {
        return 'yr_num, cnty_code';
    } else if (queryCategory === 'municipality') {
        return 'yr_num, cnty_code, mncplty_code';
    } else return 'yr_num';
}

// *---------------*
// SQL query makers
// *---------------*

function createQuery(queryCategory, queryArgs, tableName) {
    const whereClause = createWhereClause(queryCategory, queryArgs);
    const groupClause = createGroupByClause(queryCategory);

    var sql = `
        SELECT t1.yr_num, 
        CASE 
            WHEN t2.total > 0 THEN t2.total
            ELSE 0
        END AS total
        FROM 
        (select yr_num from trends.crash_occupant_physcl_cndtn_code_02 group by yr_num having(yr_num >= ${queryArgs.startYear} and yr_num <= ${queryArgs.endYear} )) AS t1 -- used to get all year values, doesnt do anything for the data
        FULL OUTER JOIN 
        (SELECT yr_num, sum(total) as total
        FROM ${tableName}
        where ${whereClause}
        group by ${groupClause}
        order by yr_num) t2
        ON t2.yr_num = t1.yr_num ORDER BY yr_num;
        `;
    return sql;
}

// returns object with the format: {State: {query: "...""}, MPO: {query: "..."}, ...}
function getTrendsQueryObject(queryArgs, tableName) {
    const categories = getQueryCategories(queryArgs.jurisdictionLevel);
    // console.log(categories)
    var returnObj = {};
    categories.forEach((category) => {
        const sql = createQuery(category, queryArgs, tableName);
        returnObj[category] = { query: sql };
    });
    return returnObj;
}

// *---------------*
// Module Exports
// *---------------*

module.exports = {
    getTrendsQueryObject: getTrendsQueryObject,
    getTableNameByAttribute: getTableNameByAttribute,
    getMpoCounties: getMpoCounties,
    formatCodes: formatCodes
};
