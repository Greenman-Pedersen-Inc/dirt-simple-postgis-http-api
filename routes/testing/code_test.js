const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    const crashFilterClauses = makeCrashFilterQuery(queryArgs.crashFilter);
    //console.log(crashFilterClauses)

    // const returnQuery = `
    //     SELECT ${selectQuery}
    //     FROM ${crashFilterClauses.fromClause} ${additionalFromClause}
    //     WHERE ${crashFilterClauses.whereClause} ${additionalWhereClause}
    //     ${groupByClause ? ` GROUP BY ${groupByClause}`: ''}
    //     ${orderByClause ? ` ORDER BY ${orderByClause}`: ''}
    // `;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'code test',
    tags: ['test'],
    summary: 'code test.',
    querystring: {
        crashFilter: {
            type: 'string',
            description: 'stringified JSON of crash filter object',
            default: `{"intersection": "Y", "driver_phys_apptly_nrml": 1, "mun_cty_co": "01,04", 
                        "date_range": "2020-1-1;2021-1-31", "time_range": "0745;1320", "start_mp": 2, 
                        "end_mp": 15.4, "calc_sri": "__0000001", "contr_circum_code_pedestrians": "71,72"}`
        }
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/test/code-test',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });

                var queryArgs = request.query;
                if (queryArgs.crashFilter == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need crashFilter string'
                    });
                }

                sql(queryArgs);
                release();
                // client.query(
                //     sql(queryArgs),
                //     function onResult(err, result) {
                //         release()
                //         //reply.send(err || {Crashes: result.rows})
                //     }
                // )
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
