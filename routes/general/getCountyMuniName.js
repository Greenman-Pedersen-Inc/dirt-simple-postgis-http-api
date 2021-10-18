// getCountyName: gets the county or muni readable name based on its code.

// *---------------*
// route query
// *---------------*
const sql = (params) => {
    var sql = `SELECT county_name FROM public.ard_county WHERE county_code = '${params.countyCode}';`;

    if (params.muniCode) {
        sql = `SELECT muni_name FROM public.ard_municipality WHERE county_code = '${params.countyCode}' AND muni_code = ''${params.muniCode}''`;
    }
    return sql;
  }
  

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Get the county\'s readable name based on code.',
    tags: ['general'],
    summary: 'Get the county\'s readable name based on code.',
    querystring: {
        countyCode: {
            type: 'string',
            description: 'County code.',
            default: '*'
        },
        muniCode: {
            type: 'string',
            description: 'Muni code.'
        }
    }
}

  // create route
  module.exports = function (fastify, opts, next) {
    fastify.route({
      method: 'GET',
      url: '/general/county-muni-code',
      schema: schema,
      handler: function (request, reply) {
        fastify.pg.connect(onConnect)
  
        function onConnect(err, client, release) {
          if (err) return reply.send({
            "statusCode": 500,
            "error": "Internal Server Error",
            "message": "unable to connect to database server"
          });
  
          client.query(
            sql(request.query),
            function onResult(err, result) {
              release()
              reply.send(err || result.rows)
            }
          );
        }
      }
    })
    next()
  }
  
  module.exports.autoPrefix = '/v1'
  