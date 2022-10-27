// route query
const sql = (params, query) => {
    return `
SELECT ST_AsGeoJSON(complete_data.*, '', ${parseInt(query.precision, 10)}) AS geojson
FROM (
    SELECT 
        -- kmean, 
        count(*) as crash_count,

        -- ST_SetSRID(ST_Extent(geom_center), 4326) as bbox, 
        ST_SetSRID(ST_Centroid(ST_Extent(geom_center)), 4326) as geom
    FROM
    (
        -- Number indicates how many clusters should be created.
        SELECT ST_ClusterKMeans(geom, 30) OVER() AS kmean, ST_Centroid(geom) as geom_center
        FROM ard_accidents_geom_partition
        WHERE ST_Intersects(geom, ST_Transform(ST_TileEnvelope(${params.z}, ${params.x}, ${params.y}), 4326))
        -- Optional filter for the query input
        ${query.filter ? ` AND ${query.filter}` : ''}
    ) tsub
    GROUP BY kmean
) as complete_data
`;
};

// route schema
const schema = {
    description: 'Return table as GeoJSON.',
    tags: ['feature'],
    summary: 'return GeoJSON',
    params: {
        table: {
            type: 'string',
            description: 'The name of the table or view.'
        }
    },
    querystring: {
        geom_column: {
            type: 'string',
            description: 'The geometry column of the table.',
            default: 'geom'
        },
        columns: {
            type: 'string',
            description:
                'Columns to return as GeoJSON properites. The default is no columns. <br/><em>Note: the geometry column should not be listed here, and columns must be explicitly named.</em>'
        },
        filter: {
            type: 'string',
            description: 'Optional filter parameters for a SQL WHERE statement.'
        },
        bounds: {
            type: 'string',
            pattern: '^-?[0-9]{0,20}.?[0-9]{1,20}?(,-?[0-9]{0,20}.?[0-9]{1,20}?){2,3}$',
            description:
                'Optionally limit output to features that intersect bounding box. Can be expressed as a bounding box (sw.lng, sw.lat, ne.lng, ne.lat) or a Z/X/Y tile (0,0,0).'
        },
        precision: {
            type: 'integer',
            description: 'The maximum number of decimal places to return. Default is 9.',
            default: 9
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/cluster_geojson/:z/:x/:y',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            request.tracker = new fastify.RequestTracker(
                request.headers.credentials,
                'geojson',
                'cluster_geojson',
                JSON.stringify(request.query),
                reply
            );

            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                request.tracker.start();

                if (err) {
                    request.tracker.error(err);
                    release();
                    reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });
                }

                client.query(sql(request.params, request.query), function onResult(err, result) {
                    
                    if (err) {
                        request.tracker.error(err);
                        reply.send(err);
                        release();
                    } 
                    else {
                        if (!result.rows[0].geojson) {
                            reply.code(204);
                            request.tracker.error("no data returned");
                            release();
                        }
                        const json = {
                            type: 'FeatureCollection',
                            features: result.rows.map((el) => JSON.parse(el.geojson))
                        };
                        reply.send(json);
                        request.tracker.complete();
                        release();
                    }
                });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
