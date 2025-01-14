// get_cluster_detail: Gets all cases within a list of crash identifiers
const { transcribeKeysArray } = require('../../helper_functions/code_translations/translator_helper');

// *---------------*
// route query
// *---------------*
const sql = (body) => {
    const crashValues = `'${JSON.parse(body.crash_array).join("','")}'`;
    const njtr1Root = 'https://voyagernjtr1.s3.amazonaws.com/';
    const sql = `
            select 
                crashid, 
                acc_case,
                calc_latitude,
                calc_longitude,
                sri,
                milepost,
                mun_cty_co,
                mun_mu,
                acc_dow,
                crash_type,
                -- dln, -- removed per client request
                environ_cond_code,
                light_cond_code,
                no_injured,
                no_killed,
                ped_injured,
                ped_killed,
                ramp_direction,
                road_char_code,
                road_median_code,
                road_surf_code,
                route_sx,
                surf_cond_code,
                tot_veh_involved,
                year
                -- CASE -- removed per client request
                --     WHEN crash_data.directory IS NOT NULL OR directory <> '' THEN CONCAT('${njtr1Root}', directory, '/', dln, '.PDF') 
                --     ELSE NULL
                -- END AS URL
            FROM ard_accidents_geom_partition
            WHERE crashid in (${crashValues})
        `;

    // console.log(sql);
    return sql;
};

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Gets all cases within a crash cluster.',
    tags: ['crash-map'],
    summary: 'Gets all crashes enumerated within a crash cluster.',
    body: {
        type: 'object',
        properties: {
            crash_array: { type: 'string' }
        },
        required: ['crash_array']
    }
};

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'POST',
        url: '/crash',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'crash_map',
                'get_crash',
                JSON.stringify(request.query),
                reply
            );

            function onConnect(err, client, release) {
                request.tracker.start();

                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                } else if (request.body.crash_array == undefined) {
                    request.tracker.error('need a crash_array value');
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need a crash_array value'
                    });
                } else {
                    try {
                        client.query(sql(request.body), function onResult(err, result) {
                            if (err) {
                                reply.code(500).send(err);
                                request.tracker.error(err);
                                release();
                            }
                            else if (result && result.rows) {
                                request.tracker.complete();
                                release();
                                reply.send(result.rows);
                            } 
                            else {
                                reply.code(204);
                                release();
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

            fastify.pg.connect(onConnect);
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
