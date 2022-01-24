const {makeCrashFilterQuery} = require('../../helper_functions/crash_filter_helper');

// route query
// require the funciton 
const sql = (params, query) => {
  const accidentsTableName = 'ard_accidents_geom_partition';
  var whereClause = `${query.filter ? ` ${query.filter}` : ''}`;
  if (query.crashFilter) {
    let parsed_filter = JSON.parse(query.crashFilter);
    let filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    whereClause = filter.whereClause;
  } 

  let queryText = `
  with complete_data as(
    select 
        intersected_crash_data.*,
        format_array(boundary_join.centroid) as centroid,
        ST_AsMVTGeom(
            boundary_join.wkb_geometry,
            ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
        ) as geom
        from (
            select
            ard_accidents_geom_partition.mun_cty_co, 
                COUNT(crashid)::INTEGER crashes
            from county_boundaries_of_nj_3857 boundary_data
            left join ard_accidents_geom_partition
            on ard_accidents_geom_partition.mun_cty_co = boundary_data.mun_cty_co
            where st_intersects(
                wkb_geometry,
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
            )
            ${whereClause ? ` AND ${whereClause}` : ''}
            group by ard_accidents_geom_partition.mun_cty_co
        ) as intersected_crash_data
        left join county_boundaries_of_nj_3857 boundary_join
        on intersected_crash_data.mun_cty_co = boundary_join.mun_cty_co
    )
    SELECT ST_AsMVT(complete_data.*, 'ard_accidents_geom_partition', 4096, 'geom') AS mvt from complete_data;
`

console.log(queryText);

return queryText;
}
  
  // route schema
  const schema = {
    description:
      'Return table as Mapbox Vector Tile (MVT) for County level',
    tags: ['mvt'],
    summary: 'return County MVT',
    params: {
      table: {
        type: 'string',
        description: 'The name of the table or view.'
      },
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
        description: 'Optional geometry column of the table.',
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
      crashFilter: {
        type: 'string',
        description: 'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
      }, 
    }
  }
  
  // create route
  module.exports = function(fastify, opts, next) {
    fastify.route({
      method: 'GET',
      url: '/mvt/county/:z/:x/:y',
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
  