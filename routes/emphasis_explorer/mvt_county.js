const customTimeout = 10000;

// route query
const sql = (params, query) => {
  let queryText = `
      WITH mvtgeom as (
        SELECT
          ST_AsMVTGeom (
            ST_Transform(county_data.${query.geom_column}, 3857),
            ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
          ) as geom,
          county_data.county, 
          crash_data.mun_cty_co, 
          SUM(crashes)::INTEGER crashes
        FROM
          ${params.table} crash_data LEFT JOIN public.county_boundaries_of_nj county_data
          ON crash_data.mun_cty_co = county_data.mun_cty_co,
          (SELECT ST_SRID(${query.geom_column}) AS srid FROM public.county_boundaries_of_nj LIMIT 1) a
        WHERE
          ST_Intersects(
            county_data.${query.geom_column},
            ST_Transform(
              ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}),
              srid
            )
          )
  
          -- Optional Filter
          ${query.filter ? ` AND ${query.filter}` : ''}
      )
      SELECT ST_AsMVT(mvtgeom.*, '${params.table}', 4096, 'geom' ${query.id_column ? `, '${query.id_column}'` : ''}) AS mvt from mvtgeom;
    `

  // console.log(queryText);

  return queryText;
}

// route schema
const schema = {
  description:
    'Return table as Mapbox Vector Tile (MVT) for County level',
  tags: ['feature'],
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
      description: 'Optional geometry column of the table. The default is geom.',
      default: 'geom'
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
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/emphasis-explorer/mvt-county/:table/:z/:x/:y',
    schema: schema,
    handler: function (request, reply) {
      request.tracker = new fastify.RequestTracker(
        request.headers,
        'emphasis_explorer',
        'mvt_county',
        JSON.stringify(Object.assign(request.query, request.params)),
        reply
      );

      fastify.pg.connect(onConnect);

      function onConnect(err, client, release) {
        request.tracker.start();
        client.connectionParameters.query_timeout = customTimeout;

        if (err) {
          request.tracker.error(err);
          release();
          reply.send({
            statusCode: 500,
            error: 'Internal Server Error',
            message: 'unable to connect to database server'
          });
        }
        else {
          try {
            client.query(sql(request.params, request.query), function onResult(err, result) {
              if (err) {
                reply.code(500).send(err);
                request.tracker.error(err);
                release();
              }
              else {
                const mvt = result.rows[0].mvt
                if (mvt.length === 0) {
                  reply.code(204)
                }

                request.tracker.complete();
                reply.header('Content-Type', 'application/x-protobuf').send(mvt);
                release();
              }
            });
          }
          catch (error) {
            reply.code(500).send(error);
            request.tracker.error(error);
            release();
          }
        }
      }
    }
  });
  next();
}

module.exports.autoPrefix = '/v1'
