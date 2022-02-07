// route query
const { makeCrashFilterQuery } = require('../../helper_functions/crash_filter_helper');

const sql = (params, query) => {
        const accidentsTableName = "ard_accidents_geom_partition"
        let parsed_filter = JSON.parse(query.filter)
        let selectedSRI = parsed_filter.sri;

        delete parsed_filter.sri;

        let filter = makeCrashFilterQuery(parsed_filter, accidentsTableName);

        let queryText = `
        with juridiction_polygons as (
            select 
                internal_id,
                mun_cty_co,
                mun_mu,
                sri,
                CONCAT(county_name, 'County') as county_name,
                muni_name,
                ST_AsMVTGeom(
                    geom,
                    ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
                ) as geom
            from route_municipal_buffer
            where sri = '${selectedSRI}'
            and st_intersects(
                geom,
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
            )
        ), filtered_crash_data as (
            select 
                juridiction_polygons.internal_id,
                count(*) as crash_count
            from ard_accidents_geom_partition
            inner join juridiction_polygons
            on ard_accidents_geom_partition.sri = juridiction_polygons.sri
            and ard_accidents_geom_partition.mun_cty_co = juridiction_polygons.mun_cty_co
            and ard_accidents_geom_partition.mun_mu = juridiction_polygons.mun_mu
            where milepost is null
            
            -- including the SRI here makes the query MUCH slower
            ${filter ? ` AND ${filter.whereClause}` : ''}
            
            group by juridiction_polygons.internal_id
        ), clipped_results as (
            select
                filtered_crash_data.crash_count,
                juridiction_polygons.*
            from juridiction_polygons
            left join filtered_crash_data
            on filtered_crash_data.internal_id = juridiction_polygons.internal_id
        )
        SELECT ST_AsMVT(clipped_results.*, 'route_municipal_buffer', 4096, 'geom', '${query.id_column}') AS mvt from clipped_results;
`

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
  },
  sri: {
      type: 'string'
  }
}
}

// create route
module.exports = function(fastify, opts, next) {
fastify.route({
  method: 'GET',
  url: '/mvt/route-unmatched/:z/:x/:y',
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