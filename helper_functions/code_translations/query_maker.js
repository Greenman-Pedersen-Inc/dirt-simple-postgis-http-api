// *---------------*
// SQL QUERY CLAUSE MAKERS
// *---------------*

// returns SQL formatted WHERE clause for the table attribute with the format: tableAttribute = 'aValue'.
// The input value is a singleton string, for example: 04
function createQueryClauseSingleton(codeObject, tableName, input, qualifier = '=') {
    // assumes value is a number
    if (qualifier.includes('>') || qualifier.includes('<')) {
        return `${tableName}.${codeObject.fieldName} ${qualifier} ${input}`;
    } else return `${tableName}.${codeObject.fieldName} = '${input}'`; // The input value is converted as an SQL string.
}

// returns SQL formatted WHERE clause for the table attribute with the format: tableAttribute IN ('value1', 'value2', ...).
// The input format will be parsed based on comma seperated values, for example: 01,02,03,04
// The input value is converted as an SQL string.
function createQueryClauseMultiple(codeObject, tableName, input) {
    const splitInputList = String(input).split(',');
    const formattedList = "'" + splitInputList.join("','") + "'";

    // if the codeObject has secondary columns, construct 'OR' clauses for each column in the array
    if (codeObject.secondaryColumns) {
        var returnQueryArray = [];
        returnQueryArray.push(`${tableName}.${codeObject.fieldName} IN (${formattedList})`);
        codeObject.secondaryColumns.forEach((column) => {
            returnQueryArray.push(`${tableName}.${column} IN (${formattedList})`);
        });
        return `(${returnQueryArray.join(' OR ')})`;
    } else return `${tableName}.${codeObject.fieldName} IN (${formattedList})`;
}

// input: 0113,1205
// output: (mun_cty_co = '01' AND mun_mu = '13') OR (mun_cty_co = '12' AND mun_mu = '05') OR ...
function createQueryClauseMunicipality(tableName, input) {
    const splitInputList = String(input).split(',');
    var returnQueryArray = [];

    splitInputList.forEach((juriCode) => {
        const cty = juriCode.substring(0, 2);
        const muni = juriCode.substring(2);
        returnQueryArray.push(`(${tableName}.mun_cty_co = '${cty}' AND ${tableName}.mun_mu = '${muni}')`);
    });
    return '(' + returnQueryArray.join(' OR ') + ')';
}

// input format: 2020-1-1;2021-1-31
function createQueryDateRange(tableName, input) {
    const splitInputList = String(input).split(';');
    if (splitInputList.length > 1) {
        return `(${tableName}.acc_date >= '${splitInputList[0]}' AND ${tableName}.acc_date <= '${splitInputList[1]}')`;
    } else return `${tableName}.acc_date >= '${splitInputList[0]}'`;
}

function createQueryMilepost(mp, from, tableName, milepostColumn = 'milepost') {
    if (from === 'start') return `TRUNC(${tableName}.${milepostColumn}, 1) >= ${mp}`;
    else if (from === 'end') return `TRUNC(${tableName}.${milepostColumn}, 1) <= ${mp}`;
}

// input format 24 hr clock: 0745;1320
function createTimeDateRange(tableName, input) {
    const splitInputList = String(input).split(';');
    if (splitInputList.length > 1) {
        return `(TO_TIMESTAMP(${tableName}.acc_time, 'HH24MI')::TIME BETWEEN '${splitInputList[0].substring(
            0,
            2
        )}:${splitInputList[0].substring(2)}'::TIME AND '${splitInputList[1].substring(
            0,
            2
        )}:${splitInputList[1].substring(2)}'::TIME)`;
    } else
        return `(TO_TIMESTAMP(${tableName}.acc_time, 'HH24MI')::TIME >= '${splitInputList[0].substring(
            0,
            2
        )}:${splitInputList[0].substring(2)}'::TIME)`;
}

function createQueryVehicleTotal(codeObject, tableName, input) {
    // to preserve the menu filter relationship between menus, the
    // magnitude and direction filters are seperate terms which allows
    // them to coexist and operate as expected. "multi" was added to the
    // filter values for the multivehicle filter but will always be stripped
    // out before being submitted to the final query.
    var magniBound = []; // list of all crash magnitude vehicle filters
    var magniBoundPart = '1=1'; // magnitude query string
    var multiBoundPart = '1=1'; // multivehicle query string

    if (input.includes('multi')) {
        // strip out "multi" from the string as there is no corresponding
        // value in the database that would satisfy the condition.
        multiBoundPart = `${tableName}.${codeObject.fieldName}${input.replace('multi', '')}`;
    } else {
        // add the magnitude bound as these will be queried using an "or"
        // statement so all values are valid.
        magniBound.push(`${tableName}.${codeObject.fieldName}${input}`);
    }
    // if there are any magnitude bounds, put them all together
    if (magniBound.length > 0) {
        magniBoundPart = magniBound.join(' or ');
    }

    // join the two terms together before adding them to the final query
    const query = '(' + multiBoundPart + ' and (' + magniBoundPart + '))';
    //console.log(query);
    return query;
}

/**
 * Creates a WHERE clause which appends pedestrian and cyclist crash counts
 * @date 2022-02-28
 * @param {object} codeObject - { title: '...', fieldName: '...', query: function() {...} }
 * @param {string}  tableName - table name of the column
 * @param {string}  input - value to query
 * @param {string}  qualifier - custom qualifier if not '='
 * @returns {string} WHERE clause
 */
function createQueryPedCyclist(codeObject, tableName) {
    if (codeObject.fieldName.includes('killed')) {
        return `(${tableName}.pedestrian_phys_cond_killed > 0 OR ${tableName}.cyclist_killed > 0)`;
    } else if (codeObject.fieldName.includes('incapacitated')) {
        return `(${tableName}.pedestrian_phys_cond_incapacitated > 0 OR ${tableName}.cyclist_incapacitated > 0)`;
    } else if (codeObject.fieldName.includes('moderate_injury')) {
        return `(${tableName}.pedestrian_phys_cond_moderate_injury > 0 OR ${tableName}.cyclist_moderate_pain > 0)`;
    } else if (codeObject.fieldName.includes('complaint_pain')) {
        return `(${tableName}.pedestrian_phys_cond_complaint_pain > 0 OR ${tableName}.cyclist_complaint_of_pain > 0)`;
    }
}

function makeFromClause(tableNameArray, accidentsTableName) {
    var fromClauses = [];
    tableNameArray.forEach((tableName) => {
        // this needs to be a left join because there might not be any of these data points associated with a crash
        fromClauses.push(`LEFT JOIN ${tableName} on ${accidentsTableName}.crashid = ${tableName}.crashid`);
        // join on county code for every related table in the query
        // more joins makes the query perform faster
        if (tableName.includes('vehicles')) {
            fromClauses.push(`ard_vehicles_partition.acc_mun_cty_co = ${accidentsTableName}.mun_cty_co`);
        } else if (tableName.includes('pedestrians')) {
            fromClauses.push(`ard_pedestrians_partition.acc_mun_cty_co = ${accidentsTableName}.mun_cty_co`);
        } else if (tableName.includes('occupants')) {
            fromClauses.push(`ard_occupants_partition.veh_acc_mun_cty_co = ${accidentsTableName}.mun_cty_co`);
        }
    });
    return fromClauses.join(' AND ');
}

function makeWhereClause(whereClauses, tableNameArray, accidentsTableName) {
    if (whereClauses.length <= 0) return '1=1';
    else {
        const additionalClauses = [];

        whereClauses.forEach((clause) => {
            // all tables are partitioned by year
            // add a where clause for year for each related table in the query
            if (clause.includes('year')) {
                if (
                    tableNameArray.some(function (v) {
                        return v.indexOf('vehicles') >= 0;
                    })
                ) {
                    additionalClauses.push(
                        clause.replace(`${accidentsTableName}.year`, 'ard_vehicles_partition.acc_year')
                    );
                } else if (
                    tableNameArray.some(function (v) {
                        return v.indexOf('pedestrians') >= 0;
                    })
                ) {
                    additionalClauses.push(
                        clause.replace(`${accidentsTableName}.year`, 'ard_pedestrians_partition.acc_year')
                    );
                } else if (
                    tableNameArray.some(function (v) {
                        return v.indexOf('occupants') >= 0;
                    })
                ) {
                    additionalClauses.push(
                        clause.replace(`${accidentsTableName}.year`, 'ard_occupants_partition.veh_acc_year')
                    );
                }
            }
        });
        whereClauses.push(...additionalClauses);
    }
    return whereClauses.join(' AND ');
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

module.exports = {
    createQueryClauseSingleton: createQueryClauseSingleton,
    createQueryClauseMultiple: createQueryClauseMultiple,
    createQueryClauseMunicipality: createQueryClauseMunicipality,
    createQueryDateRange: createQueryDateRange,
    createTimeDateRange: createTimeDateRange,
    createQueryMilepost: createQueryMilepost,
    createQueryVehicleTotal: createQueryVehicleTotal,
    createQueryPedCyclist: createQueryPedCyclist,
    makeFromClause: makeFromClause,
    makeWhereClause: makeWhereClause,
    formatCodes: formatCodes
};
