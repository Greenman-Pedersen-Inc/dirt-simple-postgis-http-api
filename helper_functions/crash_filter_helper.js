
const { resolveFieldAlias } = require('./code_translations/translator_helper');
const { makeFromClause, makeWhereClause } = require('./code_translations/query_maker');

function makeCrashFilterQuery(crashFilter, accidentTableName) {
    let filterJson;
    if (typeof crashFilter === 'string') {
        filterJson = JSON.parse(crashFilter);
    } else {
        filterJson = crashFilter;
    }

    // check if the filter is within: 'pedestrian_phys_cond', 'occupant_phys_cond', 'trf_ctrl', 'driver_phys'
    const specialCategoryData = checkSpecialCategories(filterJson, accidentTableName);

    var usedTables = specialCategoryData.usedTables;
    var whereClauses = specialCategoryData.whereClauses;
    filterJson = specialCategoryData.filterJson;

    for (var key of Object.keys(filterJson)) {
        const codeTranslation = resolveFieldAlias(key);
        if (codeTranslation) {
            // add the table in list of tables to construct the FROM clause with
            if (codeTranslation.table !== accidentTableName) {
                if (usedTables.indexOf(codeTranslation.table) === -1) {
                    usedTables.push(codeTranslation.table);
                } 
            }
            const value = filterJson[key];
            if (value !== undefined && value !== null && value !== '') {
                whereClauses.push(codeTranslation.query(filterJson[key]));    // add the WHERE clause for the filter in the whereClauses array
            }
        }
    }

    return {
        fromClause: makeFromClause(usedTables, accidentTableName),
        whereClause: makeWhereClause(whereClauses, usedTables, accidentTableName)
    }
}

// check if the filters have pedestrian_phys_cond, occupant_phys_cond, trf_ctrl, driver_phys
// each of these filter categories need to be nested by OR statements
function checkSpecialCategories(filterJson, accidentTableName) {
    var usedTables = [];
    var whereClauses = [];

    const specialCategories = [ 'pedestrian_phys_cond', 'occupant_phys_cond', 'pedestrian_cyclist_phys_cond', 'trf_ctrl', 'driver_phys' ];
    specialCategories.forEach(category => {
        var clauses = [];
        for (var key of Object.keys(filterJson)) {
            if (key.includes(category)) {
                const codeTranslation = resolveFieldAlias(key);
                if (codeTranslation) {
                    // add the table in list of tables to construct the FROM clause with
                    if (codeTranslation.table !== accidentTableName) {
                        if (usedTables.indexOf(codeTranslation.table) === -1) {
                            usedTables.push(codeTranslation.table);
                        } 
                    }
                    const value = filterJson[key];
                    if (value !== undefined || value !== null || value !== '') {
                        clauses.push(codeTranslation.query(filterJson[key]));    // add the WHERE clause for the filter in the whereClauses array
                    }
                    delete filterJson[key];
                }
            }
        }
        if (clauses.length > 0) whereClauses.push( '(' + clauses.join(' OR ') + ')');
    });
    return {
        'usedTables': usedTables,
        'whereClauses': whereClauses,
        'filterJson': filterJson
    }
}

module.exports = {
    makeCrashFilterQuery: makeCrashFilterQuery
}