// route query
const sql = (params, query) => {

    // let query_parameters = JSON.parse(query.filter.replace( "'", '%27' ));
    // let selected_sri = query_parameters.sri;

    // delete query_parameters.sri;

    // console.log(new URLSearchParams(query_parameters).toString())


    let formattedQuery = `
        with selected_crashes as (
            select 
                sri, 
                milepost,
                count(*) crash_count 
            from ard_accidents_geom_partition
            ${query_parameters ? ` where ${query.filter.replace('&', ' and ')}` : ''}
            group by sri, milepost
        ), route_data as (
            select 
                array[array[min(ST_XMin(st_transform(geom, 4326))), min(ST_YMin(st_transform(geom, 4326)))], array[max(ST_XMax(st_transform(geom, 4326))), max(ST_YMax(st_transform(geom, 4326)))]]
            from segment_polygons
            where sri = '${query_parameters.sri}'
        )

        select json_build_object(
            'features', 
				json_agg(
					json_build_object(
						'sri', sri,
						'milepost', milepost,
						'crashes', crash_count
					)
				),
            'bbox', (select * from route_data),
            'min_crashes', min(crash_count),
            'max_crashes', max(crash_count),
            'segments', count(*)
        ) route_metrics from selected_crashes
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