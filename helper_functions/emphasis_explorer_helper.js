const schema = "emphasis_areas_2021";

function makeWhereClause(queryParamObject, isRollingAvg = false) {
    var whereClauses = [];
    var clauseValues = [];
    var valueCounter = 1;
    const rollingAvgOffset = 4; // number of years to subtract from the startYear

    if (queryParamObject.hasOwnProperty('startYear') && queryParamObject.hasOwnProperty('startYear') ) {
        whereClauses.push(`year BETWEEN $${valueCounter} AND $${valueCounter + 1}`);
        if (isRollingAvg) {
            clauseValues.push(parseInt(queryParamObject['startYear']) - rollingAvgOffset);
        } 
        else {
            clauseValues.push(queryParamObject['startYear']);
        }
        clauseValues.push(queryParamObject['endYear']);
        valueCounter += 2;
    }
    if (queryParamObject.hasOwnProperty('sri')) {
        whereClauses.push(`calc_sri = $${valueCounter}`);
        clauseValues.push(queryParamObject['sri']);
    }
    else if (queryParamObject.hasOwnProperty('mun_cty_co')) {
        whereClauses.push(`mun_cty_co = $${valueCounter}`);
        clauseValues.push(queryParamObject['mun_cty_co']);
        if (queryParamObject.hasOwnProperty('mun_mu')) {
            whereClauses.push(`mun_mu = $${valueCounter + 1}`);
            clauseValues.push(queryParamObject['mun_mu']);
        }
    }

    return {
        whereClauses: whereClauses,
        values: clauseValues
    }
}

function getTableQuery(category, subcategory = null, whereClause, whereClauseRollingAvg) {
    const tables = {
        lane_departure: {
            // annual_bodies_rolling_average: {
            //     table: 'lane_departure_crashes',
            //     query: function () { return getAnnualBodiesQuery(schema, this.table, whereClauseRollingAvg); }
            // },
            annual_bodies: {
                table: 'lane_departure_crashes',
                query: function () { return getAnnualBodiesQuery(schema, this.table, whereClause); }
            },
            crash_type: {
                table: "lane_departure_crashes",
                query: function () { return getCrashTypeQuery(schema, this.table, whereClause); }
            },
            county: {
                table: "lane_departure_crashes",
                query: function () { return getCountyQuery(schema, this.table, whereClause); }
            },
            age: {
                table: "lane_departure_persons",
                query: function () { return getAgeQuery(schema, this.table, whereClause); }
            },
            aggressive: {
                table: "lane_departure_crashes_aggressive",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            drowsy_distracted: {
                table: "lane_departure_crashes_drowsy_distracted",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            unbelted: {
                table: "lane_departure_crashes_unbelted",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            impaired: {
                table: "lane_departure_crashes_impaired",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            unlicensed: {
                table: "lane_departure_crashes_unlicensed",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            }
        },
        ped_cyclist: {
            // annual_bodies_rolling_average: {
            //     table: 'ped_bike_crashes',
            //     query: function () { return getAnnualBodiesQuery(schema, this.table, whereClauseRollingAvg); }
            // },
            annual_bodies: {
                table: 'ped_bike_crashes',
                query: function () { return getAnnualBodiesQuery(schema, this.table, whereClause); }
            },
            crash_type: {
                table: "ped_bike_crashes",
                query: function () { return getCrashTypeQuery(schema, this.table, whereClause); }
            },
            county: {
                table: "ped_bike_crashes",
                query: function () { return getCountyQuery(schema, this.table, whereClause); }
            },
            age: {
                table: "ped_bike_persons",
                query: function () { return getAgeQuery(schema, this.table, whereClause); }
            },
            aggressive: {
                table: "ped_bike_crashes_aggressive",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            drowsy_distracted: {
                table: "ped_bike_crashes_drowsy_distracted",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            unbelted: {
                table: "ped_bike_crashes_unbelted",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            impaired: {
                table: "ped_bike_crashes_impaired",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            unlicensed: {
                table: "ped_bike_crashes_unlicensed",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            }
        },
        intersection: {
            // annual_bodies_rolling_average: {
            //     table: 'intersection_crashes',
            //     query: function () { return getAnnualBodiesQuery(schema, this.table, whereClauseRollingAvg); }
            // },
            annual_bodies: {
                table: 'intersection_crashes',
                query: function () { return getAnnualBodiesQuery(schema, this.table, whereClause); }
            },
            crash_type: {
                table: "intersection_crashes",
                query: function () { return getCrashTypeQuery(schema, this.table, whereClause); }
            },
            county: {
                table: "intersection_crashes",
                query: function () { return getCountyQuery(schema, this.table, whereClause); }
            },
            age: {
                table: "intersection_persons",
                query: function () { return getAgeQuery(schema, this.table, whereClause); }
            },
            aggressive: {
                table: "intersection_crashes_aggressive",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            drowsy_distracted: {
                table: "intersection_crashes_drowsy_distracted",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            unbelted: {
                table: "intersection_crashes_unbelted",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            impaired: {
                table: "intersection_crashes_impaired",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            unlicensed: {
                table: "intersection_crashes_unlicensed",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            }
        },
        driver_behavior: {
            subcategory: {
                aggressive: {
                    table: "db_aggressive_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                drowsy_distracted: {
                    table: "db_drowsy_distracted_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                unbelted: {
                    table: "db_unbelted_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                impaired: {
                    table: "db_impaired_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                unlicensed: {
                    table: "db_unlicensed_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                heavy_vehicle: {
                    table: "db_heavy_vehicles_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                }               
            }
        },
        road_users: {
            subcategory: {
                mature: {
                    table: "ru_mature_driver_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                motorcyclist: {
                    table: "ru_motorcyclist_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                younger: {
                    table: "ru_younger_driver_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                work_zone: {
                    table: "ru_work_zone_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                }               
            }
        }
    }

    if (subcategory !== null) {
        for (const [table, categories] of Object.entries(tables)) {
            if (table == category) {
                if (categories.hasOwnProperty('subcategory')) {
                    for (const [aCategory, categoryValues] of Object.entries(categories['subcategory'])) {
                        if (aCategory == subcategory) {
                            return { 
                                [subcategory]: categoryValues,
                                // annual_bodies_rolling_average: {
                                //     table: categoryValues['table'],
                                //     query: function () { return getAnnualBodiesQuery(schema, categoryValues['table'], whereClauseRollingAvg); }
                                // }
                            };
                        }
                    }
                }                
            }
        }
    }
    else {
        for (const [table, categories] of Object.entries(tables)) {
            if (table == category) return categories;
        }
    }
}

function getAnnualBodiesQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT YEAR::INT "Year", SUM(COALESCE(occupant_phys_cond_incapacitated,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + COALESCE(cyclist_incapacitated,0))::INT "Serious_Injury",
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(cyclist_killed,0))::INT "Fatal",
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(occupant_phys_cond_incapacitated,0) + 
        COALESCE(occupant_phys_cond_moderate_injury,0) + COALESCE(occupant_phys_cond_complaint_pain,0) + 
        COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + 
        COALESCE(pedestrian_phys_cond_moderate_injury,0) + COALESCE(pedestrian_phys_cond_complaint_pain,0) +
        COALESCE(cyclist_killed,0) + COALESCE(cyclist_incapacitated,0) + COALESCE(cyclist_complaint_of_pain,0) + COALESCE(cyclist_moderate_pain,0)
        )::INT "Total"
    FROM 
    ${schemaName}.${tableName} WHERE ${whereClause}
    GROUP BY YEAR ORDER BY YEAR;`;
  
    return sql
}

function getCrashTypeQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT CASE
    WHEN crash_type = '01' THEN 'Same Direction - Rear End' 
    WHEN crash_type = '02' THEN 'Same Direction - Sideswipe' 
    WHEN crash_type = '03' THEN 'Right Angle' 
    WHEN crash_type = '04' THEN 'Opposite Direction (Head On/ Angular)' 
    WHEN crash_type = '05' THEN 'Opposite Direction (Sideswipe)' 
    WHEN crash_type = '06' THEN 'Struck Parked Vehicle' 
    WHEN crash_type = '07' THEN 'Left Turn/U Turn' 
    WHEN crash_type = '08' THEN 'Backing' 
    WHEN crash_type = '09' THEN 'Encroachment' 
    WHEN crash_type = '10' THEN 'Overturned' 
    WHEN crash_type = '11' THEN 'Fixed Object' 
    WHEN crash_type = '12' THEN 'Animal' 
    WHEN crash_type = '13' THEN 'Pedestrian' 
    WHEN crash_type = '14' THEN 'Pedalcyclist' 
    WHEN crash_type = '15' THEN 'Non-fixed Object' 
    WHEN crash_type = '16' THEN 'Railcar - vehicle' 
    WHEN crash_type = '99' THEN 'Other' 
    WHEN crash_type = '00' THEN 'Unknown' 
    WHEN crash_type = '-20' THEN 'Not Recorded' 
    WHEN crash_type = '20' THEN 'Value Unknown' 
    ELSE 'Unknown'
    END AS "Crash_Type_Label", SUM(COALESCE(occupant_phys_cond_incapacitated,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + COALESCE(cyclist_incapacitated,0))::INT "Serious_Injury",
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(cyclist_killed,0))::INT "Fatal"
    FROM 
    ${schemaName}.${tableName} WHERE ${whereClause}
    GROUP BY crash_type ORDER BY crash_type;`;
  
    return sql;
}

function getCountyQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT county_name "County_Label", SUM(COALESCE(occupant_phys_cond_incapacitated,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + COALESCE(cyclist_incapacitated,0))::INT "Serious_Injury",
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(cyclist_killed,0))::INT "Fatal"
    FROM 
    ${schemaName}.${tableName} 
    LEFT JOIN public.ard_county ON ${schemaName}.${tableName}.mun_cty_co = public.ard_county.county_code
    WHERE ${whereClause}
    GROUP BY county_name ORDER BY county_name;`;
  
    return sql;
}

function getAgeQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT severity_rating "Severity_Rating", sex "Sex", age_bucket "AgeBucket", NULLIF(SUM(personsCount), 0)::INT "Persons_Count" FROM
    (
        SELECT severity_rating, age, sex, COUNT(crashid) personsCount,
        CASE
            WHEN age < 16 THEN '< 16'
            WHEN age BETWEEN 16 AND 20 THEN '16-20'
            WHEN age BETWEEN 21 AND 25 THEN '21-25'
            WHEN age BETWEEN 26 AND 30 THEN '26-30'
            WHEN age BETWEEN 31 AND 35 THEN '31-35'
            WHEN age BETWEEN 36 AND 40 THEN '36-40'
            WHEN age BETWEEN 36 AND 40 THEN '36-40'
            WHEN age BETWEEN 41 AND 45 THEN '41-45'
            WHEN age BETWEEN 46 AND 50 THEN '46-50'
            WHEN age BETWEEN 51 AND 55 THEN '51-55'
            WHEN age BETWEEN 56 AND 60 THEN '56-60'
            WHEN age BETWEEN 61 AND 65 THEN '61-65'
            WHEN age > 65 THEN '> 65'
            ELSE 'N/A'
        END AS age_bucket
        FROM ${schemaName}.${tableName} WHERE ${whereClause}
        GROUP BY severity_rating, age, sex
    ) personsData
    WHERE sex IS NOT NULL 
    GROUP BY severity_rating, sex, age_bucket
    ORDER BY sex, severity_rating;`
  
    return sql;
}

// <----- Related Behavior Queries ----->

function getBehaviorQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT YEAR::INT "Year", SUM(COALESCE(occupant_phys_cond_incapacitated,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + COALESCE(cyclist_incapacitated,0))::INT "Serious_Injury",
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(cyclist_killed,0))::INT "Fatal",
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(occupant_phys_cond_incapacitated,0) + 
        COALESCE(occupant_phys_cond_moderate_injury,0) + COALESCE(occupant_phys_cond_complaint_pain,0) + 
        COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + 
        COALESCE(pedestrian_phys_cond_moderate_injury,0) + COALESCE(pedestrian_phys_cond_complaint_pain,0) +
        COALESCE(cyclist_killed,0) + COALESCE(cyclist_incapacitated,0) + COALESCE(cyclist_complaint_of_pain,0) + COALESCE(cyclist_moderate_pain,0)
        )::INT "Total"
    FROM 
    ${schemaName}.${tableName} WHERE ${whereClause}
    GROUP BY YEAR ORDER BY YEAR;`
  
    return sql;
}

// <----- 5 Year Rolling Avg Helper ----->

/**
 * Calculates the 5 year rolling average for Fatal, SI, and Total Persons count
 * @date 2022-04-26
 * @param {object} annualData - Fatal, SI, and Total persons data from startYear - 4
 * @param {string} startYear
 * @param {string} endYear
 * @returns {object} Calculated 5 year rolling avarage Fatal, SI, and Total persons counts from startYear to endYear
 */
function calculateRollingAverage(annualData, startYear) {
    const windowSize = 5;
    var rollingAvgData = [];
    const startYearIdx = annualData.findIndex(yr => yr['Year'] === startYear);
    for (let yearIdx = startYearIdx; yearIdx < annualData.length; yearIdx++) {
        var fatalSum = 0; 
        var siSum = 0; 
        var totalSum = 0;
        for (let windowIdx = 0; windowIdx < windowSize; windowIdx++) {
            const targetYear = annualData[yearIdx - windowIdx];
            fatalSum += parseInt(targetYear['Fatal']);
            siSum += parseInt(targetYear['Serious_Injury']);
            totalSum += parseInt(targetYear['Total']);
        }
        rollingAvgData.push({
            'Year': annualData[yearIdx]['Year'],
            'Fatal': fatalSum / windowSize,
            'Serious_Injury': siSum / windowSize,
            'Total': totalSum / windowSize
        });
    }

    return rollingAvgData;
}


module.exports = {
    makeWhereClause: makeWhereClause,
    getTableQuery: getTableQuery,
    calculateRollingAverage: calculateRollingAverage
}