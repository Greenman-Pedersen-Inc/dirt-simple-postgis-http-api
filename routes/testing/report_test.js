const reportHelper = require('../../helper_functions/report_maker/report_layout');

// route schema
const schema = {
    description: 'Report maker test.',
    tags: ['test'],
    summary: 'report maker test'
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/test/report-test',
        schema: schema,
        preHandler: fastify.auth([fastify.verifyToken]),
        handler: function (request, reply) {
            fastify.pg.connect(onConnect);

            function onConnect(err, client, release) {
                if (err)
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'unable to connect to database server'
                    });

                const filterObject = { 'Year Range': '2016 - 2019' };
                const doc = reportHelper.generateReportPdf('letter-portrait', filterObject, 'Jurisdiction Report');
                const fileInfo = reportHelper.saveReportPdf(doc, 'juriReport');

                fileInfo
                    .then((createdFile) => {
                        //console.log(createdFile)
                        reply.send({ url: createdFile.fileName });
                    })
                    .catch((error) => {
                        //console.log(error);
                    });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
