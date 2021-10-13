



const reportHelper = require('../helper_functions/report_maker/report_layout');
  
  
  // route schema
  const schema = {
    description: 'Report maker test.',
    tags: ['report'],
    summary: 'report maker test',
    // params: {
    //   table: {
    //     type: 'string',
    //     description: 'The name of the table or view.'
    //   }
    // },
    // querystring: {
    //   columns: {
    //     type: 'string',
    //     description: 'Columns to return.',
    //     default: '*'
    //   },
    //   filter: {
    //     type: 'string',
    //     description: 'Optional filter parameters for a SQL WHERE statement.'
    //   },
    //   sort: {
    //     type: 'string',
    //     description: 'Optional sort by column(s).'
    //   },
    //   limit: {
    //     type: 'integer',
    //     description: 'Optional limit to the number of output features.',
    //     default: 100
    //   },
    //   group: {
    //     type: 'string',
    //     description: 'Optional column(s) to group by.'
    //   }
    // }
  }
  
  // create route
  module.exports = function (fastify, opts, next) {
    fastify.route({
      method: 'GET',
      url: '/report/report-test',
      schema: schema,
      handler: function (request, reply) {
        fastify.pg.connect(onConnect)
  
        function onConnect(err, client, release) {
          if (err) return reply.send({
            "statusCode": 500,
            "error": "Internal Server Error",
            "message": "unable to connect to database server"
          });

          var savePath = reportHelper.GenerateReportPdf("letter-portrait", "Top SRI & Mileposts by Sun Glare");
          release();
          reply.send(err || savePath);

        }
      }
    })
    next()
  }
  
  module.exports.autoPrefix = '/v1'
  