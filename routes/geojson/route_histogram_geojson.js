// route query
const sql = (params, query) => {
    let formattedQuery = `
        SELECT json_build_object(
            'type', 'FeatureCollection',
            'crs',  json_build_object(
                'type',      'name', 
                'properties', json_build_object(
                    'name', 'EPSG:4326'  
                )
            ), 
            'features', json_agg(
                json_build_object(
                    'type',       'Feature',
                    'geometry',   ST_AsGeoJSON(geom)::json,
                    'properties', json_build_object(
                        'sri', sri,
                        'mile_post', mp,
                        'crashes', crashes
                    )
                )
            )
        ) as geojson
        FROM (
            SELECT
                grouped_crash_data.*,
                ST_Transform(geometry_join.geom, 4326) as geom
            FROM (
                SELECT segment_polygons.sri, segment_polygons.mp, count(*) as crashes from segment_polygons
                left join ard_accidents_geom_partition
                on segment_polygons.sri = ard_accidents_geom_partition.calc_sri
                and segment_polygons.mp = ard_accidents_geom_partition.calc_milepost
                where segment_polygons.sri = '${params.sri}'
                ${query.filter ? ` AND ${query.filter}` : ''}
                group by segment_polygons.sri, segment_polygons.mp
            ) grouped_crash_data
            left join segment_polygons geometry_join
            on geometry_join.sri = grouped_crash_data.sri
            and geometry_join.mp = grouped_crash_data.mp
        ) features
    `
    console.log(formattedQuery);
    return formattedQuery;
}

// route schema
const schema = {
    description: 'Return table as GeoJSON.',
    tags: ['feature'],
    summary: 'return GeoJSON',
    params: {
        sri: {
            type: 'string',
            description: 'Name of the route that will be used for query.</em>'
        }
    },
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
      url: '/routeHistogram/:sri',
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
                reply.send(result.rows[0].geojson)
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