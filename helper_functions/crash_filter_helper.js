
const { resolveFieldAlias } = require('./code_translations/translator_helper');
const { makeFromClause, makeWhereClause } = require('./code_translations/query_maker');



function makeCrashFilterQuery(crashFilter) {
    const filterJson = JSON.parse(crashFilter);
    console.log(filterJson);
    var usedTables = [];
    var whereClauses = [];

    for (var key of Object.keys(filterJson)) {
        const codeTranslation = resolveFieldAlias(key);
        if (codeTranslation) {

            if (usedTables.indexOf(codeTranslation.table) === -1) { usedTables.push(codeTranslation.table) } // add the table in list of tables to construct the FROM clause with
            whereClauses.push(codeTranslation.query(filterJson[key]));    // add the WHERE clause for the filter in the whereClauses array
        }
    }

    return {
        fromClause: makeFromClause(usedTables),
        whereClause: makeWhereClause(whereClauses)
    }
}

module.exports = {
    makeCrashFilterQuery: makeCrashFilterQuery
}