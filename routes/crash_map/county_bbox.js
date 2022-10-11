const sql = (params, query) => {
    let formattedQuery = `
        SELECT bounding_box
            FROM public.county_boundaries_of_nj_3857
            where mun_cty_co = any('{${query.county_list}}'::text[])
    `;

    //console.log(formattedQuery);
    return formattedQuery;
};

// route schema
const schema = {
    description: 'Return table as GeoJSON.',
    tags: ['feature'],
    summary: 'return GeoJSON',
    params: {},
    querystring: {
        county_list: {
            type: 'string',
            description: 'county or counties to find a bounding box for. Example: (string) "01,02,03"'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/bounding_box/county',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'crash_map',
                'county_bbox',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

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
                } 
                else if (request.query.county_list == undefined) {
                    request.tracker.error('county list not submitted');
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'county list not submitted'
                    });
                } 
                else {
                    try {
                        client.query(sql(request.params, request.query), function onResult(err, result) {
                            if (err) {
                                reply.code(500).send(err);
                                request.tracker.error(err);
                                release();
                            }
                            else if (result.rows && result.rows.length > 0) {
                                const initial_bounding_box = JSON.parse(result.rows[0].bounding_box);

                                result.rows.forEach(function (row) {
                                    const contender_bounding_box = JSON.parse(row.bounding_box);
                                    if (contender_bounding_box[0][0] < initial_bounding_box[0][0]) {
                                        initial_bounding_box[0][0] = contender_bounding_box[0][0];
                                    }
                                    if (contender_bounding_box[0][1] < initial_bounding_box[0][1]) {
                                        initial_bounding_box[0][1] = contender_bounding_box[0][1];
                                    }
                                    if (contender_bounding_box[1][0] > initial_bounding_box[1][0]) {
                                        initial_bounding_box[1][0] = contender_bounding_box[1][0];
                                    }
                                    if (contender_bounding_box[1][1] > initial_bounding_box[1][1]) {
                                        initial_bounding_box[1][1] = contender_bounding_box[1][1];
                                    }
                                });

                                reply.send(initial_bounding_box);
                                request.tracker.complete();
                                release();
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
                            error: 'issue with query',
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
