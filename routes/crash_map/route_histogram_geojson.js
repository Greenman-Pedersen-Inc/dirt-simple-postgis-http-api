// route query

const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

const sql = (params, query) => {
    let filter = makeCrashFilterQuery(query.filter, 'ard_accidents_geom_partition');
    let parsed_filter = JSON.parse(query.filter);

    let formattedQuery = `
            with crash_data as (
                select
                    sri,
                    rounded_mp,
                    county_name,
                    muni_name,
                    CASE 
                        WHEN rounded_mp IS NULL THEN CONCAT('No MP (', muni_name, ' - ', county_name, ')')
                        ELSE rounded_mp::TEXT
                    END as rounded_mp_text,
                    count(*) crash_count
                from ard_accidents_geom_partition
                INNER JOIN ard_cty_muni
                on ard_accidents_geom_partition.mun_cty_co = ard_cty_muni.county_code
                and ard_accidents_geom_partition.mun_mu = ard_cty_muni.muni_code
                ${filter.fromClause ? ` ${filter.fromClause}` : ''}
                ${filter.whereClause ? ` AND  ${filter.whereClause}` : ''}
                group by 1, 2, 3, 4
            ), 
            route_data as (
                select 
                    mp, geom
                from segment_polygon
                where sri = '${parsed_filter.sri}'
            ), 
            start_mp_coordinates as (
                select ST_AsGeoJSON(st_transform(st_centroid(geom), 4326)) geom_text
                from route_data
                where route_data.mp in (select min(rounded_mp) from crash_data)
            ), 
            end_mp_coordinates as (
                select ST_AsGeoJSON(st_transform(st_centroid(geom), 4326)) geom_text
                from route_data
                where route_data.mp = (select max(rounded_mp) from crash_data)
            ),
            histogram_data AS (
                select sri, rounded_mp, rounded_mp_text, SUM(crash_count) AS crash_count from crash_data 
                group by sri, rounded_mp, rounded_mp_text
                ORDER BY SUBSTRING(rounded_mp_text FROM '([0-9]+)')::BIGINT ASC, rounded_mp_text -- do this ordering so that text numbers get sorted correctly
            )
            
            select json_build_object(
                'crash_features', array_agg(
                    json_build_object(
                        'properties', histogram_data.*
                    )
                ),
                'start_mp', min(rounded_mp),
                'end_mp', max(rounded_mp),
                'min_crashes', (select min(crash_count) from histogram_data where rounded_mp_text NOT LIKE 'No MP%'),
                'max_crashes', (select max(crash_count) from histogram_data where rounded_mp_text NOT LIKE 'No MP%'),
                'start_mp_point', (
                    select
                        CASE
                            when count(*) > 0 THEN (select geom_text from start_mp_coordinates limit 1)
                            else (
                                SELECT ST_AsGeoJSON(st_transform(st_centroid(geom), 4326))
                                from route_data
                                order by mp
                                limit 1
                            )::text
                        END
                    from start_mp_coordinates
                ),
                'end_mp_point', (
                    select
                        CASE
                            when count(*) > 0 THEN (select geom_text from end_mp_coordinates limit 1)
                            else (
                                SELECT ST_AsGeoJSON(st_transform(st_centroid(geom), 4326))
                                from route_data
                                order by mp desc
                                limit 1
                            )::text
                        END
                    from end_mp_coordinates
                ),
                'segments', count(*)
            ) route_metrics from histogram_data
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
        filter: {
            type: 'string',
            description: 'Required filter parameters for a SQL WHERE statement.'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/geojson/route-histogram',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const queryArgs = request.query;

            function onConnect(err, client, release) {
                if (err) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: err,
                        message: 'unable to connect to database server'
                    });
                } else if (queryArgs.filter == undefined) {
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'crash filter not submitted'
                    });
                } else {
                    try {
                        client.query(sql(request.params, request.query), function onResult(err, result) {
                            release();
                            if (err) {
                                reply.send({
                                    statusCode: 500,
                                    error: err,
                                    message: 'unable to connect to database server'
                                });
                            } else if (result.rows && result.rows.length > 0) {
                                reply.send(result.rows[0].route_metrics);
                            } else {
                                reply.code(204);
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
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
