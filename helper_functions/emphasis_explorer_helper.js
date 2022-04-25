const { table } = require("./code_translations/accidents");

function getTableNames(category, subcategory, whereClause) {
    const schema = "emphasis_explorer";
    const tables = {
        lane_departure: {
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
        ped_cyclists: {
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
        intersections: {
            annual_bodies: {
                table: 'intersections_crashes',
                query: function () { return getAnnualBodiesQuery(schema, this.table, whereClause); }
            },
            crash_type: {
                table: "intersections_crashes",
                query: function () { return getCrashTypeQuery(schema, this.table, whereClause); }
            },
            county: {
                table: "intersections_crashes",
                query: function () { return getCountyQuery(schema, this.table, whereClause); }
            },
            age: {
                table: "intersections_persons",
                query: function () { return getAgeQuery(schema, this.table, whereClause); }
            },
            aggressive: {
                table: "intersections_crashes_aggressive",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            drowsy_distracted: {
                table: "intersections_crashes_drowsy_distracted",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            unbelted: {
                table: "intersections_crashes_unbelted",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            impaired: {
                table: "intersections_crashes_impaired",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            },
            unlicensed: {
                table: "intersections_crashes_unlicensed",
                query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
            }
        },
        driver_behavior: {
            subcategory: {
                aggressive: {
                    title: "db_aggressive_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                drowsy_distracted: {
                    title: "db_drowsy_distracted_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                unbelted: {
                    title: "db_unbelted_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                impaired: {
                    title: "db_impaired_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                unlicensed: {
                    title: "db_unlicensed_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                heavy_vehicle: {
                    title: "db_heavy_vehicles_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                }               
            }
        },
        road_users: {
            subcategory: {
                mature: {
                    title: "ru_mature_driver_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                motorcyclist: {
                    title: "ru_motorcyclist_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                younger: {
                    title: "ru_younger_driver_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                },
                work_zone: {
                    title: "ru_work_zone_crashes",
                    query: function () { return getBehaviorQuery(schema, this.table, whereClause); }
                }               
            }
        }
    }
}

function getAnnualBodiesQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT YEAR, SUM(COALESCE(occupant_phys_cond_incapacitated,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + COALESCE(cyclist_incapacitated,0)) serious_injury,
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(cyclist_killed,0)) fatal,
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(occupant_phys_cond_incapacitated,0) + 
        COALESCE(occupant_phys_cond_moderate_injury,0) + COALESCE(occupant_phys_cond_complaint_pain,0) + 
        COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + 
        COALESCE(pedestrian_phys_cond_moderate_injury,0) + COALESCE(pedestrian_phys_cond_complaint_pain,0) +
        COALESCE(cyclist_killed,0) + COALESCE(cyclist_incapacitated,0) + COALESCE(cyclist_complaint_of_pain,0) + COALESCE(cyclist_moderate_pain,0)
        ) total
    FROM 
    ${schemaName}.${tableName} WHERE ${whereClause}
    GROUP BY YEAR ORDER BY YEAR;`;
  
    return sql
}

function getCrashTypeQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT crash_type, SUM(COALESCE(occupant_phys_cond_incapacitated,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + COALESCE(cyclist_incapacitated,0)) serious_injury,
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(cyclist_killed,0)) fatal
    FROM 
    ${schemaName}.${tableName} WHERE ${whereClause}
    GROUP BY crash_type ORDER BY crash_type;`;
  
    return sql;
}

function getCountyQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT mun_cty_co, SUM(COALESCE(occupant_phys_cond_incapacitated,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + COALESCE(cyclist_incapacitated,0)) serious_injury,
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(cyclist_killed,0)) fatal
    FROM 
    ${schemaName}.${tableName} WHERE ${whereClause}
    GROUP BY mun_cty_co ORDER BY mun_cty_co;`;
  
    return sql;
}

function getAgeQuery(schemaName, tableName, whereClause) {
    const sql = `
    SELECT severity_rating, sex, age_bucket, SUM(personsCount) FROM
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
        ${schemaName}.${tableName} WHERE ${whereClause}
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
    SELECT YEAR, SUM(COALESCE(occupant_phys_cond_incapacitated,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + COALESCE(cyclist_incapacitated,0)) serious_injury,
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(cyclist_killed,0)) fatal,
    SUM(COALESCE(occupant_phys_cond_killed,0) + COALESCE(occupant_phys_cond_incapacitated,0) + 
        COALESCE(occupant_phys_cond_moderate_injury,0) + COALESCE(occupant_phys_cond_complaint_pain,0) + 
        COALESCE(pedestrian_phys_cond_killed,0) + COALESCE(pedestrian_phys_cond_incapacitated,0) + 
        COALESCE(pedestrian_phys_cond_moderate_injury,0) + COALESCE(pedestrian_phys_cond_complaint_pain,0) +
        COALESCE(cyclist_killed,0) + COALESCE(cyclist_incapacitated,0) + COALESCE(cyclist_complaint_of_pain,0) + COALESCE(cyclist_moderate_pain,0)
        ) total
    FROM 
    ${schemaName}.${tableName} WHERE ${whereClause}
    GROUP BY YEAR ORDER BY YEAR;`
  
    return sql;
}