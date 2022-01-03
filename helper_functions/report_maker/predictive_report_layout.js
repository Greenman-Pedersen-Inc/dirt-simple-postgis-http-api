const { jsPDF } = require("jspdf"); // will automatically load the node version
const { autoTable } = require("jspdf-autotable"); // will automatically load the node version
const reportHelper = require('./report_layout');
const codeTranslator = require('../code_translator');
require('./fonts/SegoeUI/segoeui-normal');     // SegoiUI normal
require('./fonts/SegoeUI/seguisb-normal');     // SegoiUI semi bold
require('./fonts/SegoeUI/segoeuib-bold');     // SegoiUI bold



// *---------------*
// Report Creation Functions
// *---------------*
function makePredictiveReport(queryArgs, reportData, reportTitle, reportSaveName) {
    const filterObject = createReportFilterLabels(queryArgs);
    const doc = reportHelper.generateReportPdf("letter-portrait", filterObject, reportTitle);
    makeReportTable(doc, reportData, reportHelper.getCurrentY() + 5);
    reportHelper.createFooter(doc, reportTitle);
    return reportHelper.saveReportPdf(doc, reportSaveName); 
}

function getTableTitleHeader (doc, tableTitle, yPos) {
    const leftMargin = reportHelper.pageMarginSides;
    const pageSize = doc.internal.pageSize
    const pageWidth = pageSize.width ? pageSize.width : pageSize.getWidth();
    var currYPos = yPos;

    if (tableTitle) {
        doc
        .setFont("seguisb", "normal")
        .setFontSize(14)
        .setTextColor(104,104,104)
        .text(tableTitle, leftMargin, yPos);
        currYPos += 2;
        doc
        .setDrawColor(104,104,104)
        .setLineWidth(0.5)
        .line(leftMargin, currYPos, pageWidth - leftMargin, currYPos);
        currYPos += 3;
    }
    return currYPos;
}

function makeReportTable(doc, reportData, yPos) {
    var currY = yPos;
    Object.keys(reportData).forEach((crashAttr, idx, arr) => {
        // add # column
        var tableData = reportData[crashAttr].data;
        for (var i = 0; i < tableData.length; i++) {
            tableData[i]['num'] = i + 1;
        }

        currY = getTableTitleHeader(doc, reportData[crashAttr].title, currY);
        var tableSettings = {
            startY: currY,
            margin: { right: reportHelper.pageMarginSides, left: reportHelper.pageMarginSides },
            styles: {
                lineColor: [84, 84, 84],
                lineWidth: 0.1,
                textColor: [0, 0, 0],
                rowPageBreak: 'always',
                pageBreak: 'auto',
                fontSize: 7
            },
            headStyles: {
                halign: 'center',
                fillColor: [32, 178, 170],
                textColor: 255
            },
            bodyStyles: {
                halign: 'center'
            },
            columnStyles: {
                "count": {
                    fontStyle: 'bold'
                }
            },
            columns: getTableColumns(crashAttr),
            body: tableData,
            allSectionHooks: true,
            didParseCell: function (data) {
                if (data.column.dataKey === 'count' && data.row.section === 'head') {
                    data.cell.styles.fillColor = [0, 127, 127];
                }
                // highlight fatal or incap cells
                if (crashAttr === "default") {
                    if (data.row.section === 'body' && (data.column.dataKey === 'fatal' || data.column.dataKey === 'incapacitated')) {
                        if (parseInt(data.cell.raw) > 0) {
                            data.cell.styles.fillColor = [255, 127, 127]; // Red
                        }
                    }
                }
            },
            willDrawCell: function (data) {
                doc.setFont("segoeui", "normal")
                // highlight fatal or incap cells
                if (crashAttr === "default") {
                    if (data.row.section === 'body' && (data.column.dataKey === 'fatal' || data.column.dataKey === 'incapacitated')) {
                        if (parseInt(data.cell.raw) > 0) {
                            doc.setFont("segoeuib", "bold");
                            doc.setTextColor(255,255,255);
                        }
                    }
                }
                if (data.row.section === 'body' && (data.column.dataKey === 'count')) {
                    doc.setFont("segoeuib", "bold");
                }
                if (data.row.section === 'head') {
                    doc.setFont("segoeuib", "bold");
                }
            },
        }
        doc.autoTable(tableSettings);
        if (idx !== arr.length - 1 ) doc.addPage();
        currY = reportHelper.newPageTextY;
    });
    return doc;
}



// *---------------*
// Report Helper Functions
// *---------------*

// returns all queries needed for the report
function getReportQueries(queryStrings) {
    var reportQueries = {};
    var queryCodes = ['default'];
    var crashAttr = queryStrings.crashAttributes;
    if (crashAttr !== null && crashAttr !== undefined) {
        var crashAttrList = crashAttr.split(',');
        queryCodes.push.apply(queryCodes, crashAttrList);
    }
    queryCodes.forEach(crashAttr => {
        var aQuery = makeReportQuery(queryStrings, crashAttr);
        reportQueries[crashAttr] = {
            title: createTableTitle(crashAttr),
            query: aQuery
        }
    });
    return reportQueries;
}

// returns object of filter text that goes on the report
function createReportFilterLabels(queryStrings) {
    var filterObject = {};
    // year range
    filterObject["Year Range"] = createYearLabel(queryStrings.startYear, queryStrings.endYear);

    // location
    var location = "New Jersey State";
    if (queryStrings.sri) location = queryStrings.sriName + ' (' + queryStrings.sri + ')';
    else if (queryStrings.muniCode || queryStrings.countyCode) {
        const juriCode = `${queryStrings.muniCode ? queryStrings.countyCode + queryStrings.muniCode : queryStrings.countyCode}`;
        location = getJurisdictionName(juriCode);
    }
    else if (queryStrings.sri) location = queryStrings.sri; 
    filterObject["Location"] = location;

    // travel direction
    if (queryStrings.travelDirectionCodes) {
        filterObject["Travel Direction"] = createDirectionLabel(queryStrings.travelDirectionCodes);
    }

    // time of day
    if (queryStrings.timeOfDayCodes) {
        filterObject["Time of Day"] = createTimeLabels(queryStrings.timeOfDayCodes);
    }

    // signalized intersection
    if (queryStrings.signalizedIntersectionCodes) {
        filterObject["Signalized Intersections"] = createSignalLabel(queryStrings.signalizedIntersectionCodes);
    }

    // enviornmental cond
    if (queryStrings.environmentCodes) {
        filterObject["Weather Conditions"] = createEnviornmentLabels(queryStrings.environmentCodes);
    }
    return filterObject;
}

function makeReportQuery(queryStrings, crashAttr) {
    var defaultQuery = "";
    var locationClause = createLocationClause(queryStrings);
    var filterClause = createFilterClause(queryStrings);
    var limitSortClause = createLimitSortClause(queryStrings);
    const tableName = `${queryStrings.moduleType}.ard_accidents_${queryStrings.moduleType}`;

    //console.log(filterClause);
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
        var crashAttrClause = getCrashAttributeClause(crashAttr);
        if (crashAttrClause !== null) defaultQuery = "," + crashAttrClause;
    }

    var query = `
    SELECT DISTINCT UPPER(public.srilookupname.name) "sri_name", accidents.* FROM
    (
        SELECT calc_sri, 
        ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS rounded_mp,
        CONCAT(CAST (ROUND(FLOOR(calc_milepost * 10) / 10, 1) AS DECIMAL(5,2)), ' - ', ROUND(FLOOR(calc_milepost * 10) / 10, 1) + .09) AS mp_range,
        COUNT(crashid)
        ${defaultQuery}
        FROM 
        ${tableName}
        WHERE year BETWEEN ${queryStrings.startYear} AND ${queryStrings.endYear} 
        AND calc_milepost IS NOT NULL
        ${locationClause !== "" ? ` AND ${locationClause}` : '' }
        ${filterClause  !== "" ? ` AND ${filterClause}` : '' }              
        GROUP BY calc_sri, rounded_mp
    ) accidents
    LEFT JOIN public.srilookupname ON public.srilookupname.stndrd_rt_id = accidents.calc_sri
    ${limitSortClause  !== "" ? ` ${limitSortClause}` : '' };`;
    return query;
}

function getJurisdictionName(jurisdictionCode) {
    if (jurisdictionCode.length === 4) {
        return(codeTranslator.convertCodeDescription("mun_mu", jurisdictionCode));
    }
    else {
        return(codeTranslator.convertCodeDescription("mun_cty_co", jurisdictionCode));
    }
}

function createYearLabel(startYear, endYear) {
    return startYear + " - " + endYear;
}

function createSignalLabel(codes) {
    const splitCodeArray = codes.split(",");
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

function createDirectionLabel(codes){
    const splitCodeArray = codes.split(",");
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

function createTimeLabels(codes) {
    const splitCodeArray = codes.split(",");
    if (splitCodeArray.length === 0) return "None";
    var filters = [];
    splitCodeArray.forEach(timeString => {
        var timeInt = parseInt(timeString);
        if (timeInt < 12)
        {
            if (timeInt == 0) { filters.push("12 AM"); }
            else filters.push(timeInt.toString() + " AM");
        }
    });
    return filters.join(" OR ");
}

function createEnviornmentLabels(codes) {
    const splitCodeArray = codes.split(",");
    const dirNames = {
        "01": "Clear",
        "02": "Rain",
        "03": "Snow",
        "04": "Fog/Smog/Smoke",
        "05": "Overcast",
        "06": "Sleet/Hail",
        "07": "Freezing Rain",
        "08": "Blowing Snow",
        "09": "Blowing Snow/Dirt",
        "10": "Severe Crosswinds"
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

function createTableTitle(crashAttr) {
    if (crashAttr === 'default') return 'Crashes by Physical Condition';
    else if (crashAttr === 'surf_cond_code') return 'Crashes by Road Surface Condition';
    else if (crashAttr === 'road_surf_code') return 'Crashes by Road Surface Type';
    else if (crashAttr === 'road_horiz_align_code') return 'Crashes by Road Horizontal Alignment';
    else if (crashAttr === 'road_grade_code') return 'Crashes by Road Grade';
    else if (crashAttr === 'light_cond_code') return 'Crashes by Road Lighting Condition';
}

function getTableColumns(crashAttr) {
    var defaultCols = [
        { header: '#', dataKey: 'num' },
        { header: 'SRI', dataKey: 'calc_sri' },
        { header: 'SRI Name', dataKey: 'sri_name' },
        { header: 'Milepost', dataKey: 'mp_range' }
    ]; 
    var cols;
    if (crashAttr === 'default') cols = [
        { header: 'Fatal', dataKey: 'fatal' },
        { header: 'Incap.', dataKey: 'incapacitated' },
        { header: 'Mod. Injury', dataKey: 'mod_inj' },
        { header: 'Compl. Pain', dataKey: 'comp_pain' },
        { header: 'Prop. Dmg.', dataKey: 'prop_dmg' },
        { header: 'Total', dataKey: 'count' }
    ];
    else if (crashAttr === 'surf_cond_code') cols = [
        { header: 'Dry', dataKey: 'na' },
        { header: 'Wet', dataKey: 'wet' },
        { header: 'Snowy', dataKey: 'snowy' },
        { header: 'Icy', dataKey: 'icy' },
        { header: 'Slush', dataKey: 'slush' },
        { header: 'Water', dataKey: 'water' },
        { header: 'Sand', dataKey: 'sand' },
        { header: 'Oil/Fuel', dataKey: 'oil_fuel' },
        { header: 'Mud, Dirt, Gravel', dataKey: 'mud_dirt_gravel' },
        { header: 'Total', dataKey: 'count' }
    ]
    else if (crashAttr === 'road_surf_code') cols = [
        { header: 'Concrete', dataKey: 'concrete' },
        { header: 'Blacktop', dataKey: 'blacktop' },
        { header: 'Gravel', dataKey: 'gravel' },
        { header: 'Steel Grid', dataKey: 'steel_grid' },
        { header: 'Dirt', dataKey: 'dirt' },
        { header: 'N/A', dataKey: 'na' },
        { header: 'Total', dataKey: 'count' }
    ];
    else if (crashAttr === 'road_horiz_align_code') cols = [
        { header: 'Straight', dataKey: 'straight' },
        { header: 'Curved Left', dataKey: 'curved_left' },
        { header: 'Curve Right', dataKey: 'curved_right' },
        { header: 'N/A', dataKey: 'na' },
        { header: 'Total', dataKey: 'count' }
    ];
    else if (crashAttr === 'road_grade_code') cols = [
        { header: 'Level', dataKey: 'lvl' },
        { header: 'Down Hill', dataKey: 'down_hill' },
        { header: 'Up Hill', dataKey: 'up_hill' },
        { header: 'Hill Crest', dataKey: 'hill_crest' },
        { header: 'Sag (Bottom)', dataKey: 'sag' },
        { header: 'N/A', dataKey: 'na' },
        { header: 'Total', dataKey: 'count' }
    ];
    else if (crashAttr === 'light_cond_code') cols = [
        { header: 'Daylight', dataKey: 'na' },
        { header: 'Dawn', dataKey: 'dawn' },
        { header: 'Dusk', dataKey: 'dusk' },
        { header: 'Dark (Street Lights Off)', dataKey: 'dark_street_lights_off' },
        { header: 'Dark (No Street Lights)', dataKey: 'dark_no_street_lights' },
        { header: 'Dark (Street Lights On, Cont.)', dataKey: 'dark_street_lights_on_cont' },
        { header: 'Dark (Street Lights On, Spot.', dataKey: 'dark_street_lights_on_spot' },
        { header: 'Total', dataKey: 'count' }
    ];
    return defaultCols.concat(cols);
}


// *---------------*
// SQL Clause Helper Functions
// *---------------*

// gets the clause of additional report tables
function getCrashAttributeClause(key) {
    const clauses = {
        "light_cond_code": `SUM(CASE WHEN light_cond_code = '02' THEN 1 ELSE 0 END) DAWN,
        SUM(CASE WHEN light_cond_code = '03' THEN 1 ELSE 0 END) DUSK,
        SUM(CASE WHEN light_cond_code = '04' THEN 1 ELSE 0 END) DARK_STREET_LIGHTS_OFF,
        SUM(CASE WHEN light_cond_code = '05' THEN 1 ELSE 0 END) DARK_NO_STREET_LIGHTS,
        SUM(CASE WHEN light_cond_code = '06' THEN 1 ELSE 0 END) DARK_STREET_LIGHTS_ON_CONT,
        SUM(CASE WHEN light_cond_code = '07' THEN 1 ELSE 0 END) DARK_STREET_LIGHTS_ON_SPOT,
        SUM(CASE WHEN light_cond_code NOT IN ('02', '03', '04', '05', '06', '07') OR light_cond_code IS NULL OR light_cond_code = '' THEN 1 ELSE 0 END) NA`,

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

// creates the clause for SRI, county, or muni
function createLocationClause(queryString) {
    var whereClauses = [];
    if (queryString.sri !== null && queryString.sri !== undefined && queryString.sri !== 'null') whereClauses.push(`calc_sri = '${queryString.sri}'`);
    else if (queryString.countyCode !== null && queryString.countyCode !== undefined) {
        whereClauses.push(`mun_cty_co = '${queryString.countyCode}'`);
        if (queryString.muniCode !== null && queryString.muniCode !== undefined) whereClauses.push(`mun_mu = '${queryString.muniCode}'`);
    }
    else return "";
    return whereClauses.join(' AND ');
}

// creates the clause for sunglare filters
function createFilterClause(queryString) {
    var predictiveWhereClause = [];
    if (queryString.moduleType === 'sunglare') {
        if (queryString.travelDirectionCodes !== null && queryString.travelDirectionCodes !== undefined && queryString.travelDirectionCodes !== 'null') {
            var formattedCodes = formatCodes(queryString.travelDirectionCodes);
            predictiveWhereClause.push(`veh_one_travel_dir_code IN (${formattedCodes})`);   // location_dir from the accidents table
        }
        if (queryString.signalizedIntersectionCodes !== null && queryString.signalizedIntersectionCodes !== undefined) {
            var formattedCodes = formatTrafficSignalCodes(queryString.signalizedIntersectionCodes);
            predictiveWhereClause.push(`(${formattedCodes})`);
        }
        if (queryString.timeOfDayCodes !== null && queryString.timeOfDayCodes !== undefined) {
            var formattedCodes = formatTimeCodes(queryString.timeOfDayCodes);
            predictiveWhereClause.push(`(${formattedCodes})`);
        }        
    }
    else if (queryString.moduleType === 'weather') {
        if (queryString.environmentCodes !== null && queryString.environmentCodes !== undefined) {
            var formattedCodes = formatCodes(queryString.environmentCodes);
            predictiveWhereClause.push(`environ_cond_code IN (${formattedCodes})`);   // location_dir from the accidents table
        }
    }

    return predictiveWhereClause.join(' AND ');
}

// creates the clause for sort and limit
function createLimitSortClause(queryString) {
    var limitClause = "";
    if (queryString.countyCode !== null || (queryString.countyCode == null && queryString.sri == null)) limitClause = " LIMIT 25";
    return createSortClause(queryString) + " " + limitClause;
}

// returns the sorting clause for mp, crash, or sri order
function createSortClause(queryString) {
    var sortClause = "ORDER BY count DESC, fatal DESC, incapacitated DESC";
    if (queryString.sort == "fatal-sort") {
        sortClause = "ORDER BY fatal DESC, incapacitated DESC, mod_inj DESC, count DESC";
    }
    else if (queryString.sort == "mp-sort") {
        sortClause = "ORDER BY milepost";
    }
    return sortClause;
}

// returns readble SRI name
function getSriNameQuery(sriCode) {
    return `SELECT name FROM public.srilookupname WHERE stndrd_rt_id = '${sriCode}'`;
}

// *---------------*
// Formatter Helper Functions
// *---------------*

// Splits a code string by "," to return an array of codes
// INPUT: "07,08,15,16,18"
// OUTPUT: [07, 08, ...]
function splitCodes(codeString) {
    var codes = [];
    if (codeString !== undefined && codeString !== null) {
        codes = codeString.split(',');
    }
    return codes;
}

// This formats the codes for the IN statement by adding single quotes and commas to each code from the request parameters.
// EXAMPLE: enviornmentCode = "01,02,03"
// RETURNS: "'01','02','03'"
function formatCodes(codeString) {
    var returnCodes = "";
    var codes = splitCodes(codeString);
    if (codes.length > 0) {
        var formattedCodes = [];
        codes.forEach(splitCode => {
            formattedCodes.push("'" + splitCode + "'");
        });
        returnCodes = formattedCodes.join(", ");
    }
    return returnCodes;
}

//"07,08,15,16,18"
function formatTimeCodes(codeString) {
    var returnCodes = "";
    var codes = splitCodes(codeString);
    if (codes.length > 0) {
        var formattedCodes = [];
        codes.forEach(splitCode => {
            var timeRangeQuery = `TO_TIMESTAMP(acc_time, 'HH24MI')::TIME BETWEEN '${splitCode}:00'::TIME AND '${splitCode}:59'::TIME`;
            formattedCodes.push(timeRangeQuery);
        });
        returnCodes = formattedCodes.join(' OR ');
    }
    return returnCodes;
}

// INPUT: "trf_ctrl_adult_crossing_guard,trf_ctrl_channelization_painted,trf_ctrl_channelization_physical"
// OUTPUT: (trf_ctrl_adult_crossing_guard > 0) OR (trf_ctrl_channelization_painted > 0) OR ...
function formatTrafficSignalCodes(codeString) {
    var returnCodes = "";
    var codes = splitCodes(codeString);
    if (codeString !== undefined && codeString !== null) {
        var codes = codeString.split(',');
        if (codes.length > 0) {
            var formattedCodes = [];
            codes.forEach(splitCode => {
                var timeRangeQuery = `(${splitCode} > 0)`;
                formattedCodes.push(timeRangeQuery);
            });
            returnCodes = formattedCodes.join(' OR ');
        }
    }
    return returnCodes;
}



// *---------------*
// Module Exports
// *---------------*
module.exports = {
    createLimitSortClause: createLimitSortClause,
    createLocationClause: createLocationClause,
    getReportQueries: getReportQueries,
    makePredictiveReport: makePredictiveReport,
    getSriNameQuery: getSriNameQuery,
    createLimitSortClause: createLimitSortClause,
    createLocationClause: createLocationClause,
    createFilterClause: createFilterClause,
    makeReportQuery: makeReportQuery
};
