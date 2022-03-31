const path = require('path');

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/tiles',
    schema: {
      hide: true
    },
    handler: function (request, reply) {

      console.log(path.join(__dirname, 'tiles'))

      reply.header('Content-Type', 'application/x-protobuf')
      reply.sendFile('test.html', path.join(__dirname, 'tiles')) // serving a file from a different root location
      // reply.sendFile('test.html')


    }
  })
  next()
}

module.exports.autoPrefix = '/v1'
