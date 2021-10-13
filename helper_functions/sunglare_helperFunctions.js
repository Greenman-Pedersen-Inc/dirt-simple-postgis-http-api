// *---------------*
// Sunglare querystrings
// *---------------*

function GetQueryStrings() {
    var querystrings = {
        user: {
            type: 'string',
            description: 'The user name.',
            default: ''
        },
        moduleType: {
            type: 'string',
            description: 'The type of predictive module.',
            default: 'sunglare'
        },
        sort: {
            type: 'string',
            description: 'The sorting method used in the report PDF.',
            default: 'crash-sort'
        },
        startYear: {
            type: 'string',
            description: 'The start year for crashes.',
            default: '2015'
        },
        endYear: {
            type: 'string',
            description: 'The end year for crashes.',
            default: '2020'
        },
        crashAttributes: {
            type: 'string',
            description: 'Comma seperated list of Crash Attribute codes based on the NJTR-1 form.'
        },
        travelDirectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Travel Direction codes based on the NJTR-1 form.'
        },
        timeOfDayCodes: {
            type: 'string',
            description: 'Comma seperated list of Time of Day codes based on the NJTR-1 form.'
        },
        signalizedIntersectionCodes: {
            type: 'string',
            description: 'Comma seperated list of Signalized Intersection codes based on the NJTR-1 form.'
        },
        sri: {
            type: 'string',
            description: 'SRI code.'
        },
        countyCode: {
            type: 'string',
            description: 'County Code.'
        },
        muniCode: {
            type: 'string',
            description: 'Municipality code.'
        }
    }
    return querystrings;
}

// *---------------*
// SQL Clause Helper Functions
// *---------------*

// creates the clause for SRI, county, or muni
function CreateLocationClause(queryString) {
    var whereClauses = [];
    if (queryString.sri !== null && queryString.sri !== undefined) whereClauses.push(`calc_sri = '${queryString.sri}'`);
    else if (queryString.countyCode !== null && queryString.countyCode !== undefined) {
        whereClauses.push(`mun_cty_co = '${queryString.countyCode}'`);
        if (queryString.muniCode !== null && queryString.muniCode !== undefined) whereClauses.push(`mun_mu = '${queryString.muniCode}'`);
    }
    else return "";
    return whereClauses.join(' AND ');
}

// creates the clause for sunglare filters
function CreateFilterClause(queryString) {
    var predictiveWhereClause = [];
    if (queryString.travelDirectionCodes !== null && queryString.travelDirectionCodes !== undefined) {
        console.log(queryString.travelDirectionCodes);
        var formattedCodes = FormatCodes(queryString.travelDirectionCodes);
        predictiveWhereClause.push(`veh_one_travel_dir_code IN (${formattedCodes})`);   // location_dir from the accidents table
    }
    if (queryString.signalizedIntersectionCodes !== null && queryString.signalizedIntersectionCodes !== undefined) {
        var formattedCodes = FormatTrafficSignalCodes(queryString.signalizedIntersectionCodes);
        predictiveWhereClause.push(`(${formattedCodes})`);
    }
    if (queryString.timeOfDayCodes !== null && queryString.timeOfDayCodes !== undefined) {
        var formattedCodes = FormatTimeCodes(queryString.timeOfDayCodes);
        predictiveWhereClause.push(`({formattedCodes})`);
    }
    return predictiveWhereClause.join(' AND ');
}

// creates the clause for sort and limit
function CreateLimitSortClause(queryString) {
    var limitClause = "";
    var sortClause = "";
    if (queryString.countyCode !== null || (queryString.countyCode == null && queryString.sri == null)) limitClause = " LIMIT 25";
    sortClause = "ORDER BY count DESC";
    if (queryString.sort == "fatal-sort") {
        sortClause = "ORDER BY fatal DESC, incapacitated DESC, mod_inj DESC, count DESC";
    }
    else if (queryString.sort == "mp-sort") {
        sortClause = "ORDER BY MP";
    }
    return sortClause + " " + limitClause;
}


// *---------------*
// Formatter Helper Functions
// *---------------*

// Splits a code string by "," to return an array of codes
// INPUT: "07,08,15,16,18"
// OUTPUT: [07, 08, ...]
function SplitCodes(codeString) {
    var splitCodes = [];
    if (codeString !== undefined && codeString !== null) {
        splitCodes = codeString.split(',');
    }
    return splitCodes;
}

// This formats the codes for the IN statement by adding single quotes and commas to each code from the request parameters.
// EXAMPLE: enviornmentCode = "01,02,03"
// RETURNS: "'01','02','03'"
function FormatCodes(codeString) {
    var returnCodes = "";
    var splitCodes = SplitCodes(codeString);
    if (splitCodes.length > 0) {
        var formattedCodes = [];
        splitCodes.forEach(splitCode => {
            formattedCodes.push("'" + splitCode + "'");
        });
        returnCodes = formattedCodes.join(", ");
    }
    return returnCodes;
}

//"07,08,15,16,18"
function FormatTimeCodes(codeString) {
    var returnCodes = "";
    var splitCodes = SplitCodes(codeString);
    if (splitCodes.length > 0) {
        var formattedCodes = [];
        splitCodes.forEach(splitCode => {
            var timeRangeQuery = String.Format("(TO_TIMESTAMP(acc_time, 'HH24MI')::TIME BETWEEN '{0}:00'::TIME AND '{0}:59'::TIME)", splitCode);
            formattedCodes.push(timeRangeQuery);
        });
        returnCodes = formattedCodes.join(' OR ');
    }
    return returnCodes;
}

// INPUT: "trf_ctrl_adult_crossing_guard,trf_ctrl_channelization_painted,trf_ctrl_channelization_physical"
// OUTPUT: (trf_ctrl_adult_crossing_guard > 0) OR (trf_ctrl_channelization_painted > 0) OR ...
function FormatTrafficSignalCodes(codeString) {
    var returnCodes = "";
    var splitCodes = SplitCodes(codeString);
    if (codeString !== undefined && codeString !== null) {
        var splitCodes = codeString.split(',');
        if (splitCodes.length > 0) {
            var formattedCodes = [];
            splitCodes.forEach(splitCode => {
                var timeRangeQuery = `(${splitCode} > 0)`;
                formattedCodes.push(timeRangeQuery);
            });
            returnCodes = formattedCodes.join(' OR ');
        }
    }
    return returnCodes;
}

// *---------------*
// Report Helper Functions
// *---------------*

// gets the clause of additional report tables
function GetCrashAttributeClause(key) {
    const clauses = {
        "surf_cond_code": `SUM(CASE WHEN surf_cond_code = '09' THEN 1 ELSE 0 END) MUD_DIRT_GRAVEL, 
        SUM(CASE WHEN surf_cond_code = '08' THEN 1 ELSE 0 END) OIL_FUEL, 
        SUM(CASE WHEN surf_cond_code = '07' THEN 1 ELSE 0 END) SAND, 
        SUM(CASE WHEN surf_cond_code = '06' THEN 1 ELSE 0 END) WATER, 
        SUM(CASE WHEN surf_cond_code = '05' THEN 1 ELSE 0 END) SLUSH, 
        SUM(CASE WHEN surf_cond_code = '04' THEN 1 ELSE 0 END) ICY, 
        SUM(CASE WHEN surf_cond_code = '03' THEN 1 ELSE 0 END) SNOWY, 
        SUM(CASE WHEN surf_cond_code = '02' THEN 1 ELSE 0 END) WET, 
        SUM(CASE WHEN surf_cond_code NOT IN ('02', '03', '04', '05', '06', '07', '08', '09') OR surf_cond_code IS NULL THEN 1 ELSE 0 END) NA`,

        "light_cond_code": `SUM(CASE WHEN light_cond_code = '02' THEN 1 ELSE 0 END) DAWN, 
        SUM(CASE WHEN light_cond_code = '03' THEN 1 ELSE 0 END) DUSK, 
        SUM(CASE WHEN light_cond_code = '04' THEN 1 ELSE 0 END) DARK_STREET_LIGHTS_OFF, 
        SUM(CASE WHEN light_cond_code = '05' THEN 1 ELSE 0 END) DARK_NO_STREET_LIGHTS, 
        SUM(CASE WHEN light_cond_code = '06' THEN 1 ELSE 0 END) DARK_STREET_LIGHTS_ON_CONT, 
        SUM(CASE WHEN light_cond_code = '07' THEN 1 ELSE 0 END) DARK_STREET_LIGHTS_ON_SPOT, 
        SUM(CASE WHEN light_cond_code NOT IN ('02', '03', '04', '05', '06', '07') OR light_cond_code IS NULL OR light_cond_code = '' THEN 1 ELSE 0 END) NA`,

        "road_surf_code": `SUM(CASE WHEN road_surf_code = '01' THEN 1 ELSE 0 END) CONCRETE, 
        SUM(CASE WHEN road_surf_code = '02' THEN 1 ELSE 0 END) BLACKTOP, 
        SUM(CASE WHEN road_surf_code = '03' THEN 1 ELSE 0 END) GRAVEL, 
        SUM(CASE WHEN road_surf_code = '04' THEN 1 ELSE 0 END) STEEL_GRID, 
        SUM(CASE WHEN road_surf_code = '05' THEN 1 ELSE 0 END) DIRT, 
        SUM(CASE WHEN road_surf_code NOT IN ('01', '02', '03', '04', '05') OR road_surf_code IS NULL THEN 1 ELSE 0 END) NA`,

        "road_horiz_align_code": `SUM(CASE WHEN road_horiz_align_code = '01' THEN 1 ELSE 0 END) STRAIGHT, 
        SUM(CASE WHEN road_horiz_align_code = '02' THEN 1 ELSE 0 END) CURVED_LEFT, 
        SUM(CASE WHEN road_horiz_align_code = '03' THEN 1 ELSE 0 END) CURVED_RIGHT, 
        SUM(CASE WHEN road_horiz_align_code NOT IN ('01', '02', '03') OR road_horiz_align_code IS NULL THEN 1 ELSE 0 END) NA`,

        "road_grade_code": `SUM(CASE WHEN road_grade_code = '04' THEN 1 ELSE 0 END) LVL, 
        SUM(CASE WHEN road_grade_code = '05' THEN 1 ELSE 0 END) DOWN_HILL, 
        SUM(CASE WHEN road_grade_code = '06' THEN 1 ELSE 0 END) UP_HILL, 
        SUM(CASE WHEN road_grade_code = '07' THEN 1 ELSE 0 END) HILL_CREST, 
        SUM(CASE WHEN road_grade_code = '08' THEN 1 ELSE 0 END) SAG, 
        SUM(CASE WHEN road_grade_code NOT IN ('08', '07', '06', '05', '04') OR road_grade_code IS NULL THEN 1 ELSE 0 END) NA`
    }

    if (key in clauses) {
        return clauses[key] + `, SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal, 
        SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated, 
        SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END) mod_inj`;
    }
    return null;
}

function MakeReportQuery(queryStrings, crashAttr) {
    var defaultQuery = "";
    var locationClause = CreateLocationClause(queryStrings);
    var filterClause = CreateFilterClause(queryStrings);
    var limitSortClause = CreateLimitSortClause(queryStrings);

    if (crashAttr == "default")
    {
        defaultQuery = `, SUM(CASE WHEN severity_rating5 = '05' THEN 1 ELSE 0 END) fatal, 
            SUM(CASE WHEN severity_rating5 = '04' THEN 1 ELSE 0 END) incapacitated, 
            SUM(CASE WHEN severity_rating5 = '03' THEN 1 ELSE 0 END) mod_inj, 
            SUM(CASE WHEN severity_rating5 = '02' THEN 1 ELSE 0 END) comp_pain, 
            SUM(CASE WHEN severity_rating5 = '01' THEN 1 ELSE 0 END) prop_dmg`;
    }
    else
    {
        var crashAttrClause = GetCrashAttributeClause(crashAttr);
        if (crashAttrClause !== null) defaultQuery = "," + crashAttrClause;
    }

    var query = `
    SELECT DISTINCT UPPER(public.srilookupname.name), accidents.* FROM
    (
        SELECT calc_sri, 
        ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS milepost,
        CONCAT(CAST (ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS DECIMAL(5,2)), ' - ', ROUND(FLOOR(calc_milepost * 10) / 10, 1) + .09) AS mp_range,
        COUNT(ard_accidents_sunglare.crashid)
        ${defaultQuery}
        FROM 
        sunglare.ard_accidents_sunglare
        WHERE year BETWEEN ${queryStrings.startYear} AND ${queryStrings.endYear} 
        AND calc_milepost IS NOT NULL
        ${locationClause !== "" ? ` AND ${locationClause}` : '' }
        ${filterClause  !== "" ? ` AND ${filterClause}` : '' }              
        GROUP BY calc_sri, calc_milepost
    ) accidents
    LEFT JOIN public.srilookupname ON public.srilookupname.stndrd_rt_id = accidents.calc_sri
    ${locationClause !== "" ? ` AND ${locationClause}` : '' }
    ${filterClause  !== "" ? ` AND ${filterClause}` : '' }
    ${limitSortClause  !== "" ? ` ${limitSortClause}` : '' }
    ;`;
    return query;
}

function GetReportQueries(queryStrings) {
    var reportQueries = [];
    var queryCodes = ['default'];
    var crashAttr = queryStrings.crashAttributes;
    if (crashAttr !== null && crashAttr !== undefined) {
        var crashAttrList = crashAttr.split(',');
        queryCodes.push.apply(queryCodes, crashAttrList);
    }
    queryCodes.forEach(crashAttr => {
        var aQuery = MakeReportQuery(queryStrings, crashAttr);
        reportQueries.push({
            "name": crashAttr,
            "text": aQuery
        });
    });
    return reportQueries;
}

// INPUT: {"travelDirectionCodes": "02,03"}
// OUTPUT: {"travelDirectionCodes": {name: "Travel Direction", value: "East, West"}, {...}}
function CreateReportFilterLabels(filterObject) {
    
}

function CreateYearLabel(startYear, endYear) {
    return {"Years": startYear + " - " + endYear};
}

function CreateSignalLabel(splitCodeArray) {
    const signalNames = {
        "trf_ctrl_adult_crossing_guard":"Adult Crossing Guard",
        "trf_ctrl_channelization_painted":"Channelization (Painted)" ,
        "trf_ctrl_channelization_physical":"Channelization (Physical)",
        "trf_ctrl_flagman":"Flagman",
        "trf_ctrl_flashing_traffic_control":"Flashing Traffic Control",
        "trf_ctrl_lane_markings":"Lane Markings",
        "trf_ctrl_no_control_present":"None",
        "trf_ctrl_other":"Other",
        "trf_ctrl_police_officer":"Police Officer",
        "trf_ctrl_school_zone_signs_controls":"School Zone Signs",
        "trf_ctrl_stop_sign":"Stop Sign",
        "trf_ctrl_traffic_signal":"Traffic Signal",
        "trf_ctrl_warning_signal":"Warning Signal",
        "trf_ctrl_rr_watchman":"Watchman",
        "trf_ctrl_yield_sign":"Yield Sign" 
    }
    if (splitCodeArray.length === 0) return "None";
    var foundFilters = [];
    splitCodeArray.forEach(code => {
        if (code in signalNames) {
            foundFilters.push(signalNames[code]);
        }
    });
    return foundFilters.join(" OR ");
}

function CreateDirectionLabel(splitCodeArray){
    const dirNames = {
        "01": "North",
        "03": "South",
        "02": "East",
        "04": "West"
    }
    if (splitCodeArray.length === 0) return "None";
    var foundFilters = [];
    splitCodeArray.forEach(code => {
        if (code in dirNames) {
            foundFilters.push(dirNames[code]);
        }
    });
    return foundFilters.join(" OR "); 
}

function CreateTimeLabels(splitCodeArray) {
    if (splitCodeArray.length === 0) return "None";
    var filters = [];
    splitCodeArray.forEach(timeString => {
        var timeInt = parseInt(timeString);
        if (timeInt < 12)
        {
            if (timeInt == 0) { filters.push("12 AM"); }
            else filters.push(timeInt.ToString() + " AM");
        }
    });
    return filters.join(" OR ");
}


// *---------------*
// Module Exports
// *---------------*

module.exports = {
    GetQueryStrings: GetQueryStrings,
    CreateLimitSortClause: CreateLimitSortClause,
    CreateFilterClause: CreateFilterClause,
    CreateLocationClause: CreateLocationClause,
    GetReportQueries: GetReportQueries
};

