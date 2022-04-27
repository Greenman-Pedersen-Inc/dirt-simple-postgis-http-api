// route query
const sql = (params, query) => {
  let bounds = query.bounds ? query.bounds.split(',').map(Number) : null;


  // ST_Transform(${query.geom_column}, 4326) as geom
  var query =
    `
    SELECT
      ST_AsGeoJSON(crash_data.*, '${query.geom_column}', ${parseInt(query.precision, 10)})::TEXT AS geojson
    FROM (
      SELECT
      ${query.geom_column}
      ${query.columns ? `, ${query.columns}` : ''}
      FROM
        ${params.table}
        ${query.filter || bounds ? 'WHERE ' : ''}
        ${query.filter ? `${query.filter} AND ${query.geom_column} IS NOT NULL` : ' ${query.geom_column} IS NOT NULL '}
        ${query.filter && bounds ? `AND ST_Intersects(${query.geom_column}, ST_MakeEnvelope(${bounds.join()}, 4326))`: ''}
        ${query.group_by ? ` GROUP BY ${query.group_by}` : ''}
        ${query.limit ? ` LIMIT ${query.limit}` : ''}
    ) as crash_data;
  `;
  // console.log(query);
  return query;
}

// route schema
const schema = {
  description: 'Return crash data as GeoJSON. Table should be a table with crash records and some geometry column.',
  tags: ['emphasis-explorer'],
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
      description: 'Columns to return as GeoJSON properites. The default is no columns. <br/><em>Note: the geometry column should not be listed here, and columns must be explicitly named.</em>'
    },
    filter: {
      type: 'string',
      description: 'Optional filter parameters for a SQL WHERE statement.'
    },
    group_by: {
        type: 'string',
        description: 'Optional filter parameters for a SQL GROUP BY statement.'
      },
    bounds: {
      type: 'string',
      pattern: '^-?[0-9]{0,20}.?[0-9]{1,20}?(,-?[0-9]{0,20}.?[0-9]{1,20}?){2,3}$',
      description: 'Optionally limit output to features that intersect bounding box. Can be expressed as a bounding box (sw.lng, sw.lat, ne.lng, ne.lat) or a Z/X/Y tile (0,0,0).'
    },
    precision: {
        type: 'integer',
        description: 'The maximum number of decimal places to return. Default is 6.',
        default: 6
    },
    limit: {
      type: 'integer',
      description: 'Number to limit results by'
    }
  }
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/emphasis-explorer/ea-geojson/:table',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        })

        client.query(
          sql(request.params, request.query),
          function onResult(err, result) {
            release()
            if (err) {
              reply.send(err)
            } else {
              // console.log(result.rows[0]);
              if (result.rows.length == 0) {reply.code(204)}

              else if (!result.rows[0]) {
                if (!result.rows[0].geojson) {
                  reply.code(204)
                }
              }
              const json = {
                type: 'FeatureCollection',
                features: result.rows.map(el => JSON.parse(el.geojson))
              }
              reply.send(json)
            }
          }
        )
      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'