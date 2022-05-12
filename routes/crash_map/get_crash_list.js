/* 
get_crash_list: Gets a list of all crash cases within a specified milepost and crash filter. 
The crash filter should have the SRI if the milepost attribute is specified. 
*/

const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    // if target_milepost is defined, set start_mp and end_mp in the crashFilter object
    const accidentsTableName = 'ard_accidents_geom_partition';
    let filterJson = JSON.parse(queryArgs.crashFilter);

    if (queryArgs.target_sri) {
        filterJson.sri = queryArgs.target_sri;

        if (queryArgs.target_milepost) {
            filterJson.mp_start = queryArgs.target_milepost;
            filterJson.mp_end = parseFloat(queryArgs.target_milepost) + 0.1;
        }
    }

    const crashFilterClauses = makeCrashFilterQuery(filterJson, accidentsTableName);
    const njtr1Root = 'https://voyagernjtr1.s3.amazonaws.com/';

    var sql = `
    SELECT *, directory as report_directory,
    CASE 
        WHEN directory IS NOT NULL OR directory <> '' THEN CONCAT('${njtr1Root}', directory, '/', dln, '.PDF') 
        ELSE NULL
    END AS "URL"
    FROM ${accidentsTableName} ${crashFilterClauses.fromClause} 
    ${crashFilterClauses.whereClause ? ` WHERE ${crashFilterClauses.whereClause}` : ''}
    ORDER BY milepost
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
        crashFilter: {
            type: 'string',
            description:
                'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
        },
        target_milepost: {
            type: 'string',
            description: 'specific milepost to be query. ex: 11.4'
        },
        target_sri: {
            type: 'string',
            description: 'specific SR to be query. ex: 00000012__'
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/crash-map/get-crash-list',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const queryArgs = request.query;

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.crashFilter == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'crash filter not submitted'
                    });
                } else if (queryArgs.target_sri == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'target sri is not defined.'
                    });
                } else if (queryArgs.target_milepost == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'target mp is not defined.'
                    });
                } else {
                    try {
                        client.query(sql(queryArgs), function onResult(err, result) {
                            release();
                            if (result) {
                                if (result.hasOwnProperty('rows')) {
                                    reply.send({ CrashList: transcribeKeysArray(result.rows) });
                                } else {
                                    reply.send({
                                        statusCode: 500,
                                        error: 'no rows returned',
                                        message: request
                                    });
                                }
                            } else {
                                reply.send({
                                    statusCode: 500,
                                    error: 'no data returned',
                                    message: request
                                });
                            }
                        });
                    } catch (error) {
                        release();

                        reply.send({
                            statusCode: 500,
                            error: error,
                            message: request
                        });
                    }
                }
            }

            fastify.pg.connect(onConnect);
        },
        onRequest: async (req, res) => {
            req.controller = new AbortController();
            res.raw.setTimeout(typeof customTimeout == 'undefined' ? fastify.globalTimeout : customTimeout, () => {
                req.controller.abort();
                res.send(new Error('Server Timeout'));
                res.send = (payload) => res;
            });
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
