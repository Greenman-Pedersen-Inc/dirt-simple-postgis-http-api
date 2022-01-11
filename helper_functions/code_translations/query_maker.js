// *---------------*
// SQL QUERY CLAUSE MAKERS
// *---------------*

// returns SQL formatted WHERE clause for the table attribute with the format: tableAttribute = 'aValue'. 
// The input value is a singleton string, for example: 04
function createQueryClauseSingleton(codeObject, input, qualifier = '=') {
    // assumes value is a number
    if (qualifier.includes(">") || qualifier.includes("<")) {
        return `${codeObject.fieldName} ${qualifier} ${input}`;
    }
    else return `${codeObject.fieldName} = '${input}'`; // The input value is converted as an SQL string.
}

// returns SQL formatted WHERE clause for the table attribute with the format: tableAttribute IN ('value1', 'value2', ...). 
// The input format will be parsed based on comma seperated values, for example: 01,02,03,04
// The input value is converted as an SQL string.
function createQueryClauseMultiple(codeObject, input) {
    const splitInputList = input.split(',');
    const formattedList = "'" + splitInputList.join("','") + "'"

    // if the codeObject has secondary columns, construct 'OR' clauses for each column in the array
    if (codeObject.secondaryColumns) {
        var returnQueryArray = [];
        returnQueryArray.push(`${codeObject.fieldName} IN (${formattedList})`);
        codeObject.secondaryColumns.forEach(column => {
            returnQueryArray.push(`${column} IN (${formattedList})`);
        });
        return `(${returnQueryArray.join(" OR ")})`;
    }
    else return `${codeObject.fieldName} IN (${formattedList})`;
}

// input format: 2020-1-1;2021-1-31
function createQueryDateRange(input) {
    const splitInputList = input.split(';');
    if (splitInputList.length > 1) {
        return `(acc_date >= '${splitInputList[0]}' AND acc_date <= '${splitInputList[1]}')`;
    }
    else return `acc_date >= '${splitInputList[0]}'`;
}

function createQueryMilepost(mp, from, milepostColumn = "calc_sri") {
    if (from === "start") return `${milepostColumn} >= ${mp}`;
    else if (from === "end") return `${milepostColumn} < ${mp}`;
}

// input format 24 hr clock: 0745;1320
function createTimeDateRange(input) {
    const splitInputList = input.split(';');
    if (splitInputList.length > 1) {
        return `(TO_TIMESTAMP(acc_time, 'HH24MI')::TIME BETWEEN '${splitInputList[0].substring(0,2)}:${splitInputList[0].substring(2)}'::TIME AND '${splitInputList[1].substring(0,2)}:${splitInputList[1].substring(2)}'::TIME)`;
    }
    else return `(TO_TIMESTAMP(acc_time, 'HH24MI')::TIME >= '${splitInputList[0].substring(0,2)}:${splitInputList[0].substring(2)}'::TIME)`;
}

module.exports = {
    createQueryClauseSingleton: createQueryClauseSingleton,
    createQueryClauseMultiple: createQueryClauseMultiple,
    createQueryDateRange: createQueryDateRange,
    createTimeDateRange: createTimeDateRange,
    createQueryMilepost: createQueryMilepost
}