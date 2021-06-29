// route query
const sql = (params, query) => {
  let bounds = query.bounds ? query.bounds.split(",").map(Number) : null;

  let querytext = `
    SELECT
      ST_AsGeoJSON(subq.*, '', 9) AS geojson
    FROM (
      SELECT
        ST_Transform(geom, 4326) as geom,
        projectnumber,
        year
      FROM
        geo_project,
        (SELECT ST_SRID(geom) AS srid FROM geo_project LIMIT 1) a
      ${query.filter || bounds ? "WHERE" : ""}
        ${query.filter ? `${query.filter}` : ""}
        ${query.filter && bounds ? "AND" : ""}
        ${
          bounds && bounds.length === 4
            ? `geom &&
          ST_Transform(
            ST_MakeEnvelope(${bounds.join()}, 4326),
            srid
          )
          `
            : ""
        }
        ${
          bounds && bounds.length === 3
            ? `geom &&
          ST_Transform(
            ST_TileEnvelope(${bounds.join()}),
            srid
          )
          `
            : ""
        }
    ) as subq
  `;
  console.log(querytext);
  return querytext;
};

// route schema
const schema = {
  description: "Return table as GeoJSON.",
  tags: ["feature"],
  summary: "return GeoJSON",

  querystring: {
    filter: {
      type: "string",
      description: "Optional filter parameters for a SQL WHERE statement.",
    },
    bounds: {
      type: "string",
      pattern:
        "^-?[0-9]{0,20}.?[0-9]{1,20}?(,-?[0-9]{0,20}.?[0-9]{1,20}?){2,3}$",
      description:
        "Optionally limit output to features that intersect bounding box. Can be expressed as a bounding box (sw.lng, sw.lat, ne.lng, ne.lat) or a Z/X/Y tile (0,0,0).",
    },
  },
};

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: "GET",
    url: "/project",
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect);

      function onConnect(err, client, release) {
        if (err)
          return reply.send({
            statusCode: 500,
            error: "Internal Server Error",
            message: "unable to connect to database server",
          });

        client.query(
          sql(request.params, request.query),
          function onResult(err, result) {
            release();
            if (err) {
              reply.send(err);
            } else {
              if (!result.rows[0].geojson) {
                reply.code(204);
              }
              const json = {
                type: "FeatureCollection",
                features: result.rows.map((el) => JSON.parse(el.geojson)),
              };
              reply.send(json);
            }
          }
        );
      }
    },
  });
  next();
};

module.exports.autoPrefix = "/v1";
