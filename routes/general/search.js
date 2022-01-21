const https = require('https');

// *---------------*
// route query
// *---------------*
const makeSeachQueries = (params) => {
  var sqlQueries = [];
  var sql;

  if (params.includeRoute) {
    if (params.locationCode) {
      const locationQuery = `${params.includeCounty.length == 2 ? `AND countycode = '${params.locationCode}'` : `AND municode = '${params.locationCode}'`}`;
      sql = `SELECT DISTINCT 
      'SRI' AS "ResultType",
      CONCAT(name, ' (', stndrd_rt_id, ')') AS "ResultText",
        stndrd_rt_id AS "ResultID"
        FROM srilookuplocation  
        where UPPER(name)  
        Like '%${params.searchText.toUpperCase()}%'  
        ${locationQuery} 
        order by count  
        desc limit 10`;
    }
    else {
      sql = `SELECT 
      'SRI' AS "ResultType",
      CONCAT(name, ' (', stndrd_rt_id, ')') AS "ResultText",
          stndrd_rt_id AS "ResultID"
          FROM srilookup  
          where UPPER(name)  
          Like '%${params.searchText.toUpperCase()}%'  
          order by count  
          desc limit 10`;
    }
    console.log(sql)
    sqlQueries.push(sql);
  }
  if (params.includeCounty) {
    const countyQuery = params.searchText.toUpperCase().replace('COUNTY', '');
    sql = `SELECT 'COUNTY' AS "ResultType",  
      county_name AS "ResultText",  
      county_code AS "ResultID",
      ST_X(ST_Transform(ST_SetSrid(ST_MakePoint(mercator_x, mercator_y), 3857), 4326)) AS "Latitude",
      ST_Y(ST_Transform(ST_SetSrid(ST_MakePoint(mercator_x, mercator_y), 3857), 4326)) AS "Longitude"
      FROM ard_county  
      where UPPER(county_name) like '%${countyQuery}%'  
      and county_code not like '-%'  
      and county_code <> '00'  
      order by county_name  
      limit 5`;
    console.log(sql)
    sqlQueries.push(sql);
  }
  if (params.includeMunicipality) {
    sql = `SELECT 'MUNICIPALITY' AS "ResultType",
      CONCAT(muni_name, ', ', county_name) AS "ResultText",
      CONCAT(ard_municipality.county_code, muni_code) AS "ResultID",
      ST_X(ST_Transform(ST_SetSrid(ST_MakePoint(ard_municipality.mercator_x, ard_municipality.mercator_y), 3857), 4326)) AS "Latitude",
      ST_Y(ST_Transform(ST_SetSrid(ST_MakePoint(ard_municipality.mercator_x, ard_municipality.mercator_y), 3857), 4326)) AS "Longitude"
      FROM ard_county, ard_municipality  
      WHERE ard_municipality.county_code = ard_county.county_code  
      and UPPER(muni_name) like '%${params.searchText.toUpperCase()}%'  
      and muni_code not like '-%'  
      and muni_code <> '00'  
      order by muni_name  
      limit 5`;
    console.log(sql)
    sqlQueries.push(sql);

  }
  if (params.includeCaseNumber && params.searchText.length > 4) {
    sql = `SELECT 
    'CASE' AS "ResultType",
      CONCAT(acc_case, ' ', muni_name) AS "ResultText",
      crashid AS "ResultID"
      FROM public.ard_accidents
      inner join ard_municipality
      on ard_accidents.mun_cty_co = ard_municipality.county_code
      and ard_accidents.mun_mu = ard_municipality.muni_code
      inner join ard_county
      on ard_accidents.mun_cty_co = ard_county.county_code
      where acc_case = '${params.searchText}'  
      or acc_case LIKE '%${params.searchText}%'  
      limit 5`;
    console.log(sql)
    sqlQueries.push(sql);
  }
  return sqlQueries;
}

// returns google geocoded results for an address or place input.
// resultKeyword is either "predictions" for PLACE or "results" for addresses
function getGoogleResponse(urlPath, attributes) {
  var resultsList = [];
  const hostUrl = 'maps.googleapis.com';
  console.log(hostUrl + urlPath)
  const options = {
    hostname: hostUrl,
    port: 443,
    path: urlPath,
    method: 'GET'
  }

  return new Promise((resolve, reject) => {
    https.get(options, res => {
      res.setEncoding('utf8');
      if (res.statusCode === 200) {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('error', function (e) {
          console.log("Got error: " + e.message);
        });
        res.on('end', () => {
          const searchResultsArray = JSON.parse(body)[attributes.results];
          //console.log(searchResultsArray)
          searchResultsArray.forEach(searchResult => {
            const resultObject = {
              "ResultID": searchResult.place_id,
              "ResultText": searchResult[attributes.description],
              "ResultType": attributes.resultType
            }
            resultsList.push(resultObject)
          });
          //console.log(resultsList)
          resolve(resultsList);
        });
      }
    });
  })
}

// *---------------*
// route schema
// *---------------*
const schema = {
  description: 'Search based on input text and options.',
  tags: ['general'],
  summary: 'Search based on input text and options.',
  querystring: {
    searchText: {
      type: 'string',
      description: 'text to search on',
      default: ''
    },
    includeRoute: {
      type: 'boolean',
      description: 'search SRI',
      default: false
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
}

// create route
module.exports = function (fastify, opts, next) {
  fastify.route({
    method: 'GET',
    url: '/general/search',
    schema: schema,
    handler: function (request, reply) {
      fastify.pg.connect(onConnect)

      function onConnect(err, client, release) {
        if (err) return reply.send({
          "statusCode": 500,
          "error": "Internal Server Error",
          "message": "unable to connect to database server"
        });

        var sqlQueries = makeSeachQueries(request.query);
        var resultsList = [];
        var promises = [];

        sqlQueries.forEach(query => {
          const promise = new Promise((resolve, reject) => {
            try {
              const res = client.query(query);
              return resolve(res);
            }
            catch (err) {
              console.log(err.stack);
              console.log(query);
              return reject(error);
            }
          });
          promises.push(promise);
        });

        if (request.query.includeGooglePlace || request.query.includeGoogleAddress) {
          const searchTextFormatted = encodeURIComponent(`${request.query.searchText} near New Jersey`);

          if (request.query.includeGooglePlace) {
            const urlPath = `/maps/api/place/autocomplete/json?input=${searchTextFormatted}&key=AIzaSyAFBR3MS37_PAzOQmWnwFQoYBXDoqYKmfk`;
            const attributes = {
              results: "predictions",
              description: "description",
              resultType: "PLACE"
            }
            const promise = getGoogleResponse(urlPath, attributes);
            promises.push(promise);
          }

          if (request.query.includeGoogleAddress) {
            const urlPath = `/maps/api/geocode/json?address=${searchTextFormatted}&key=AIzaSyAFBR3MS37_PAzOQmWnwFQoYBXDoqYKmfk`;
            const attributes = {
              results: "results",
              description: "formatted_address",
              resultType: "ADDRESS"
            }

            const promise = getGoogleResponse(urlPath, attributes);
            promises.push(promise);
          }
        }


        Promise.all(promises).then((responseArray) => {
          responseArray.forEach(response => {
            //console.log(response)
            if (response.rows) {
              response.rows.forEach(row => {
                resultsList.push(row);
              });
            }
            else {
              response.forEach(result => {
                if (result.ResultText.includes('NJ, USA')) {
                  resultsList.push(result);
                }
              });   
            }
          });
          release();
          reply.send(err || { SearchResults: resultsList })
        })

      }
    }
  })
  next()
}

module.exports.autoPrefix = '/v1'
