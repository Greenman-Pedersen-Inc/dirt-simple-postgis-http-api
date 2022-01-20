
const { resolveFieldAlias } = require('./code_translations/translator_helper');
const { makeFromClause, makeWhereClause } = require('./code_translations/query_maker');



function makeCrashFilterQuery(crashFilter, accidentTableName) {
    let filterJson;
    if (typeof crashFilter === 'string') {
        filterJson = JSON.parse(crashFilter);
    } else {
        filterJson = crashFilter;
    }
    //console.log("makeCrashFilterQuery: ", filterJson);
    var usedTables = [];
    var whereClauses = [];

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
        whereClause: makeWhereClause(whereClauses)
    }
}

module.exports = {
    makeCrashFilterQuery: makeCrashFilterQuery
}