const path = require('path');

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
    (SELECT ST_SRID(${query.geom_column}) AS srid FROM ${params.table} LIMIT 1) a
  WHERE
    ST_Intersects(
      ${query.geom_column},
      ST_Transform(
        ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}),
        srid
      )
    )

    -- Optional Filter
    ${query.filter ? ` AND ${query.filter}` : ''}
)
SELECT ST_AsMVT(mvtgeom.*, '${params.table}', 4096, 'geom' ${
        query.id_column ? `, '${query.id_column}'` : ''
    }) AS mvt from mvtgeom;
`;
    //console.log(query_text)
    return query_text;
};

// route schema
const schema = {
    description: 'Return table as Mapbox Vector Tile (MVT). The layer name returned is the name of the table.',
    tags: ['feature'],
    summary: 'return MVT',
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
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/static_tile/:z/:x/:y',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            const fileName = `${request.params.y}.mvt`;
            // const fileName = `test.html`
            const filePath = path.join(__dirname, 'tiles', request.params.z.toString(), request.params.x.toString());
            // const filePath = path.join(__dirname, 'tiles');

            console.log(fileName, filePath);

            reply.header('Content-Type', 'application/x-protobuf');
            reply.sendFile(fileName, filePath);
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
