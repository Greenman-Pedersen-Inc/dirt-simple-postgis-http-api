// route query
const sql = (params, query) => {
        let query_text = `
    WITH mvtgeom as (
      SELECT
        ST_AsMVTGeom (
          ST_Transform(${query.geom_column}, 3857),
          ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
        ) as geom
        ${query.columns ? `, ${query.columns}` : ''}
        ${query.id_column ? `, ${query.id_column}` : ''}
      FROM
        ${params.table},
        (SELECT ST_SRID(${query.geom_column}) AS srid FROM ${
    params.table
  } LIMIT 1) a
      WHERE
        ST_Intersects(
          ${query.geom_column},
          ST_Transform(
            ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}),
            srid
          )
        )

        ${query.filter ? ` AND ${query.filter}` : ''}
    )
    SELECT ST_AsMVT(mvtgeom.*, '${params.table}', 4096, 'geom' ${
    query.id_column ? `, '${query.id_column}'` : ''
  }) AS mvt from mvtgeom;
  `
  return query_text;
}

// route schema
const schema = {
  tags: ['feature'],
  summary: 'return MVT',
  params: {
    table: {
      type: 'string',
    },
    z: {
      type: 'integer',
    },
    x: {
      type: 'integer',
    },
    y: {
      type: 'integer',
    }
  },
  querystring: {
    geom_column: {
      type: 'string',
      default: 'geom'
    },
    columns: {
      type: 'string',
    },
    id_column: {
      type: 'string',
    },
    filter: {
      type: 'string',
    }
  }
}

// create route
module.exports = function(fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/mvt/:table/:z/:x/:y',
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