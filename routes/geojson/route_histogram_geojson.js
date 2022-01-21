// route query
const sql = (params, query) => {
        let formattedQuery = `
        with selected_crashes as (
            select sri, milepost, mun_cty_co, mun_mu, count(*) crash_count from ard_accidents_geom_partition
            ${query.filter ? ` where ${query.filter}` : ''}
            group by mun_cty_co, mun_mu, sri, milepost
        ), route_data as (
            select 
                segment_polygons.sri,
                segment_polygons.mp,
                selected_crashes.crash_count,
                segment_polygons.geom
            from selected_crashes
            inner join segment_polygons
            on segment_polygons.sri = selected_crashes.sri
            and segment_polygons.mp = selected_crashes.milepost
            where milepost is not null
        )

        select json_build_object(
            'bbox', array[array[min(ST_XMin(st_transform(geom, 4326))), min(ST_YMin(st_transform(geom, 4326)))], array[max(ST_XMax(st_transform(geom, 4326))), max(ST_YMax(st_transform(geom, 4326)))]],
            'min_crashes', min(crash_count),
            'max_crashes', max(crash_count)
        ) route_metrics from route_data
`
    console.log(formattedQuery);
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
        }
    }
}

// create route
module.exports = function(fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/geojson/routeHistogram',
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

module.exports.autoPrefix = '/'