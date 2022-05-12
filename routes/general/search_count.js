const https = require('https');

// *---------------*
// route query
// *---------------*
const sql = (params) => {
    var sql = `SELECT county_name FROM public.ard_county WHERE county_code = '${params.countyCode}';`;

    if (params.includeRoute) {
        if (params.locationCode) {
            const locationQuery = `${
                params.includeCounty.length == 2
                    ? `AND countycode = '${params.locationCode}'`
                    : `AND municode = '${params.locationCode}'`
            }`;
            sql = `SELECT DISTINCT 
        count(*)
        FROM srilookuplocation  
        where UPPER(name)  
        Like '%${params.searchText.toUpperCase()}%'  
        ${locationQuery} 
        order by count  
        desc limit 15`;
        } else {
            sql = `SELECT 
          count(*)
          FROM srilookup  
          where UPPER(name)  
          Like '%${params.searchText.toUpperCase()}%'  
          order by count  
          desc limit 15`;
        }
    } else if (params.includeCounty) {
        const countyQuery = params.includeCounty.toUpperCase().replace('COUNTY', '');
        sql = `SELECT count(*)
      FROM ard_county  
      where county_name like '%${countyQuery}%'  
      and county_code not like '-%'  
      and county_code <> '00'  
      order by county_name  
      limit 5`;
    } else if (params.includeMunicipality) {
        sql = `SELECT count(*)
      FROM ard_county, ard_municipality  
      WHERE ard_municipality.county_code = ard_county.county_code  
      and muni_name like '%${params.searchText}%'  
      and muni_code not like '-%'  
      and muni_code <> '00'  
      order by muni_name  
      limit 5`;
    } else if (params.includeCaseNumber && params.searchText.length > 4) {
        sql = `SELECT count(*)
      FROM public.ard_accidents  
      inner join ard_municipality  
      on ard_accidents.mun_cty_co = ard_municipality.county_code  
      and ard_accidents.mun_mu = ard_municipality.muni_code  
      inner join ard_county  
      on ard_accidents.mun_cty_co = ard_county.county_code  
      where acc_case = '${params.searchText}'  
      or acc_case LIKE '%${params.searchText}%'  
      limit 5`;
    }
    //   console.log(sql)
    return sql;
};

// returns google geocoded results for an address or place input.
// resultKeyword is either "predictions" for PLACE or "results" for addresses
function getGoogleResponse(urlPath, attributes) {
    var resultsList = [];
    const hostUrl = 'maps.googleapis.com';
    //   console.log(hostUrl + urlPath)
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
                    const searchResultsArray = JSON.parse(body)[attributes.results];
                    //console.log(searchResultsArray)
                    searchResultsArray.forEach((searchResult) => {
                        const resultObject = {
                            ResultID: searchResult.place_id,
                            ResultText: searchResult[attributes.description],
                            ResultType: attributes.resultType
                        };
                        resultsList.push(resultObject);
                    });
                    //console.log(resultsList)
                    resolve(resultsList);
                });
            }
        });
    });
}

// *---------------*
// route schema
// *---------------*
const schema = {
    description: 'Get total count of returned search results.',
    tags: ['general'],
    summary: 'Get total count of returned search results.',
    querystring: {
        searchText: {
            type: 'string',
            description: 'text to search on',
            default: ''
        },
        includeRoute: {
            type: 'boolean',
            description: 'search SRI',
            default: true
        },
        includeCounty: {
            type: 'boolean',
            description: 'search county',
            default: false
        },
        includeMunicipality: {
            type: 'boolean',
            description: 'search municipality',
            default: false
        },
        includeCaseNumber: {
            type: 'boolean',
            description: 'search case number',
            default: false
        },
        includeGooglePlace: {
            type: 'boolean',
            description: 'search for a general place using google',
            default: false
        },
        includeGoogleAddress: {
            type: 'boolean',
            description: 'search for an address using google',
            default: false
        },
        locationCode: {
            type: 'string',
            description: 'county or muni location code',
            default: ''
        }
    }
};

// create route
module.exports = function (fastify, opts, next) {
    fastify.route({
        method: 'GET',
        url: '/general/search-count',

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

                if (request.query.includeGooglePlace || request.query.includeGoogleAddress) {
                    var resultsCount = 0;
                    var promises = [];
                    const searchTextFormatted = encodeURIComponent(`${request.query.searchText} near New Jersey`);

                    if (request.query.includeGooglePlace) {
                        const urlPath = `/maps/api/place/autocomplete/json?input=${searchTextFormatted}&key=AIzaSyAFBR3MS37_PAzOQmWnwFQoYBXDoqYKmfk`;
                        const attributes = {
                            results: 'predictions',
                            description: 'description',
                            resultType: 'PLACE'
                        };
                        const promise = getGoogleResponse(urlPath, attributes);
                        promises.push(promise);
                    }

                    if (request.query.includeGoogleAddress) {
                        const urlPath = `/maps/api/geocode/json?address=${searchTextFormatted}&key=AIzaSyAFBR3MS37_PAzOQmWnwFQoYBXDoqYKmfk`;
                        const attributes = {
                            results: 'results',
                            description: 'formatted_address',
                            resultType: 'ADDRESS'
                        };

                        const promise = getGoogleResponse(urlPath, attributes);
                        promises.push(promise);
                    }

                    Promise.all(promises).then((responseArray) => {
                        responseArray.forEach((reponse) => {
                            reponse.forEach((result) => {
                                resultsCount++;
                            });
                        });
                        reply.send(err || { SearchResults: [{ count: resultsCount }] });
                    });
                } else {
                    client.query(sql(request.query), function onResult(err, result) {
                        release();
                        reply.send(err || { SearchResults: result.rows });
                    });
                }
            }
        },
        onRequest: async (req, res) => {
            req.controller = new AbortController();
            res.raw.setTimeout(typeof customTimeout == 'undefined' ? fastify.globalTimeout : customTimeout, () => {
                req.controller.abort();
                res.send(new Error('Server Timeout'));
                res.send = (payload) => res;
            });
        }
    });
    next();
};

module.exports.autoPrefix = '/v1';
