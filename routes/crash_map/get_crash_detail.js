// get_crash_detail: Gets Accident, Vehicle, Occupant, Ped data in the Detailed Crash Information dialog

const { transcribeKeys, transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { viewableAttributes } = require('../../helper_functions/code_translations/accidents');
const customTimeout = 10000;

// *---------------*
// route query
// *---------------*
function getQueries(queryArgs) {
    var queries = {};
    queries.accidents = `SELECT ${viewableAttributes.join(', ')} FROM ard_accidents_geom_partition where ${getWhereClause(queryArgs, 'accidents')}`; // ACCIDENTS query
    queries.vehicles = `SELECT ${getColumns('vehicles')} FROM ard_vehicles_partition where ${getWhereClause(
        queryArgs,
        'vehicles'
    )}`; // Vehicles query
    queries.drivers = `SELECT ${getColumns('drivers')} FROM ard_vehicles_partition where ${getWhereClause(
        queryArgs,
        'vehicles'
    )}`; // drivers query
    queries.occupants = `SELECT * FROM ard_occupants_partition where ${getWhereClause(queryArgs, 'occupants')}`; // Occupants query
    queries.pedestrians = `SELECT * FROM ard_pedestrians_partition where ${getWhereClause(queryArgs, 'pedestrians')}`; // Pedestrians query
    return queries;
}

function getWhereClause(queryArgs, table) {
    if (queryArgs.crashid) { 
        var queryString =  `crashid = '${queryArgs.crashid}'`;
        if (queryArgs.year) {
            if (table === 'accidents') {
                queryString += ` and year ='${queryArgs.year}'`;
            }
            else if (table === 'vehicles' || table === 'pedestrians') {
                queryString += ` and acc_year ='${queryArgs.year}'`;
            }
            else if (table === 'occupants') {
                queryString += ` and veh_acc_year ='${queryArgs.year}'`;
            }
        }
        return queryString;
        
    }
    
    if (table === 'accidents') {
        return `mun_cty_co = '${queryArgs.county}' and mun_mu = '${queryArgs.municipality}' and acc_case = '${queryArgs.caseNumber}' and year ='${queryArgs.year}'`;
    } else if (table === 'vehicles' || table === 'pedestrians') {
        return `acc_mun_cty_co = '${queryArgs.county}' and acc_mun_mu = '${queryArgs.municipality}' and acc_acc_case = '${queryArgs.caseNumber}' and acc_year ='${queryArgs.year}'`;
    } else if (table === 'occupants') {
        return `veh_acc_mun_cty_co = '${queryArgs.county}' and veh_acc_mun_mu = '${queryArgs.municipality}' and veh_acc_acc_case = '${queryArgs.caseNumber}' and veh_acc_year ='${queryArgs.year}'`;
    }
}

function getColumns(dataType) {
    if (dataType === 'vehicles')
        return 'id, extent_damage_code, initial_impact, principal_damage, towed, removed_by, removed_to, special_veh_code, veh_use_code, veh_weight_rating, type_code, make, model, cargo_body_code, color, contr_circum_code1, contr_circum_code2, first_event_code, second_event_code, third_event_code, fourth_event_code, pre_crash_type, traf_cntrl_code, flg_drive_left_tow, flg_hit_run, flg_imp_disabled, flg_parked, flg_resp_emergency, hazmat_class, hazmat_placard, hazmat_status';
    else if (dataType === 'drivers')
        return 'id, driver_alc_result, driver_alc_test, driver_alc_type, cell_use_code, driver_charge1, driver_charge2, driver_charge3, driver_charge4, driver_multi_charge, driver_phys_stat_code1, driver_phys_stat_code2, driver_sex, driver_summons1, driver_summons2, driver_summons3, driver_summons4, unlicensed';
}

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Gets Accident, Vehicle, Occupant, Ped data in the Detailed Crash Information dialog.',
    tags: ['crash-map'],
    summary: 'Gets Accident, Vehicle, Occupant, Ped data in the Detailed Crash Information dialog.',
    querystring: {
        caseNumber: {
            type: 'string',
            description: 'case number',
            example: '20-21104-AC'
        },
        county: {
            type: 'string',
            description: 'county code',
            example: '11'
        },
        municipality: {
            type: 'string',
            description: 'municipality code',
            example: '07'
        },
        year: {
            type: 'string',
            description: 'year the crash occurred',
            example: '2020'
        },
        crashid: {
            type: 'string',
            description: 'crashid of the case',
            example: '11-07-2020-20-21104-AC'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-crash-detail',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'crash_map',
                'get_crash_detail',
                JSON.stringify(request.query),
                reply
            );

            const queryArgs = request.query;
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                client.connectionParameters.query_timeout = customTimeout;

                request.tracker.start();

                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.caseNumber === undefined) {
                    if (queryArgs.crashid === undefined) {
                        request.tracker.error('need crashid');
                        release();
                        reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'need crashid'
                        });
                    }
                } else if (queryArgs.caseNumber !== undefined) {
                    if (
                        queryArgs.county === undefined ||
                        queryArgs.municipality === undefined ||
                        queryArgs.year === undefined
                    ) {
                        request.tracker.error('need county, muni, or year values');
                        release();
                        return reply.send({
                            statusCode: 500,
                            error: 'Internal Server Error',
                            message: 'need county, muni, or year values'
                        });
                    }
                }
                try {
                    let promises = [];
                    let crashData;
                    const queries = getQueries(queryArgs);

                    for (var key in queries) {
                        const promise = new Promise((resolve, reject) => {
                            try {
                                const res = client.query(queries[key]);
                                return resolve(res);
                            } catch (err) {
                                // console.log(err.stack);
                                return reject(error);
                            }
                        });
                        promises.push(promise);
                    }

                    Promise.all(promises)
                        .then((returnData) => {
                            for (let i = 0; i < returnData.length; i++) {
                                let table = Object.keys(queries)[i];
                                let data = returnData[i].rows;
                                if (table === 'accidents') {
                                    crashData = transcribeKeys(data[0]);
                                } else {
                                    crashData[table] = transcribeKeysArray(data);
                                }
                            }
                            request.tracker.complete();
                            release();
                            reply.send(crashData);
                        })
                        .catch((error) => {
                            request.tracker.error(error);
                            release();
                            reply.send({
                                statusCode: 500,
                                error: error,
                                message: 'issue with crash id queries'
                            });
                        });
                } catch (error) {
                    request.tracker.error(error);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: error,
                        message: request
                    });
                }
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
