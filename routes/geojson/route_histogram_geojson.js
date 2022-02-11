// route query

const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

const sql = (params, query) => {
        let filter = makeCrashFilterQuery(query.filter, 'ard_accidents_geom_partition');
        let parsed_filter = JSON.parse(query.filter)

        let formattedQuery = `
            with crash_data as (
                select
                    sri,
                    rounded_mp,
                    count(*) crash_count
                from ard_accidents_geom_partition
                ${filter.fromClause ? ` ${filter.fromClause}` : ''}
                ${filter.whereClause ? ` where ${filter.whereClause}` : ''}
                group by 1, 2
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
            )

            select json_build_object(
                'start_mp', min(rounded_mp),
                'end_mp', max(rounded_mp),
                'crash_features', array_agg(
                    json_build_object(
                        'properties', crash_data.*
                    )
                ),
                'min_crashes', min(crash_count),
                'max_crashes', max(crash_count),
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
            ) route_metrics from crash_data
        `

        //console.log(formattedQuery);
        return formattedQuery;
}

// route schema
const schema = {
    description: 'Return table as GeoJSON.',
    tags: ['feature'],
    summary: 'return GeoJSON',
    params: {},
    querystring: {
        filter: {
            type: 'string',
            description: 'Optional filter parameters for a SQL WHERE statement.'
        },
        sri: {
            type: 'string',
            description: 'Optional filter parameters for a SQL WHERE statement.'
        }
    }
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/geojson/route-histogram',
        schema: schema,
        handler: function(request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    })

                client.query(sql(request.params, request.query), function onResult(
                    err,
                    result
                ) {
                    release()
                    if (err) {
                        reply.send(err)
                    } else if (result.rows && result.rows.length > 0) {
                        reply.send(result.rows[0].route_metrics)
                    } else {
                        reply.code(204);
                    }
                })
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'