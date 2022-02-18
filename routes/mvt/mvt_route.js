// route query
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

const sql = (params, query) => {
  const accidentsTableName = "ard_accidents_geom_partition"
  try {
    if (query.filter && query.filter !== 'undefined') {
      let parsed_filter = JSON.parse(query.filter)
      let selectedSRI = parsed_filter.sri;

      delete parsed_filter.sri;

      let filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);

      let queryText = `
          with selected_segment_polygons as (
              select 
                  internal_id, 
                  sri, 
                  mp
              from segment_polygon
              where sri = '${selectedSRI}'
              and st_intersects(
                  geom,
                  ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
              )
          ), filtered_crash_data as (
              select 
                  selected_segment_polygons.internal_id,
                  count(*) as crash_count,
                  array_to_json(array_agg(ard_accidents_geom_partition.crashid)) as crash_array
              from ard_accidents_geom_partition
              inner join selected_segment_polygons
              on ard_accidents_geom_partition.sri = selected_segment_polygons.sri
              and ard_accidents_geom_partition.rounded_mp = selected_segment_polygons.mp
              ${filter.fromClause ? ` ${filter.fromClause}` : ''}
              
              -- including the SRI here makes the query MUCH slower
              ${filter ? ` where ${filter.whereClause}` : ''}
              
              group by selected_segment_polygons.internal_id
          ), clipped_results as (
              select 
                  filtered_crash_data.*,
                  segment_polygon.sri,
                  segment_polygon.mp,
                  ST_AsMVTGeom(
                      segment_polygon.geom,
                      ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                  ) as geom
              from filtered_crash_data
              inner join segment_polygon
              on filtered_crash_data.internal_id = segment_polygon.internal_id
          )
          SELECT ST_AsMVT(clipped_results.*, 'segment_polygon', 4096, 'geom', 'internal_id') AS mvt from clipped_results;
  `



      // console.log(queryText);

      return queryText;
    }







  } catch (error) {
    console.error(error);
    // expected output: ReferenceError: nonExistentFunction is not defined
    // Note - error messages will vary depending on browser
  }




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
    },
    sri: {
      type: 'string'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/mvt/route/:z/:x/:y',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err)
          reply.send({
            statusCode: 500,
            error: err,
            message: 'unable to connect to database server'
          })

        try {
          const parsedQuery = sql(request.params, request.query);

          if (parsedQuery) {
            client.query(parsedQuery, function onResult(
              err,
              result
            ) {
              release()
              if (err) {
                reply.send({
                  statusCode: 500,
                  error: err,
                  message: 'query issue'
                })
              } else {
                if (result) {
                  if (result.rows) {
                    if (result.rows.length > 0) {
                      if (result.rows[0].mvt) {
                        const mvt = result.rows[0].mvt
  
                        if (mvt.length === 0) {
                          reply.code(204)
                        } else {
                          reply.header('Content-Type', 'application/x-protobuf').send(mvt)
                        }
                      } else {
                        reply.send({
                          statusCode: 204,
                          message: 'no mvt content'
                        });
                      }
                    } else {
                      reply.send({
                        statusCode: 204,
                        message: 'no row content'
                      });
                    }
                  } else {
                    reply.send({
                      statusCode: 204,
                      message: 'no rows returned'
                    });
                  }
                } else {
                  reply.send({
                    statusCode: 204,
                    message: 'no result returned'
                  });
                }
              }
            })
          } else {
            reply.send({
              statusCode: 500,
              message: 'no query created'
            })
          }

        } catch(error) {
          release()

          console.error(error, request.params, request.query);
          reply.send({
            statusCode: 500,
            message: error
          })
        }

      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'