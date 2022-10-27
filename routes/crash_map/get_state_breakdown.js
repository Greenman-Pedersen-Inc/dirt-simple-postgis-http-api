/* 
get_sri_breakdown: Gets a list of number of crashes grouped by crash attribute code
*/

const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');
const customTimeout = 15000;

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    // if target_milepost is defined, set start_mp and end_mp in the crashFilter object
    const accidentsTableName = 'ard_accidents_geom_partition';
    let filterJson = JSON.parse(queryArgs.selected_filters);

    delete filterJson.sri;
    delete filterJson.mp_start;
    delete filterJson.mp_end;
    delete filterJson.milepost;

    const crashFilterClauses = makeCrashFilterQuery(filterJson, accidentsTableName);

    const sql = `
            SELECT ${queryArgs.breakdown_field} as code_value, COALESCE(COUNT(*), 0) as crash_count
            FROM ${accidentsTableName} ${crashFilterClauses.fromClause} 
            WHERE ${queryArgs.breakdown_field} IS NOT NULL
            ${crashFilterClauses.whereClause ? ` AND ${crashFilterClauses.whereClause}` : ''}
            GROUP BY ${queryArgs.breakdown_field}
            ORDER BY ${queryArgs.breakdown_field}
        `;

    // console.log(sql);

    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Gets a list of all crash cases within a specified milepost and crash filter.',
    tags: ['crash-map'],
    summary:
        'Gets a list of all crash cases within a specified milepost and crash filter. The crash filter should have the SRI if the milepost attribute is specified.',
    querystring: {
        selected_filters: {
            type: 'string',
            description:
                'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        },
        breakdown_field: {
            type: 'string',
            description: `"crash_type","surf_cond_code","road_median_code","year","acc_dow","environ_cond_code","road_char_code","surf_cond_code","dept_num","ramp_direction","light_cond_code"`,
            default: 'crash_type'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-state-breakdown',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'crash_map',
                'get_state_breakdown',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                request.tracker.start();
                client.connectionParameters.query_timeout = customTimeout;

                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (request.query.selected_filters == undefined) {
                    request.tracker.error('crash filter not submitted');
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'crash filter not submitted'
                    });
                } else if (request.query.breakdown_field == undefined) {
                    request.tracker.error('breakdown field not submitted');
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'breakdown field not submitted'
                    });
                } else {
                    try {
                        client.query(sql(request.query), function onResult(err, result) {
                            if (err) {
                                reply.code(500).send(err);
                                request.tracker.error(err);
                                release();
                            } else if (result && result.rows) {
                                request.tracker.complete();
                                release();
                                reply.send(result.rows);
                            } else {
                                request.tracker.error('no rows returned');
                                release();
                                reply.send({
                                    statusCode: 204,
                                    error: 'no data returned',
                                    message: request
                                });
                            }
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
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
