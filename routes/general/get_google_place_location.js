const https = require('https');

// returns google geocoded results for an address or place input.
// resultKeyword is either "predictions" for PLACE or "results" for addresses
function getGoogleResponse(urlPath) {
    const hostUrl = 'maps.googleapis.com';
    const options = {
        hostname: hostUrl,
        port: 443,
        path: urlPath,
        method: 'GET'
    };

    return new Promise((resolve, reject) => {
        https.get(options, (res) => {
            res.setEncoding('utf8');
            if (res.statusCode === 200) {
                let body = '';
                res.on('data', (chunk) => (body += chunk));
                res.on('error', function (e) {
                    console.log('Got error: ' + e.message);
                });
                res.on('end', () => {
                    const searchResult = JSON.parse(body)['result'];
                    const resultObject = {
                        Latitude: searchResult['geometry']['location']['lat'],
                        Longitude: searchResult['geometry']['location']['lng']
                    };
                    resolve(resultObject);
                });
            }
        });
    });
}

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Search based on input text and options.',
    tags: ['general'],
    summary: 'Search based on input text and options.',
    querystring: {
        placeId: {
            type: 'string',
            description: 'google place generated id'
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/general/get-google-place-location',
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

                if (request.query.placeId == undefined) {
                    return reply.send({
                        statusCode: 500,
                        error: 'Internal Server Error',
                        message: 'need place id'
                    });
                }

                const urlPath = `https://maps.googleapis.com/maps/api/place/details/json?placeid=${request.query.placeId}&key=AIzaSyAFBR3MS37_PAzOQmWnwFQoYBXDoqYKmfk`;
                const promise = getGoogleResponse(urlPath);
                promise.then((response) => {
                    release();
                    reply.send(err || { LocationResult: response });
                });
            }
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
