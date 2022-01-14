// get_crash_detail: Gets Accident, Vehicle, Occupant, Ped data in the Detailed Crash Information dialog

const { transcribeKeys, transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');

// *---------------*
// route query
// *---------------*
function getQueries(queryArgs) {
    var queries = {};
    queries.accidents = (`SELECT * FROM ard_accidents where ${getWhereClause(queryArgs, "accidents")}`);       // ACCIDENTS query
    queries.vehicles = (`SELECT ${getColumns("vehicles")} FROM ard_vehicles where ${getWhereClause(queryArgs, "vehicles")}`);       // Vehicles query
    queries.drivers = (`SELECT ${getColumns("drivers")} FROM ard_vehicles where ${getWhereClause(queryArgs, "vehicles")}`);       // drivers query
    queries.occupants = (`SELECT * FROM ard_occupants where ${getWhereClause(queryArgs, "occupants")}`);       // Occupants query
    queries.pedestrians = (`SELECT * FROM ard_pedestrians where ${getWhereClause(queryArgs, "pedestrians")}`);       // Pedestrians query
    return queries;
}

function getWhereClause(queryArgs, table) {
    if (queryArgs.crashid) return `crashid = '${queryArgs.crashid}'`;
    if (table === "accidents") {
        return `mun_cty_co = '${queryArgs.county}' and mun_mu = '${queryArgs.municipality}' and acc_case = '${queryArgs.caseNumber}' and year ='${queryArgs.year}'`
    }
    else if (table === "vehicles" || table === "pedestrians") {
        return `acc_mun_cty_co = '${queryArgs.county}' and acc_mun_mu = '${queryArgs.municipality}' and acc_acc_case = '${queryArgs.caseNumber}' and acc_year ='${queryArgs.year}'`
    }
    else if (table === "occupants") {
        return `veh_acc_mun_cty_co = '${queryArgs.county}' and veh_acc_mun_mu = '${queryArgs.municipality}' and veh_acc_acc_case = '${queryArgs.caseNumber}' and veh_acc_year ='${queryArgs.year}'`
    }
}

function getColumns(dataType) {
    if (dataType === "vehicles") return "id, extent_damage_code, initial_impact, principal_damage, towed, removed_by, removed_to, special_veh_code, veh_use_code, veh_weight_rating, type_code, make, model, cargo_body_code, color, contr_circum_code1, contr_circum_code2, first_event_code, second_event_code, third_event_code, fourth_event_code, pre_crash_type, traf_cntrl_code, flg_drive_left_tow, flg_hit_run, flg_imp_disabled, flg_parked, flg_resp_emergency, hazmat_class, hazmat_placard, hazmat_status";
    else if (dataType === "drivers") return "id, driver_alc_result, driver_alc_test, driver_alc_type, cell_use_code, driver_charge1, driver_charge2, driver_charge3, driver_charge4, driver_multi_charge, driver_phys_stat_code1, driver_phys_stat_code2, driver_sex, driver_summons1, driver_summons2, driver_summons3, driver_summons4, unlicensed";
}


// *---------------*
// route schema
// *---------------*
const schema = {
    description: "Gets Accident, Vehicle, Occupant, Ped data in the Detailed Crash Information dialog.",
    tags: ['crash-map'],
    summary: "Gets Accident, Vehicle, Occupant, Ped data in the Detailed Crash Information dialog.",
    querystring: {
        caseNumber: {
            type: 'string',
            description: 'case number. ex: 20-21104-AC',
            default: '20-21104-AC'
        },
        county: {
            type: 'string',
            description: 'county code. ex: 11',
            default: '11'
        },
        municipality: {
            type: 'string',
            description: 'municipality code. ex: 07',
            default: '07'
        },
        year: {
            type: 'string',
            description: 'year the crash occured. ex: 2020',
            default: '2020'
        },
        crashid: {
            type: 'string',
            description: 'crashid of the case. ex: 11-07-2020-20-21104-AC'
        },
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-crash-detail',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server"
                });

                var queryArgs = request.query;
                if (queryArgs.crashid === undefined && queryArgs.caseNumber === undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need crashid or case number and parameters"
                    });
                }
                else if (queryArgs.caseNumber !== undefined) {
                    if (queryArgs.county === undefined || queryArgs.municipality === undefined || queryArgs.year === undefined) {
                        return reply.send({
                            "statusCode": 500,
                            "error": "Internal Server Error",
                            "message": "need county, muni, or year values"
                        });
                    }
                }

                var promises = [];
                var crashData;
                const queries = getQueries(queryArgs);

                for (var key in queries) {
                    const promise = new Promise((resolve, reject) => {
                        try {
                            const res = client.query(queries[key]);
                            return resolve(res);
                        }
                        catch(err) {
                            console.log(err.stack);
                            return reject(error);
                        }  
                    });
                    promises.push(promise);
                }

                Promise.all(promises).then((returnData) => {
                    //console.log(returnData);

                    for (let i = 0; i < returnData.length; i++) {
                        var table = Object.keys(queries)[i];
                        var data = returnData[i].rows;
                        if (table === "accidents") {
                            crashData = transcribeKeys(data[0]);
                            // crashData = data[0];
                        }
                        else {
                            crashData[table] = transcribeKeysArray(data);
                        }
                    }

                    reply.send({ crash: crashData });
                });
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'