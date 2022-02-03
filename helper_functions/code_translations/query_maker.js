

// *---------------*
// SQL QUERY CLAUSE MAKERS
// *---------------*

// returns SQL formatted WHERE clause for the table attribute with the format: tableAttribute = 'aValue'. 
// The input value is a singleton string, for example: 04
function createQueryClauseSingleton(codeObject, tableName, input, qualifier = '=') {
    // assumes value is a number
    if (qualifier.includes(">") || qualifier.includes("<")) {
        return `${tableName}.${codeObject.fieldName} ${qualifier} ${input}`;
    }
    else return `${tableName}.${codeObject.fieldName} = '${input}'`; // The input value is converted as an SQL string.
}

// returns SQL formatted WHERE clause for the table attribute with the format: tableAttribute IN ('value1', 'value2', ...). 
// The input format will be parsed based on comma seperated values, for example: 01,02,03,04
// The input value is converted as an SQL string.
function createQueryClauseMultiple(codeObject, tableName, input) {
    const splitInputList = String(input).split(',');
    const formattedList = "'" + splitInputList.join("','") + "'"

    // if the codeObject has secondary columns, construct 'OR' clauses for each column in the array
    if (codeObject.secondaryColumns) {
        var returnQueryArray = [];
        returnQueryArray.push(`${tableName}.${codeObject.fieldName} IN (${formattedList})`);
        codeObject.secondaryColumns.forEach(column => {
            returnQueryArray.push(`${tableName}.${column} IN (${formattedList})`);
        });
        return `(${returnQueryArray.join(" OR ")})`;
    }
    else return `${tableName}.${codeObject.fieldName} IN (${formattedList})`;
}

// input format: 2020-1-1;2021-1-31
function createQueryDateRange(tableName, input) {
    const splitInputList = String(input).split(';');
    if (splitInputList.length > 1) {
        return `(${tableName}.acc_date >= '${splitInputList[0]}' AND ${tableName}.acc_date <= '${splitInputList[1]}')`;
    }
    else return `${tableName}.acc_date >= '${splitInputList[0]}'`;
}

function createQueryMilepost(mp, from, tableName, milepostColumn = "milepost") {
    if (from === "start") return `${tableName}.${milepostColumn} >= ${mp}`;
    else if (from === "end") return `${tableName}.${milepostColumn} < ${mp}`;
}

// input format 24 hr clock: 0745;1320
function createTimeDateRange(tableName, input) {
    const splitInputList = String(input).split(';');
    if (splitInputList.length > 1) {
        return `(TO_TIMESTAMP(${tableName}.acc_time, 'HH24MI')::TIME BETWEEN '${splitInputList[0].substring(0,2)}:${splitInputList[0].substring(2)}'::TIME AND '${splitInputList[1].substring(0,2)}:${splitInputList[1].substring(2)}'::TIME)`;
    }
    else return `(TO_TIMESTAMP(${tableName}.acc_time, 'HH24MI')::TIME >= '${splitInputList[0].substring(0,2)}:${splitInputList[0].substring(2)}'::TIME)`;
}

function createQueryVehicleTotal(codeObject, tableName, input) {
    // to preserve the menu filter relationship between menus, the
    // magnitude and direction filters are seperate terms which allows
    // them to coexist and operate as expected. "multi" was added to the
    // filter values for the multivehicle filter but will always be stripped
    // out before being submitted to the final query.
    var magniBound = []; // list of all crash magnitude vehicle filters
    var magniBoundPart = "1=1"; // magnitude query string
    var multiBoundPart = "1=1"; // multivehicle query string

    if (input.includes("multi")) {
        // strip out "multi" from the string as there is no corresponding
        // value in the database that would satisfy the condition.
        multiBoundPart = `${tableName}.${codeObject.fieldName}${input.replace("multi", "")}`;
    }
    else {
        // add the magnitude bound as these will be queried using an "or"
        // statement so all values are valid.
        magniBound.push(`${tableName}.${codeObject.fieldName}${input}`);
    }
    // if there are any magnitude bounds, put them all together
    if (magniBound.length > 0) {
        magniBoundPart = magniBound.join(" or ");
    }

    // join the two terms together before adding them to the final query
    const query = "(" + multiBoundPart + " and (" + magniBoundPart + "))";
    console.log(query);
    return query;
}

function makeFromClause(tableNameArray, accidentsTableName) {
    var fromClause = "";
    tableNameArray.forEach(tableName => {
        fromClause += `INNER JOIN ${tableName} on ${accidentsTableName}.crashid = ${tableName}.crashid `;
    });
    return fromClause;
}

function makeWhereClause(whereClauses) {
    if (whereClauses.length <= 0) return "1=1";
    else return whereClauses.join(" AND ");
}

module.exports = {
    createQueryClauseSingleton: createQueryClauseSingleton,
    createQueryClauseMultiple: createQueryClauseMultiple,
    createQueryDateRange: createQueryDateRange,
    createTimeDateRange: createTimeDateRange,
    createQueryMilepost: createQueryMilepost,
    createQueryVehicleTotal: createQueryVehicleTotal,
    makeFromClause: makeFromClause,
    makeWhereClause: makeWhereClause
}