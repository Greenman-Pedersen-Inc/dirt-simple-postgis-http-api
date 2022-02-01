const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// route query
// require the funciton 
const sql = (params, query) => {
  const accidentsTableName = 'ard_accidents_geom_partition';
  var whereClause = `${query.filter ? ` ${query.filter}` : ''}`;
  var fromClause = '';
  if (query.crashFilter) {
    let parsed_filter = JSON.parse(query.crashFilter);
    let filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    whereClause = filter.whereClause;
    fromClause = filter.fromClause;
  } 

  let queryText = `
        with selected_counties as (
            select
                ogc_fid,
                mun_cty_co,
                county_label,
                centroid,
                bounding_box,
                ST_AsMVTGeom(
                    geom_simplified,
                    ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                ) as geom
            from county_boundaries_of_nj_3857
            where st_intersects(
                geom_simplified,
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
            )
        ), filtered_crash_data as (
            select
                ard_accidents_geom_partition.mun_cty_co, 
                COUNT(*) crashes
            from selected_counties
            INNER JOIN ard_accidents_geom_partition
            ON ard_accidents_geom_partition.mun_cty_co = selected_counties.mun_cty_co
            ${fromClause ? ` ${fromClause}` : ''}
            ${whereClause ? ` WHERE ${whereClause}` : ''}
            group by ard_accidents_geom_partition.mun_cty_co
        ), clipped_results as (
            select 
                CASE 
                  WHEN filtered_crash_data.crashes > 0 THEN filtered_crash_data.crashes
                  WHEN filtered_crash_data.crashes IS NULL THEN 0
                  ELSE 0
                END AS crashes,
                selected_counties.*
            from selected_counties
            left join filtered_crash_data
            using (mun_cty_co)
        )
        SELECT ST_AsMVT(clipped_results.*, 'county_boundaries_of_nj_3857', 4096, 'geom', 'ogc_fid') AS mvt from clipped_results;
    `
<<<<<<< HEAD

    // console.log(queryText);

=======
    //console.log(queryText);
>>>>>>> 30d25332dc22cad2453923eb2fa3831ea6699089
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