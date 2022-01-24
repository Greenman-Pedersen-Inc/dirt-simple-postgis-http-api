const {makeCrashFilterQuery} = require('../../helper_functions/crash_filter_helper');

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
      with complete_data as(
        with crash_data as (
            SELECT geom
            FROM ard_accidents_geom_partition
            WHERE ST_Intersects(geom, ST_Transform(ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}), 4326))
            -- Optional filter for the query input
            ${whereClause ? ` AND ${whereClause}` : ''}
        ), crash_count as (
    select count(*) from crash_data
    union all
    select ${22 - params.z}
  
  )
        SELECT
            -- kmean,
            count(*) as crashes,
            ST_SetSRID(ST_Extent(geom_center), 4326) as bbox,
            ST_AsMVTGeom(
                ST_Transform(ST_SetSRID(ST_Centroid(ST_Extent(geom_center)), 4326), 3857),
                ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
            ) as geom
        FROM
        (
            -- Number indicates how many clusters should be created.
            SELECT ST_ClusterKMeans(geom, (select min(count) from crash_count)::INTEGER) OVER() AS kmean, ST_Centroid(geom) as geom_center
            FROM crash_data
        ) tsub
        GROUP BY kmean
    )
    SELECT ST_AsMVT(complete_data.*, 'ard_accidents_geom_partition', 4096, 'geom') AS mvt from complete_data;

`


  console.log(queryText);
  return queryText;
}

// route schema
const schema = {
  description:
    'Return table as Mapbox Vector Tile (MVT) for Cluster level',
  tags: ['mvt'],
  summary: 'return Cluster MVT',
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
    },
    crashFilter: {
      type: 'string',
      description: 'stringified JSON of crash filter object. ex: {"mp_start": "0", "mp_end": "11.6", "year": "2017,2018,2019", "contr_circum_code_vehicles": "01"}'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/mvt/cluster/:z/:x/:y',
    schema: schema,
    handler: function (request, reply) {
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