var fs = require('fs');
const path = require('path');

// route schema
const schema = {
    description: 'Return table as Mapbox Vector Tile (MVT). The layer name returned is the name of the table.',
    tags: ['feature'],
    summary: 'return MVT',
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
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/static_mvt/:table/:z/:x/:y',
        schema: schema,
        handler: function (request, reply) {
            const filePath = path.join(
                __dirname,
                'tiles',
                `${request.params.z}/${request.params.x}/${request.params.y}.mvt`
            );

            fs.readFile(filePath, 'utf8', (err, data) => {
                if (err) {
                    console.error(err);
                    return;
                } else {
                    if (data) {
                        reply.header('Content-Type', 'application/x-protobuf').send(data);
                    } else {
                        reply.code(204);
                    }
                }
                // console.log(data);
            });

            // const mvt = result.rows[0].mvt;
            // if (mvt.length === 0) {
            // }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
