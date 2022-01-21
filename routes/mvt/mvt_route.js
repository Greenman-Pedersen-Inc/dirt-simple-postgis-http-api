// route query
const sql = (params, query) => {
        let queryText = `
            with segment_data as (
                select sri, mp from segment_polygons
                where sri = ${query.sri}
                and st_intersects(
                    geom,
                    ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                )
            ), filtered_crash_data as (
                select 
                    segment_data.internal_id,
                    ard_accidents_geom_partition.sri,
                    ard_accidents_geom_partition.milepost
                    count(*)
                from ard_accidents_geom_partition
                inner join segment_data
                on ard_accidents_geom_partition.sri = segment_data.sri
                and ard_accidents_geom_partition.milepost = segment_data.mp

                -- including the SRI here makes the query MUCH slower
                ${query.filter ? ` where ${query.filter}` : ''}

                group by segment_data.internal_id, ard_accidents_geom_partition.sri, ard_accidents_geom_partition.milepost
            ), clipped_results as (
                select 
                    filtered_crash_data.*,
                    ST_AsMVTGeom(
                        geom,
                        ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                    ) as geom
                from filtered_crash_data
                inner join segment_data
                on filtered_crash_data.sri = segment_data.sri
                and filtered_crash_data.milepost = segment_data.mp
            )

            SELECT ST_AsMVT(clipped_results.*, 'segment_polygons', 4096, 'geom') AS mvt from clipped_results;
    `
  
    // console.log(queryText);
    
    return queryText;
  }
  
  // route schema
  const schema = {
    description:
      'Return table as Mapbox Vector Tile (MVT) for route level',
    tags: ['mvt'],
    summary: 'return route MVT',
    params: {
      z: {
        type: 'integer',
        description: 'Z value of ZXY tile.'
      },
      x: {
        type: 'integer',
        description: 'X value of ZXY tile.'
      },
      y: {
        type: 'integer',
        description: 'Y value of ZXY tile.'
      }
    },
    querystring: {
      geom_column: {
        type: 'string',
        description: 'Optional geometry column of the table..',
        default: 'wkb_geometry'
      },
      columns: {
        type: 'string',
        description:
          'Optional columns to return with MVT. The default is no columns.'
      },
      id_column: {
        type: 'string',
        description:
          'Optional id column name to be used with Mapbox GL Feature State. This column must be an integer a string cast as an integer.'
      },
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
      url: '/mvt/municipality/:z/:x/:y',
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
            } else {
              const mvt = result.rows[0].mvt
              if (mvt.length === 0) {
                reply.code(204)
              }
              reply.header('Content-Type', 'application/x-protobuf').send(mvt)
            }
          })
        }
      }
    })
    next()
  }
  
  module.exports.autoPrefix = '/v1'