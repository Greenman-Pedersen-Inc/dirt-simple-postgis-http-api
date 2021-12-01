const reportHelper = require('../../helper_functions/report_maker/report_layout');
  
  
  // route schema
  const schema = {
    description: 'Report maker test.',
    tags: ['report'],
    summary: 'report maker test'
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
  