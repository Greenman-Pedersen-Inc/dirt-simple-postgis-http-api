// *---------------*
// functions that find or translate ARD column codes into readable fields and return values for the front-end
// *---------------*
const accidentsFilters = require('./accidents');
const occupantsFilters = require('./occupants');
const vehiclesFilters = require('./vehicles');
const pedestriansFilters = require('./pedestrians');
const tableFiltersArray = [accidentsFilters, occupantsFilters, vehiclesFilters, pedestriansFilters];

// *---------------*
// CODE LOOKUP FUNCTIONS
// *---------------*

function resolveFieldAlias(targetFieldName) {
    for (let index = 0; index < tableFiltersArray.length; index++) {
        const filters = tableFiltersArray[index].filters;
        let aliasList = filters.filter(filter => {
            if (filter.fieldName === targetFieldName || filter.moduleName === targetFieldName) {
                return true;
            }
        })

        if (aliasList.length === 1) { // exact match found, with no duplicates
            aliasList[0]['table'] = tableFiltersArray[index].table;
            return aliasList[0];
        } else {
            //console.log(targetFieldName, ' could not be found in ', index);
        }
    }
};

// transcribes fieldName keys into human-readble title as keys
// dataObject is in format: [ {"crashid": "11-07-2016-16-6761-AC","year": "2016","mun_cty_co": "11",...}, {...}, {...} ]
function transcribeKeysArray(dataRowsArray) {
    var transcribedRows = [];
    dataRowsArray.forEach(row => {
        var returnRow = transcribeKeys(row);
        transcribedRows.push(returnRow);
    });
    return transcribedRows;
}

// transcribes fieldName keys into human-readble title as keys
// dataObject is in format: {"crashid": "11-07-2016-16-6761-AC","year": "2016","mun_cty_co": "11",...}
function transcribeKeys(dataRowObject, translateValues = true) {
    var returnRow = {}

    if (dataRowObject && Object.entries(dataRowObject)) {
        for (const [key, value] of Object.entries(dataRowObject)) {
            var rowValue = value;
            var found = false;
            var countyCode;

            for (let index = 0; index < tableFiltersArray.length; index++) {
                const filters = tableFiltersArray[index].filters;
                let aliasList = filters.filter(filter => {
                    if (filter.fieldName === key || filter.moduleName === key) {
                        if (key.includes("mun_cty_co")) countyCode = value;
                        return true;
                    }
                })

                if (aliasList.length === 1) { // exact match found, with no duplicates
                    if (key !== aliasList[0].title) {
                        if (translateValues) {
                            if (aliasList[0].values) {
                                var dataValue = value;

                                if (key.includes("mun_mu")) {
                                    if (value.length == 2) dataValue = countyCode + value;
                                }

                                let foundValue = aliasList[0].values.find(e => e.code === dataValue);
                                if (foundValue) {
                                    if (foundValue.hasOwnProperty('description')) rowValue = foundValue.description;
                                }
                            }
                        }
                        returnRow[aliasList[0].title] = rowValue;
                        found = true;
                    }
                    break;
                }
            }

            // don't output keys that are not found. they will not be included in the results
            if (!found) returnRow[key] = rowValue;
        }
    }

    return returnRow;
}

// converts table fields into proper titles and codes into actual descriptions
function convertTableCodes(valueStruct) {
    let countyCode;
    for (i = 0; i < valueStruct.length; i++) {
        for (j = 0; j < filters.length; j++) {
            if (filters[j].fieldName === valueStruct[i].field) {
                valueStruct[i].field = filters[j].title;
                if (valueStruct[i].field === 'County') {
                    countyCode = valueStruct[i].value
                }
                if (valueStruct[i].field === 'Municipality') {
                    valueStruct[i].value = countyCode + valueStruct[i].value
                }
                if (typeof filters[j].values === 'undefined') {} else {
                    for (k = 0; k < filters[j].values.length; k++) {
                        if (valueStruct[i].value === filters[j].values[k].code) {
                            valueStruct[i].value = filters[j].values[k].description;
                        }
                    }
                }
            }
        }
    }
};

function convertCodeDescription(fieldName, codeNumber) {
    let fieldValues = filters.filter(filter => filter.fieldName === fieldName)

    if (fieldValues.length === 1) {
        if (fieldValues[0].values) {
            let codeAlias = fieldValues[0].values.filter(value => {
                if (value.code === codeNumber) {
                    return true;
                }
            })

            if (codeAlias.length === 1) { // exact match found, with no duplicates
                return codeAlias[0].description;
            } else {
                // console.log(fieldName, codeNumber, codeAlias.length, 'duplicates of alias found, revise list')
                return codeNumber;
            }
        } else {
            return codeNumber;
        }
    } else {
        // console.log(fieldName, codeNumber, fieldValues.length, 'duplicates of field found, revise list')
        return codeNumber;
    }
};

function convertFeatureObjectValues(feature) {
    const formattedFeature = {};

    Object.keys(feature).map(function(objectKey, index) {
        if (objectKey != "geom") {
            let value;

            if (objectKey === 'mun_mu') {
                value = convertCodeDescription(objectKey, `${feature['mun_cty_co']}${feature[objectKey]}`);
            } else {
                value = convertCodeDescription(objectKey, feature[objectKey]);
            }

            formattedFeature[objectKey] = value;
        }
    });

    return formattedFeature;
}

function convertFeature(feature) {
    let formattedProperties = [];

    Object.keys(feature).map(function(objectKey, index) {
        if (objectKey != "geom") {
            let alias = resolveFieldAlias(objectKey);
            let value = convertCodeDescription(objectKey, feature[objectKey]);

            if (objectKey === 'mun_mu') {
                value = convertCodeDescription(objectKey, `${feature['mun_cty_co']}${feature[objectKey]}`);
            } else {
                value = convertCodeDescription(objectKey, feature[objectKey]);
            }

            formattedProperties.push([alias, value]);
        }
    });

    return formattedProperties;
}

module.exports = {
    resolveFieldAlias: resolveFieldAlias,
    transcribeKeys: transcribeKeys,
    transcribeKeysArray: transcribeKeysArray,
}