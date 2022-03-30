// crash-record: gets the physical location of a police report based on the crash record's DLN number

// *---------------*
// route query
// *---------------*
const sql = (queryArgs) => {
    var sql = `
    SELECT directory FROM ard_dln_information where dln = '${queryArgs.dlnNum}' limit 1;
    `;
    return sql;
  }

// *---------------*
// route schema
// *---------------*
const schema = {
    description: "gets the physical location of a police report based on the crash record's DLN number.",
    tags: ['general'],
    summary: "gets the physical location of a police report based on the crash record's DLN number.",
    querystring: {
        dlnNum: {
            type: 'string',
            description: 'The DLN of the crash record.',
            default: ''
        }
    }
}

// *---------------*
// create route
// *---------------*
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/general/crash-record',
        preHandler: fastify.auth([fastify.verifyToken]),
        schema: schema,
        handler: function (request, reply) {
            fastify.pg.connect(onConnect)

            function onConnect(err, client, release) {
                if (err) return reply.send({
                    "statusCode": 500,
                    "error": "Internal Server Error",
                    "message": "unable to connect to database server"
                });

                var queryArgs = request.query;
                if (queryArgs.dlnNum == undefined) {
                    return reply.send({
                        "statusCode": 500,
                        "error": "Internal Server Error",
                        "message": "need DLN"
                    });
                }

                client.query(
                    sql(queryArgs),
                    function onResult(err, result) {
                        release();
                        var returnPath = "";
                        // check if there is a directory
                        if (result.rows.length > 0) {
                            const returnRow = result.rows[0];
                            if (returnRow.directory) {
                                const njtr1Root = "https://voyagernjtr1.s3.amazonaws.com/";
                                returnPath = njtr1Root + returnRow.directory + '/' + dlnNum.toUpperCase() + '.PDF';
                            }
                        }

                        reply.send(err || {url: returnPath})
                    }
                );
            }
        }
    })
    next()
}

module.exports.autoPrefix = '/v1'