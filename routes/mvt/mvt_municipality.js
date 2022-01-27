const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

// route query
const sql = (params, query) => {
        const accidentsTableName = 'ard_accidents_geom_partition';
        var whereClause = `${query.filter ? ` ${query.filter}` : ''}`;
  if (query.crashFilter) {
    let parsed_filter = JSON.parse(query.crashFilter);
    let filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);
    whereClause = filter.whereClause;
  } 

    let queryText = `
        with selected_municipalities as (
            select
                ogc_fid,
                mun_cty_co,
                mun_mu,
                mun_label,
                concat(INITCAP(county), ' County'),
                centroid,
                bounding_box,
                ST_AsMVTGeom(
                    geom_simplified,
                    ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                ) as geom
            from municipal_boundaries_of_nj_3857
            where st_intersects(
                geom_simplified,
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
            )
        ), filtered_crash_data as (
            select
                selected_municipalities.mun_cty_co,
                selected_municipalities.mun_mu,
                COUNT(*) crashes
            from selected_municipalities
            left join ard_accidents_geom_partition
            on ard_accidents_geom_partition.mun_cty_co = selected_municipalities.mun_cty_co
            and ard_accidents_geom_partition.mun_mu = selected_municipalities.mun_mu
            ${whereClause ? ` WHERE ${whereClause}` : ''}
            group by selected_municipalities.mun_cty_co, selected_municipalities.mun_mu
        ), clipped_results as (
            select 
                selected_municipalities.*,
                filtered_crash_data.crashes
            from selected_municipalities
            left join filtered_crash_data
            using (mun_cty_co, mun_mu)
        )
        SELECT ST_AsMVT(clipped_results.*, 'municipal_boundaries_of_nj_3857', 4096, 'geom', 'ogc_fid') AS mvt from clipped_results;
    `
  
    //console.log(queryText);
    return queryText;
  }
  
  // route schema
  const schema = {
    description:
      'Return table as Mapbox Vector Tile (MVT) for Muni level',
    tags: ['mvt'],
    summary: 'return Muni MVT',
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