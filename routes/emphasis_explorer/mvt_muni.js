// route query
// geom_column: wkb_geometry
// filter: (year >= 2017 AND year <= 2021)  GROUP BY muni_data.mun, muni_data.mun_mu, muni_data.county, muni_data.mun_cty_co, crash_data.wkb_geometry
const sql = (params, query) => {
    let queryText = `
     WITH mvtgeom as (
      SELECT 
          ST_AsMVTGeom (
              muni_data.wkb_geometry,
              ST_TileEnvelope(${params.z}, ${params.x}, ${params.y})
          ) as geom,
          muni_data.mun,
          muni_data.mun_mu,
          muni_data.county,
          muni_data.mun_cty_co,
          SUM(crashes)::INTEGER crashes
      FROM ${params.table} crash_data, public.municipal_boundaries_of_nj_3857 muni_data
      WHERE crash_data.mun_cty_co = muni_data.mun_cty_co
    and crash_data.mun_mu = muni_data.mun_mu
    AND ST_Intersects(muni_data.wkb_geometry, ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}))
  
      -- Optional Filter
    ${query.filter ? ` AND ${query.filter}` : ''}
  )
  SELECT ST_AsMVT(mvtgeom.*, '${params.table}', 4096, 'geom' ${
        query.id_column ? `, '${query.id_column}'` : ''
    }) AS mvt from mvtgeom;
  `;

    //console.log(queryText);

    return queryText;
};

// route schema
const schema = {
    description: 'Return table as Mapbox Vector Tile (MVT) for Muni level',
    tags: ['feature'],
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
            description: 'Optional geometry column of the table. The default is geom.',
            default: 'geom'
        },
        columns: {
            type: 'string',
            description: 'Optional columns to return with MVT. The default is no columns.'
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
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/mvt-muni/:table/:z/:x/:y',
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });

                client.query(sql(request.params, request.query), function onResult(err, result) {
                    release();
                    if (err) {
                        reply.send(err);
                    } else {
                        const mvt = result.rows[0].mvt;
                        if (mvt.length === 0) {
                            reply.code(204);
                        }
                        reply.header('Content-Type', 'application/x-protobuf').send(mvt);
                    }
                });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/emphasis_explorer';
