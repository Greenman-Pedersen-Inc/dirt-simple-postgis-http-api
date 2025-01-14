const {
    createQueryClauseSingleton,
    createQueryClauseMultiple,
    createQueryClauseMunicipality,
    createQueryDateRange,
    createTimeDateRange,
    createQueryMilepost,
    createQueryVehicleTotal,
    createQueryPedCyclist
} = require('./query_maker');

// *---------------*

// ACCIDENTS table columns and code definitions

// FORMAT: { title: '...', fieldName: '...', moduleName: '...', secondaryColumns: [...], query: function(...) {...} }
// ATTRIBUTE DEFINITIONS
//  title: human-readable title of the column
//  fieldName: column name from the database table
//  moduleName: JSON attribute name. Usually not needed unless a naming distinguish needs to be made between same DB columns names such as Vehicle and Pedrestian table column 'contr_circum_code1'
//  secondaryColumns: array of alternative fieldnames associated with this column. Used to combine multiple 'OR' clauses such as 'Contributing Circumstances 1 OR 2'
//  query: function which formats the SQL query clause of the column

// *---------------*
const tableName = 'ard_accidents_geom_partition';

const viewableAttributes = [
    'crashid',
    'year',
    'mun_cty_co',
    'mun_mu',
    'acc_case',
    'dln',
    'dept_num',
    'dept_name',
    'station',
    'acc_date',
    'acc_dow',
    'acc_time',
    'severity_code',
    'severity_rating5',
    'intersection',
    'alcohol_involved',
    'hazmat_involved',
    'hs_collision_type',
    'hs_fixed_object',
    'crash_type',
    'tot_veh_involved',
    'location',
    'location_dir',
    'route_num',
    'route_sx',
    'sri',
    'milepost',
    'road_sys_code',
    'road_char_code',
    'road_horiz_align_code',
    'road_grade_code',
    'road_surf_code',
    'surf_cond_code',
    'light_cond_code',
    'environ_cond_code',
    'road_median_code',
    'temp_traffic_zone',
    'dist_to_xstreet',
    'dist_xstreet_unit',
    'dir_from_xstreet',
    'xstreet_name',
    'is_ramp',
    'ramp_route',
    'ramp_direction',
    'calc_latitude',
    'calc_longitude',
    'posted_speed',
    'posted_speed_xstreet',
    'first_harmful_event',
    'other_prop_damage',
    'report_badge_num',
    'review_badge_num',
    'flg_cell_in_use',
    'driver_phys_apptly_nrml',
    'driver_phys_alcl_use',
    'driver_phys_drug_use_illicit',
    'driver_phys_medication',
    'driver_phys_alcl_drug_med_use',
    'driver_phys_handicaps',
    'driver_phys_illness',
    'driver_phys_fatigue',
    'driver_phys_fell_aslp',
    'driver_phys_other',
    'driver_phys_unknown',
    'driver_phys_not_recorded',
    'cyclist_involved',
    'trf_ctrl_police_officer',
    'trf_ctrl_rr_watchman',
    'trf_ctrl_traffic_signal',
    'trf_ctrl_lane_markings',
    'trf_ctrl_channelization_painted',
    'trf_ctrl_channelization_physical',
    'trf_ctrl_warning_signal',
    'trf_ctrl_stop_sign',
    'trf_ctrl_yield_sign',
    'trf_ctrl_flagman',
    'trf_ctrl_no_control_present',
    'trf_ctrl_flashing_traffic_control',
    'trf_ctrl_school_zone_signs_controls',
    'trf_ctrl_adult_crossing_guard',
    'trf_ctrl_other',
    'trf_ctrl_unknown',
    'trf_ctrl_not_recorded',
    'occupant_phys_cond_killed',
    'occupant_phys_cond_incapacitated',
    'occupant_phys_cond_moderate_injury',
    'occupant_phys_cond_complaint_pain',
    'occupant_phys_cond_unknown',
    'occupant_phys_cond_not_recorded',
    'pedestrian_phys_cond_killed',
    'pedestrian_phys_cond_incapacitated',
    'pedestrian_phys_cond_moderate_injury',
    'pedestrian_phys_cond_complaint_pain',
    'pedestrian_phys_cond_unknown',
    'cyclist_killed',
    'cyclist_incapacitated',
    'cyclist_complaint_of_pain',
    'cyclist_moderate_pain'
];

const filterDictonary = [
    {
        title: 'Crash Identifier',
        fieldName: 'crashid',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        },
        redacted: true
    },
    {
        title: 'Year',
        fieldName: 'year',
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'County',
        fieldName: 'mun_cty_co',
        values: [
            { code: '01', description: 'Atlantic' },
            { code: '02', description: 'Bergen' },
            { code: '03', description: 'Burlington' },
            { code: '04', description: 'Camden' },
            { code: '05', description: 'Cape May' },
            { code: '06', description: 'Cumberland' },
            { code: '07', description: 'Essex' },
            { code: '08', description: 'Gloucester' },
            { code: '09', description: 'Hudson' },
            { code: '10', description: 'Hunterdon' },
            { code: '11', description: 'Mercer' },
            { code: '12', description: 'Middlesex' },
            { code: '13', description: 'Monmouth' },
            { code: '14', description: 'Morris' },
            { code: '15', description: 'Ocean' },
            { code: '16', description: 'Passaic' },
            { code: '17', description: 'Salem' },
            { code: '18', description: 'Somerset' },
            { code: '19', description: 'Sussex' },
            { code: '20', description: 'Union' },
            { code: '21', description: 'Warren' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Municipality',
        fieldName: 'mun_mu',
        values: [
            { code: '0101', description: 'Absecon City' },
            { code: '0102', description: 'Atlantic City' },
            { code: '0103', description: 'Brigantine City' },
            { code: '0104', description: 'Buena Boro' },
            { code: '0105', description: 'Buena Vista Township' },
            { code: '0106', description: 'Corbin City' },
            { code: '0107', description: 'Egg Harbor City' },
            { code: '0108', description: 'Egg Harbor Township' },
            { code: '0109', description: 'Estell Manor City' },
            { code: '0110', description: 'Folsom Boro' },
            { code: '0111', description: 'Galloway Township' },
            { code: '0112', description: 'Hamilton Township' },
            { code: '0113', description: 'Hammonton Town' },
            { code: '0114', description: 'Linwood City' },
            { code: '0115', description: 'Longport Boro' },
            { code: '0116', description: 'Margate City' },
            { code: '0117', description: 'Mullica Township' },
            { code: '0118', description: 'Northfield City' },
            { code: '0119', description: 'Pleasantville City' },
            { code: '0120', description: 'Port Republic City' },
            { code: '0121', description: 'Somers Point City' },
            { code: '0122', description: 'Ventnor City' },
            { code: '0123', description: 'Weymouth Township' },
            { code: '0201', description: 'Allendale Boro' },
            { code: '0202', description: 'Alpine Boro' },
            { code: '0203', description: 'Bergenfield Boro' },
            { code: '0204', description: 'Bogota Boro' },
            { code: '0205', description: 'Carlstadt Boro' },
            { code: '0206', description: 'Cliffside Park Boro' },
            { code: '0207', description: 'Closter Boro' },
            { code: '0208', description: 'Cresskill Boro' },
            { code: '0209', description: 'Demarest Boro' },
            { code: '0210', description: 'Dumont Boro' },
            { code: '0211', description: 'Elmwood Park Boro' },
            { code: '0212', description: 'East Rutherford Boro' },
            { code: '0213', description: 'Edgewater Boro' },
            { code: '0214', description: 'Emerson Boro' },
            { code: '0215', description: 'Englewood City' },
            { code: '0216', description: 'Englewood Cliffs Boro' },
            { code: '0217', description: 'Fair Lawn Boro' },
            { code: '0218', description: 'Fairview Boro' },
            { code: '0219', description: 'Fort Lee Boro' },
            { code: '0220', description: 'Franklin Lakes Boro' },
            { code: '0221', description: 'Garfield City' },
            { code: '0222', description: 'Glen Rock Boro' },
            { code: '0223', description: 'Hackensack City' },
            { code: '0224', description: 'Harrington Park Boro' },
            { code: '0225', description: 'Hasbrouck Heights Boro' },
            { code: '0226', description: 'Haworth Boro' },
            { code: '0227', description: 'Hillsdale Boro' },
            { code: '0228', description: 'Ho Ho Kus Boro' },
            { code: '0229', description: 'Leonia Boro' },
            { code: '0230', description: 'Little Ferry Boro' },
            { code: '0231', description: 'Lodi Boro' },
            { code: '0232', description: 'Lyndhurst Township' },
            { code: '0233', description: 'Mahwah Township' },
            { code: '0234', description: 'Maywood Boro' },
            { code: '0235', description: 'Midland Park Boro' },
            { code: '0236', description: 'Montvale Boro' },
            { code: '0237', description: 'Moonachie Boro' },
            { code: '0238', description: 'New Milford Boro' },
            { code: '0239', description: 'North Arlington Boro' },
            { code: '0240', description: 'Northvale Boro' },
            { code: '0241', description: 'Norwood Boro' },
            { code: '0242', description: 'Oakland Boro' },
            { code: '0243', description: 'Old Tappan Boro' },
            { code: '0244', description: 'Oradell Boro' },
            { code: '0245', description: 'Palisades Park Boro' },
            { code: '0246', description: 'Paramus Boro' },
            { code: '0247', description: 'Park Ridge Boro' },
            { code: '0248', description: 'Ramsey Boro' },
            { code: '0249', description: 'Ridgefield Boro' },
            { code: '0250', description: 'Ridgefield Park Village' },
            { code: '0251', description: 'Ridgewood Village' },
            { code: '0252', description: 'River Edge Boro' },
            { code: '0253', description: 'River Vale Township' },
            { code: '0254', description: 'Rochelle Park Township' },
            { code: '0255', description: 'Rockleigh Boro' },
            { code: '0256', description: 'Rutherford Boro' },
            { code: '0257', description: 'Saddle Brook Township' },
            { code: '0258', description: 'Saddle River Boro' },
            { code: '0259', description: 'South Hackensack Township' },
            { code: '0260', description: 'Teaneck Township' },
            { code: '0261', description: 'Tenafly Boro' },
            { code: '0262', description: 'Teterboro Boro' },
            { code: '0263', description: 'Upper Saddle River Boro' },
            { code: '0264', description: 'Waldwick Boro' },
            { code: '0265', description: 'Wallington Boro' },
            { code: '0266', description: 'Washington Township' },
            { code: '0267', description: 'Westwood Boro' },
            { code: '0268', description: 'Woodcliff Lake Boro' },
            { code: '0269', description: 'Wood-Ridge Boro' },
            { code: '0270', description: 'Wyckoff Township' },
            { code: '0301', description: 'Bass River Township' },
            { code: '0302', description: 'Beverly City' },
            { code: '0303', description: 'Bordentown City' },
            { code: '0304', description: 'Bordentown Township' },
            { code: '0305', description: 'Burlington City' },
            { code: '0306', description: 'Burlington Township' },
            { code: '0307', description: 'Chesterfield Township' },
            { code: '0308', description: 'Cinnaminson Township' },
            { code: '0309', description: 'Delanco Township' },
            { code: '0310', description: 'Delran Township' },
            { code: '0311', description: 'Eastampton Township' },
            { code: '0312', description: 'Edgewater Park Township' },
            { code: '0313', description: 'Evesham Township' },
            { code: '0314', description: 'Fieldsboro Boro' },
            { code: '0315', description: 'Florence Township' },
            { code: '0316', description: 'Hainesport Township' },
            { code: '0317', description: 'Lumberton Township' },
            { code: '0318', description: 'Mansfield Township' },
            { code: '0319', description: 'Maple Shade Township' },
            { code: '0320', description: 'Medford Township' },
            { code: '0321', description: 'Medford Lakes Boro' },
            { code: '0322', description: 'Moorestown Township' },
            { code: '0323', description: 'Mount Holly Township' },
            { code: '0324', description: 'Mount Laurel Township' },
            { code: '0325', description: 'New Hanover Township' },
            { code: '0326', description: 'North Hanover Township' },
            { code: '0327', description: 'Palmyra Boro' },
            { code: '0328', description: 'Pemberton Boro' },
            { code: '0329', description: 'Pemberton Township' },
            { code: '0330', description: 'Riverside Township' },
            { code: '0331', description: 'Riverton Boro' },
            { code: '0332', description: 'Shamong Township' },
            { code: '0333', description: 'Southampton Township' },
            { code: '0334', description: 'Springfield Township' },
            { code: '0335', description: 'Tabernacle Township' },
            { code: '0336', description: 'Washington Township' },
            { code: '0337', description: 'Westampton Township' },
            { code: '0338', description: 'Willingboro Township' },
            { code: '0339', description: 'Woodland Township' },
            { code: '0340', description: 'Wrightstown Boro' },
            { code: '0401', description: 'Audubon Boro' },
            { code: '0402', description: 'Audubon Park Boro' },
            { code: '0403', description: 'Barrington Boro' },
            { code: '0404', description: 'Bellmawr Boro' },
            { code: '0405', description: 'Berlin Boro' },
            { code: '0406', description: 'Berlin Township' },
            { code: '0407', description: 'Brooklawn Boro' },
            { code: '0408', description: 'Camden City' },
            { code: '0409', description: 'Cherry Hill Township' },
            { code: '0410', description: 'Chesilhurst Boro' },
            { code: '0411', description: 'Clementon Boro' },
            { code: '0412', description: 'Collingswood Boro' },
            { code: '0413', description: 'Gibbsboro Boro' },
            { code: '0414', description: 'Gloucester City' },
            { code: '0415', description: 'Gloucester Township' },
            { code: '0416', description: 'Haddon Township' },
            { code: '0417', description: 'Haddonfield Boro' },
            { code: '0418', description: 'Haddon Heights Boro' },
            { code: '0419', description: 'Hi-Nella Boro' },
            { code: '0420', description: 'Laurel Springs Boro' },
            { code: '0421', description: 'Lawnside Boro' },
            { code: '0422', description: 'Lindenwold Boro' },
            { code: '0423', description: 'Magnolia Boro' },
            { code: '0424', description: 'Merchantville Boro' },
            { code: '0425', description: 'Mount Ephriam Boro' },
            { code: '0426', description: 'Oaklyn Boro' },
            { code: '0427', description: 'Pennsauken Township' },
            { code: '0428', description: 'Pine Hill Boro' },
            { code: '0429', description: 'Pine Valley Boro' },
            { code: '0430', description: 'Runnemede Boro' },
            { code: '0431', description: 'Somerdale Boro' },
            { code: '0432', description: 'Stratford Boro' },
            { code: '0433', description: 'Tavistock Boro' },
            { code: '0434', description: 'Voorhees Township' },
            { code: '0435', description: 'Waterford Township' },
            { code: '0436', description: 'Winslow Township' },
            { code: '0437', description: 'Woodlynne Boro' },
            { code: '0501', description: 'Avalon Boro' },
            { code: '0502', description: 'Cape May City' },
            { code: '0503', description: 'Cape May Point Boro' },
            { code: '0504', description: 'Dennis Township' },
            { code: '0505', description: 'Lower Township' },
            { code: '0506', description: 'Middle Township' },
            { code: '0507', description: 'North Wildwood City' },
            { code: '0508', description: 'Ocean City' },
            { code: '0509', description: 'Sea Isle City' },
            { code: '0510', description: 'Stone Harbor Boro' },
            { code: '0511', description: 'Upper Township' },
            { code: '0512', description: 'West Cape May Boro' },
            { code: '0513', description: 'West Wildwood Boro' },
            { code: '0514', description: 'Wildwood City' },
            { code: '0515', description: 'Wildwood Crest Boro' },
            { code: '0516', description: 'Woodbine Boro' },
            { code: '0601', description: 'Bridgeton City' },
            { code: '0602', description: 'Commercial Township' },
            { code: '0603', description: 'Deerfield Township' },
            { code: '0604', description: 'Downe Township' },
            { code: '0605', description: 'Fairfield Township' },
            { code: '0606', description: 'Greenwich Township' },
            { code: '0607', description: 'Hopewell Township' },
            { code: '0608', description: 'Lawrence Township' },
            { code: '0609', description: 'Maurice River Township' },
            { code: '0610', description: 'Millville City' },
            { code: '0611', description: 'Shiloh Boro' },
            { code: '0612', description: 'Stow Creek Township' },
            { code: '0613', description: 'Upper Deerfield Township' },
            { code: '0614', description: 'Vineland City' },
            { code: '0701', description: 'Belleville Township' },
            { code: '0702', description: 'Bloomfield Township' },
            { code: '0703', description: 'Caldwell Boro' },
            { code: '0704', description: 'Cedar Grove Township' },
            { code: '0705', description: 'East Orange City' },
            { code: '0706', description: 'Essex Fells Boro' },
            { code: '0707', description: 'Fairfield Boro' },
            { code: '0708', description: 'Glen Ridge Boro' },
            { code: '0709', description: 'Irvington Township' },
            { code: '0710', description: 'Livingston Township' },
            { code: '0711', description: 'Maplewood Township' },
            { code: '0712', description: 'Millburn Township' },
            { code: '0713', description: 'Montclair Township' },
            { code: '0714', description: 'Newark City' },
            { code: '0715', description: 'North Caldwell Boro' },
            { code: '0716', description: 'Nutley Township' },
            { code: '0717', description: 'Orange City' },
            { code: '0718', description: 'Roseland Boro' },
            { code: '0719', description: 'South Orange Village Township' },
            { code: '0720', description: 'Verona Township' },
            { code: '0721', description: 'West Caldwell Township' },
            { code: '0722', description: 'West Orange Township' },
            { code: '0801', description: 'Clayton Boro' },
            { code: '0802', description: 'Deptford Township' },
            { code: '0803', description: 'East Greenwich Township' },
            { code: '0804', description: 'Elk Township' },
            { code: '0805', description: 'Franklin Township' },
            { code: '0806', description: 'Glassboro Boro' },
            { code: '0807', description: 'Greenwich Township' },
            { code: '0808', description: 'Harrison Township' },
            { code: '0809', description: 'Logan Township' },
            { code: '0810', description: 'Mantua Township' },
            { code: '0811', description: 'Monroe Township' },
            { code: '0812', description: 'National Park Boro' },
            { code: '0813', description: 'Newfield Boro' },
            { code: '0814', description: 'Paulsboro Boro' },
            { code: '0815', description: 'Pitman Boro' },
            { code: '0816', description: 'South Harrison Township' },
            { code: '0817', description: 'Swedesboro Boro' },
            { code: '0818', description: 'Washington Township' },
            { code: '0819', description: 'Wenonah Boro' },
            { code: '0820', description: 'West Deptford Township' },
            { code: '0821', description: 'Westville Boro' },
            { code: '0822', description: 'Woodbury City' },
            { code: '0823', description: 'Woodbury Heights Boro' },
            { code: '0824', description: 'Woolwich Township' },
            { code: '0901', description: 'Bayonne City' },
            { code: '0902', description: 'East Newark Boro' },
            { code: '0903', description: 'Guttenberg Town' },
            { code: '0904', description: 'Harrison Town' },
            { code: '0905', description: 'Hoboken City' },
            { code: '0906', description: 'Jersey City' },
            { code: '0907', description: 'Kearny Town' },
            { code: '0908', description: 'North Bergen Township' },
            { code: '0909', description: 'Secaucus Town' },
            { code: '0910', description: 'Union City' },
            { code: '0911', description: 'Weehawken Township' },
            { code: '0912', description: 'West New York Town' },
            { code: '1001', description: 'Alexandria Township' },
            { code: '1002', description: 'Bethlehem Township' },
            { code: '1003', description: 'Bloomsbury Boro' },
            { code: '1004', description: 'Califon Boro' },
            { code: '1005', description: 'Clinton Town' },
            { code: '1006', description: 'Clinton Township' },
            { code: '1007', description: 'Delaware Township' },
            { code: '1008', description: 'East Amwell Township' },
            { code: '1009', description: 'Flemington Boro' },
            { code: '1010', description: 'Franklin Township' },
            { code: '1011', description: 'Frenchtown Boro' },
            { code: '1012', description: 'Glen Gardner Boro' },
            { code: '1013', description: 'Hampton Boro' },
            { code: '1014', description: 'High Bridge Boro' },
            { code: '1015', description: 'Holland Township' },
            { code: '1016', description: 'Kingwood Township' },
            { code: '1017', description: 'Lambertville City' },
            { code: '1018', description: 'Lebanon Boro' },
            { code: '1019', description: 'Lebanon Township' },
            { code: '1020', description: 'Milford Township' },
            { code: '1021', description: 'Raritan Township' },
            { code: '1022', description: 'Readington Township' },
            { code: '1023', description: 'Stockton Boro' },
            { code: '1024', description: 'Tewksbury Township' },
            { code: '1025', description: 'Union Township' },
            { code: '1026', description: 'West Amwell Township' },
            { code: '1101', description: 'East Windsor Township' },
            { code: '1102', description: 'Ewing Township' },
            { code: '1103', description: 'Hamilton Township' },
            { code: '1104', description: 'Hightstown Boro' },
            { code: '1105', description: 'Hopewell Boro' },
            { code: '1106', description: 'Hopewell Township' },
            { code: '1107', description: 'Lawrence Township' },
            { code: '1108', description: 'Pennington Boro' },
            { code: '1109', description: 'Princeton Boro' },
            { code: '1110', description: 'Princeton Township' },
            { code: '1111', description: 'Trenton City' },
            { code: '1112', description: 'Robbinsville Township' },
            { code: '1113', description: 'West Windsor Township' },
            { code: '1114', description: 'Princeton' },
            { code: '1201', description: 'Carteret Boro' },
            { code: '1202', description: 'Cranbury Township' },
            { code: '1203', description: 'Dunellen Boro' },
            { code: '1204', description: 'East Brunswick Township' },
            { code: '1205', description: 'Edison Township' },
            { code: '1206', description: 'Helmetta Boro' },
            { code: '1207', description: 'Highland Park Boro' },
            { code: '1208', description: 'Jamesburg Boro' },
            { code: '1209', description: 'Old Bridge Township' },
            { code: '1210', description: 'Metuchen Boro' },
            { code: '1211', description: 'Middlesex Boro' },
            { code: '1212', description: 'Milltown Boro' },
            { code: '1213', description: 'Monroe Township' },
            { code: '1214', description: 'New Brunswick City' },
            { code: '1215', description: 'North Brunswick Township' },
            { code: '1216', description: 'Perth Amboy City' },
            { code: '1217', description: 'Piscataway Township' },
            { code: '1218', description: 'Plainsboro Township' },
            { code: '1219', description: 'Sayreville Boro' },
            { code: '1220', description: 'South Amboy City' },
            { code: '1221', description: 'South Brunswick Township' },
            { code: '1222', description: 'South Plainfield Boro' },
            { code: '1223', description: 'South River Boro' },
            { code: '1224', description: 'Spotswood Boro' },
            { code: '1225', description: 'Woodbridge Township' },
            { code: '1301', description: 'Allenhurst Boro' },
            { code: '1302', description: 'Allentown Boro' },
            { code: '1303', description: 'Asbury Park City' },
            { code: '1304', description: 'Atlantic Highlands Boro' },
            { code: '1305', description: 'Avon-By-The-Sea Boro' },
            { code: '1306', description: 'Belmar Boro' },
            { code: '1307', description: 'Bradley Beach Boro' },
            { code: '1308', description: 'Brielle Boro' },
            { code: '1309', description: 'Colts Neck Township' },
            { code: '1310', description: 'Deal Boro' },
            { code: '1311', description: 'Eatontown Boro' },
            { code: '1312', description: 'Englishtown Boro' },
            { code: '1313', description: 'Fair Haven Boro' },
            { code: '1314', description: 'Farmingdale Boro' },
            { code: '1315', description: 'Freehold Boro' },
            { code: '1316', description: 'Freehold Township' },
            { code: '1317', description: 'Highlands Boro' },
            { code: '1318', description: 'Holmdel Township' },
            { code: '1319', description: 'Howell Township' },
            { code: '1320', description: 'Interlaken Boro' },
            { code: '1321', description: 'Keansburg Boro' },
            { code: '1322', description: 'Keyport Boro' },
            { code: '1323', description: 'Little Silver Boro' },
            { code: '1324', description: 'Loch Arbour Village' },
            { code: '1325', description: 'Long Branch City' },
            { code: '1326', description: 'Manalapan Township' },
            { code: '1327', description: 'Manasquan Boro' },
            { code: '1328', description: 'Marlboro Township' },
            { code: '1329', description: 'Matawan Boro' },
            { code: '1330', description: 'Aberdeen Township' },
            { code: '1331', description: 'Middletown Township' },
            { code: '1332', description: 'Millstone Township' },
            { code: '1333', description: 'Monmouth Beach Boro' },
            { code: '1334', description: 'Neptune Township' },
            { code: '1335', description: 'Neptune City Boro' },
            { code: '1336', description: 'Tinton Falls Boro' },
            { code: '1337', description: 'Ocean Township' },
            { code: '1338', description: 'Oceanport Boro' },
            { code: '1339', description: 'Hazlet Township' },
            { code: '1340', description: 'Red Bank Boro' },
            { code: '1341', description: 'Roosevelt Boro' },
            { code: '1342', description: 'Rumson Boro' },
            { code: '1343', description: 'Sea Bright Boro' },
            { code: '1344', description: 'Sea Girt Boro' },
            { code: '1345', description: 'Shrewsbury Boro' },
            { code: '1346', description: 'Shrewsbury Township' },
            { code: '1347', description: 'Lake Como Boro' },
            { code: '1348', description: 'Spring Lake Boro' },
            { code: '1349', description: 'Spring Lake Heights Boro' },
            { code: '1350', description: 'Union Beach Boro' },
            { code: '1351', description: 'Upper Freehold Township' },
            { code: '1352', description: 'Wall Township' },
            { code: '1353', description: 'West Long Branch Boro' },
            { code: '1401', description: 'Boonton Town' },
            { code: '1402', description: 'Boonton Township' },
            { code: '1403', description: 'Butler Boro' },
            { code: '1404', description: 'Chatham Boro' },
            { code: '1405', description: 'Chatham Township' },
            { code: '1406', description: 'Chester Boro' },
            { code: '1407', description: 'Chester Township' },
            { code: '1408', description: 'Denville Township' },
            { code: '1409', description: 'Dover Town' },
            { code: '1410', description: 'East Hanover Township' },
            { code: '1411', description: 'Florham Park Boro' },
            { code: '1412', description: 'Hanover Township' },
            { code: '1413', description: 'Harding Township' },
            { code: '1414', description: 'Jefferson Township' },
            { code: '1415', description: 'Kinnelon Boro' },
            { code: '1416', description: 'Lincoln Park Boro' },
            { code: '1417', description: 'Madison Boro' },
            { code: '1418', description: 'Mendham Boro' },
            { code: '1419', description: 'Mendham Township' },
            { code: '1420', description: 'Mine Hill Township' },
            { code: '1421', description: 'Montville Township' },
            { code: '1422', description: 'Morris Township' },
            { code: '1423', description: 'Morris Plains Boro' },
            { code: '1424', description: 'Morristown Town' },
            { code: '1425', description: 'Mountain Lakes Boro' },
            { code: '1426', description: 'Mount Arlington Boro' },
            { code: '1427', description: 'Mount Olive Township' },
            { code: '1428', description: 'Netcong Boro' },
            { code: '1429', description: 'Parsippany-Troy Hills' },
            { code: '1430', description: 'Passaic Township' },
            { code: '1431', description: 'Pequannock Township' },
            { code: '1432', description: 'Randolph Township' },
            { code: '1433', description: 'Riverdale Boro' },
            { code: '1434', description: 'Rockaway Boro' },
            { code: '1435', description: 'Rockaway Township' },
            { code: '1436', description: 'Roxbury Township' },
            { code: '1437', description: 'Victory Gardens Boro' },
            { code: '1438', description: 'Washington Township' },
            { code: '1439', description: 'Wharton Boro' },
            { code: '1501', description: 'Barnegat Light Boro' },
            { code: '1502', description: 'Bay Head Boro' },
            { code: '1503', description: 'Beach Haven Boro' },
            { code: '1504', description: 'Beachwood Boro' },
            { code: '1505', description: 'Berkeley Township' },
            { code: '1506', description: 'Brick Township' },
            { code: '1507', description: 'Toms River Township' },
            { code: '1508', description: 'Eagleswood Township' },
            { code: '1509', description: 'Harvey Cedars Boro' },
            { code: '1510', description: 'Island Heights Boro' },
            { code: '1511', description: 'Jackson Township' },
            { code: '1512', description: 'Lacey Township' },
            { code: '1513', description: 'Lakehurst Boro' },
            { code: '1514', description: 'Lakewood Township' },
            { code: '1515', description: 'Lavallette Boro' },
            { code: '1516', description: 'Little Egg Harbor Township' },
            { code: '1517', description: 'Long Beach Township' },
            { code: '1518', description: 'Manchester Township' },
            { code: '1519', description: 'Mantoloking Boro' },
            { code: '1520', description: 'Ocean Township' },
            { code: '1521', description: 'Ocean Gate Boro' },
            { code: '1522', description: 'Pine Beach Boro' },
            { code: '1523', description: 'Plumsted Township' },
            { code: '1524', description: 'Point Pleasant Boro' },
            { code: '1525', description: 'Pt Pleasant Beach Boro' },
            { code: '1526', description: 'Seaside Heights Boro' },
            { code: '1527', description: 'Seaside Park Boro' },
            { code: '1528', description: 'Ship Bottom Boro' },
            { code: '1529', description: 'South Toms River Boro' },
            { code: '1530', description: 'Stafford Township' },
            { code: '1531', description: 'Surf City Boro' },
            { code: '1532', description: 'Tuckerton Boro' },
            { code: '1533', description: 'Barnegat Township' },
            { code: '1601', description: 'Bloomingdale Boro' },
            { code: '1602', description: 'Clifton City' },
            { code: '1603', description: 'Haledon Boro' },
            { code: '1604', description: 'Hawthorne Boro' },
            { code: '1605', description: 'Little Falls Township' },
            { code: '1606', description: 'North Haledon Boro' },
            { code: '1607', description: 'Passaic City' },
            { code: '1608', description: 'Paterson City' },
            { code: '1609', description: 'Pompton Lakes Boro' },
            { code: '1610', description: 'Prospect Park Boro' },
            { code: '1611', description: 'Ringwood Boro' },
            { code: '1612', description: 'Totowa Boro' },
            { code: '1613', description: 'Wanaque Boro' },
            { code: '1614', description: 'Wayne Township' },
            { code: '1615', description: 'West Milford Township' },
            { code: '1616', description: 'Woodland Park Boro' },
            { code: '1701', description: 'Alloway Township' },
            { code: '1702', description: 'Elmer Boro' },
            { code: '1703', description: 'Elsinboro Township' },
            { code: '1704', description: 'Lower Alloways Crk Township' },
            { code: '1705', description: 'Mannington Township' },
            { code: '1706', description: 'Oldmans Township' },
            { code: '1707', description: 'Penns Grove Boro' },
            { code: '1708', description: 'Pennsville Township' },
            { code: '1709', description: 'Pilesgrove Township' },
            { code: '1710', description: 'Pittsgrove Township' },
            { code: '1711', description: 'Quinton Township' },
            { code: '1712', description: 'Salem City' },
            { code: '1713', description: 'Carneys Point Township' },
            { code: '1714', description: 'Upper Pittsgrove Township' },
            { code: '1715', description: 'Woodstown Boro' },
            { code: '1801', description: 'Bedminster Township' },
            { code: '1802', description: 'Bernards Township' },
            { code: '1803', description: 'Bernardsville Boro' },
            { code: '1804', description: 'Bound Brook Boro' },
            { code: '1805', description: 'Branchburg Township' },
            { code: '1806', description: 'Bridgewater Township' },
            { code: '1807', description: 'Far Hills Boro' },
            { code: '1808', description: 'Franklin Township' },
            { code: '1809', description: 'Green Brook Township' },
            { code: '1810', description: 'Hillsborough Township' },
            { code: '1811', description: 'Manville Boro' },
            { code: '1812', description: 'Millstone Boro' },
            { code: '1813', description: 'Montgomery Township' },
            { code: '1814', description: 'North Plainfield Boro' },
            { code: '1815', description: 'Peapack-Gladstone Boro' },
            { code: '1816', description: 'Raritan Boro' },
            { code: '1817', description: 'Rocky Hill Boro' },
            { code: '1818', description: 'Somerville Boro' },
            { code: '1819', description: 'South Bound Brook Boro' },
            { code: '1820', description: 'Warren Township' },
            { code: '1821', description: 'Watchung Boro' },
            { code: '1901', description: 'Andover Boro' },
            { code: '1902', description: 'Andover Township' },
            { code: '1903', description: 'Branchville Boro' },
            { code: '1904', description: 'Byram Township' },
            { code: '1905', description: 'Frankford Township' },
            { code: '1906', description: 'Franklin Boro' },
            { code: '1907', description: 'Fredon Township' },
            { code: '1908', description: 'Green Township' },
            { code: '1909', description: 'Hamburg Boro' },
            { code: '1910', description: 'Hampton Township' },
            { code: '1911', description: 'Hardyston Township' },
            { code: '1912', description: 'Hopatcong Boro' },
            { code: '1913', description: 'Lafayette Township' },
            { code: '1914', description: 'Montague Township' },
            { code: '1915', description: 'Newton Town' },
            { code: '1916', description: 'Ogdensburg Boro' },
            { code: '1917', description: 'Sandvston Township' },
            { code: '1918', description: 'Sparta Township' },
            { code: '1919', description: 'Stanhope Boro' },
            { code: '1920', description: 'Stillwater Township' },
            { code: '1921', description: 'Sussex Boro' },
            { code: '1922', description: 'Vernon Township' },
            { code: '1923', description: 'Walpack Township' },
            { code: '1924', description: 'Wantage Township' },
            { code: '2001', description: 'Berkeley Heights Township' },
            { code: '2002', description: 'Clark Township' },
            { code: '2003', description: 'Cranford Township' },
            { code: '2004', description: 'Elizabeth City' },
            { code: '2005', description: 'Fanwood Boro' },
            { code: '2006', description: 'Garwood Boro' },
            { code: '2007', description: 'Hillside Township' },
            { code: '2008', description: 'Kenilworth Boro' },
            { code: '2009', description: 'Linden City' },
            { code: '2010', description: 'Mountainside Boro' },
            { code: '2011', description: 'New Providence Boro' },
            { code: '2012', description: 'Plainfield City' },
            { code: '2013', description: 'Rahway City' },
            { code: '2014', description: 'Roselle Boro' },
            { code: '2015', description: 'Roselle Park Boro' },
            { code: '2016', description: 'Scotch Plains Township' },
            { code: '2017', description: 'Springfield Township' },
            { code: '2018', description: 'Summit City' },
            { code: '2019', description: 'Union Township' },
            { code: '2020', description: 'Westfield Town' },
            { code: '2021', description: 'Winfield Township' },
            { code: '2101', description: 'Allamuchy Township' },
            { code: '2102', description: 'Alpha Boro' },
            { code: '2103', description: 'Belvidere Town' },
            { code: '2104', description: 'Blairstown Township' },
            { code: '2105', description: 'Franklin Township' },
            { code: '2106', description: 'Frelinghuysen Township' },
            { code: '2107', description: 'Greenwich Township' },
            { code: '2108', description: 'Hackettstown Town' },
            { code: '2109', description: 'Hardwick Township' },
            { code: '2110', description: 'Harmony Township' },
            { code: '2111', description: 'Hope Township' },
            { code: '2112', description: 'Independence Township' },
            { code: '2113', description: 'Knowlton Township' },
            { code: '2114', description: 'Liberty Township' },
            { code: '2115', description: 'Lopatcong Township' },
            { code: '2116', description: 'Mansfield Township' },
            { code: '2117', description: 'Oxford Township' },
            { code: '2118', description: 'Pahaquarry Township' },
            { code: '2119', description: 'Phillipsburg Town' },
            { code: '2120', description: 'Pohatcong Township' },
            { code: '2121', description: 'Washington Boro' },
            { code: '2122', description: 'Washington Township' },
            { code: '2123', description: 'White Township' }
        ],
        query: function (input) {
            return createQueryClauseMunicipality(tableName, input);
        }
    },
    {
        title: 'Case #',
        fieldName: 'acc_case',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Document Locator #',
        fieldName: 'dln',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Department Type',
        fieldName: 'dept_num',
        values: [
            { code: '01', description: 'Municipal Police' },
            { code: '02', description: 'State Police' },
            { code: '03', description: 'County Police' },
            { code: '04', description: 'Port Authority Police' },
            { code: '99', description: 'Other' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Police Department Name',
        fieldName: 'dept_name',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Station',
        fieldName: 'station',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    { title: 'Crash Date', fieldName: 'acc_date' },
    {
        title: 'Crash Date',
        fieldName: 'date_range',
        query: function (input) {
            return createQueryDateRange(tableName, input);
        }
    },
    {
        title: 'Crash Day',
        fieldName: 'acc_dow',
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    { title: 'Crash Time', fieldName: 'acc_time' },
    {
        title: 'Crash Time',
        fieldName: 'time_range',
        query: function (input) {
            return createTimeDateRange(tableName, input);
        }
    },
    {
        title: 'Severity',
        fieldName: 'severity_code',
        values: [
            { code: 'F', description: 'Fatality' },
            { code: 'I', description: 'Injury' },
            { code: 'P', description: 'Property Damage Only' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Severity Rating 5',
        fieldName: 'severity_rating5',
        values: [
            { code: '5', description: 'Fatal Injury' },
            { code: '4', description: 'Suspected Serious Injury' },
            { code: '3', description: 'Suspected Minor Injury' },
            { code: '2', description: 'Possible Injury' },
            { code: '1', description: 'No Apparent Injury' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Intersection',
        fieldName: 'intersection',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Alcohol Involved',
        fieldName: 'alcohol_involved',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Hazardous Materials Involved',
        fieldName: 'hazmat_involved',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    { title: 'Collision Type', fieldName: 'hs_collision_type' },
    { title: 'Fixed Object Collision', fieldName: 'hs_fixed_object' },
    {
        title: 'Crash Type',
        fieldName: 'crash_type',
        values: [
            { code: '01', description: 'Same Direction - Rear End' },
            { code: '02', description: 'Same Direction - Sideswipe' },
            { code: '03', description: 'Right Angle' },
            { code: '04', description: 'Opposite Direction (Head On/ Angular)' },
            { code: '05', description: 'Opposite Direction (Sideswipe)' },
            { code: '06', description: 'Struck Parked Vehicle' },
            { code: '07', description: 'Left Turn/U Turn' },
            { code: '08', description: 'Backing' },
            { code: '09', description: 'Encroachment' },
            { code: '10', description: 'Overturned' },
            { code: '11', description: 'Fixed Object' },
            { code: '12', description: 'Animal' },
            { code: '13', description: 'Pedestrian' },
            { code: '14', description: 'Pedalcyclist' },
            { code: '15', description: 'Non-fixed Object' },
            { code: '16', description: 'Railcar - vehicle' },
            { code: '99', description: 'Other' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' },
            { code: '20', description: 'Value Unknown' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Total Vehicles Involved',
        fieldName: 'tot_veh_involved',
        query: function (input) {
            return createQueryVehicleTotal(this, tableName, input);
        }
    },
    {
        title: 'Location',
        fieldName: 'location',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Location Direction',
        fieldName: 'location_dir',
        values: [
            { code: 'N', description: 'North' },
            { code: 'E', description: 'East' },
            { code: 'S', description: 'South' },
            { code: 'W', description: 'West' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Route #',
        fieldName: 'route_num',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Route Suffix',
        fieldName: 'route_sx',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'SRI',
        fieldName: 'sri',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Milepost',
        fieldName: 'milepost',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Starting Milepost',
        fieldName: 'mp_start',
        query: function (startMp) {
            return createQueryMilepost(startMp, 'start', tableName);
        }
    },
    {
        title: 'Ending Milepost',
        fieldName: 'mp_end',
        query: function (endMp) {
            return createQueryMilepost(endMp, 'end', tableName);
        }
    },
    {
        title: 'Road System',
        fieldName: 'road_sys_code',
        values: [
            { code: '01', description: 'Interstate' },
            { code: '02', description: 'State Highway' },
            { code: '03', description: 'State/Interstate Authority' },
            { code: '04', description: 'State Park or Institution' },
            { code: '05', description: 'County' },
            { code: '06', description: 'County Authority Park or Institution' },
            { code: '07', description: 'Municipal' },
            { code: '08', description: 'Municipal Authority Park or Institution' },
            { code: '09', description: 'Private Property' },
            { code: '10', description: 'U.S. Government Property' },
            { code: '99', description: 'Other' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Road Characteristic',
        fieldName: 'road_char_code',
        values: [
            { code: '01', description: 'Straight and Level' },
            { code: '02', description: 'Straight and Grade' },
            { code: '03', description: 'Straight and Hillcrest' },
            { code: '04', description: 'Curve and Level' },
            { code: '05', description: 'Curve and Grade' },
            { code: '06', description: 'Curve at Hillcrest' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Road Horizontal Alignment',
        fieldName: 'road_horiz_align_code',
        values: [
            { code: '01', description: 'Straight' },
            { code: '02', description: 'Curved Left' },
            { code: '03', description: 'Curved Right' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Road Grade',
        fieldName: 'road_grade_code',
        values: [
            { code: '04', description: 'Level' },
            { code: '05', description: 'Down Hill' },
            { code: '06', description: 'Up Hill' },
            { code: '07', description: 'Hill Crest' },
            { code: '08', description: 'Sag (Bottom)' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Road Surface Type',
        fieldName: 'road_surf_code',
        values: [
            { code: '01', description: 'Concrete' },
            { code: '02', description: 'Blacktop' },
            { code: '03', description: 'Gravel' },
            { code: '04', description: 'Steel Grid' },
            { code: '05', description: 'Dirt' },
            { code: '99', description: 'Other' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Road Surface Condition',
        fieldName: 'surf_cond_code',
        values: [
            { code: '01', description: 'Dry' },
            { code: '02', description: 'Wet' },
            { code: '03', description: 'Snowy' },
            { code: '04', description: 'Icy' },
            { code: '05', description: 'Slush' },
            { code: '06', description: 'Water (Standing/Moving)' },
            { code: '07', description: 'Sand' },
            { code: '08', description: 'Oil' },
            { code: '99', description: 'Other' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Light Condition',
        fieldName: 'light_cond_code',
        values: [
            { code: '01', description: 'Daylight' },
            { code: '02', description: 'Dawn' },
            { code: '03', description: 'Dusk' },
            { code: '04', description: 'Dark (street lights off)' },
            { code: '05', description: 'Dark (no street lights)' },
            { code: '06', description: 'Dark (street lights on continuous)' },
            { code: '07', description: 'Dark (street lights on spot)' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Environmental Condition',
        fieldName: 'environ_cond_code',
        values: [
            { code: '01', description: 'Clear' },
            { code: '02', description: 'Rain' },
            { code: '03', description: 'Snow' },
            { code: '04', description: 'Fog/Smog/Smoke' },
            { code: '05', description: 'Overcast' },
            { code: '06', description: 'Sleet/Hail/Freezing Rain' },
            { code: '07', description: 'Blowing Snow' },
            { code: '08', description: 'Blowing Sand/Dirt' },
            { code: '09', description: 'Severe Crosswinds' },
            { code: '99', description: 'Other' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Median Type(s)',
        fieldName: 'road_median_code',
        values: [
            { code: '01', description: 'Barrier Median' },
            { code: '02', description: 'Curbed Median' },
            { code: '03', description: 'Grass Median' },
            { code: '04', description: 'Painted Median' },
            { code: '05', description: 'None' },
            { code: '99', description: 'Other' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Temporary Traffic Control Zone',
        fieldName: 'temp_traffic_zone',
        values: [
            { code: '01', description: 'None' },
            { code: '02', description: 'Construction Zone' },
            { code: '03', description: 'Maintenance Zone' },
            { code: '04', description: 'Utility Zone' },
            { code: '05', description: 'Incident Zone' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'NOT RECORDED' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Distance to Cross Street',
        fieldName: 'dist_to_xstreet',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Distance to Cross Street Unit',
        fieldName: 'dist_xstreet_unit',
        values: [
            { code: 'AT', description: 'At Intersection' },
            { code: 'FE', description: 'Feet' },
            { code: 'MI', description: 'Miles' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'NOT RECORDED' }
        ],
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Direction from Cross Street',
        fieldName: 'dir_from_xstreet',
        values: [
            { code: 'N', description: 'North' },
            { code: 'E', description: 'East' },
            { code: 'S', description: 'South' },
            { code: 'W', description: 'West' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Cross Street Name',
        fieldName: 'xstreet_name',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Is Ramp?',
        fieldName: 'is_ramp',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Ramp Route',
        fieldName: 'ramp_route',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Ramp Direction',
        fieldName: 'ramp_direction',
        values: [
            { code: '01', description: 'North' },
            { code: '02', description: 'East' },
            { code: '03', description: 'South' },
            { code: '04', description: 'West' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Longitude',
        fieldName: 'latitude',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Latitude',
        fieldName: 'longitude',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Posted Speed',
        fieldName: 'posted_speed',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Posted Speed Cross Street',
        fieldName: 'posted_speed_xstreet',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'First Harmful Event',
        fieldName: 'first_harmful_event',
        values: [
            { code: '01', description: 'Overturn / Rollover' },
            { code: '02', description: 'Fire / Explosion' },
            { code: '03', description: 'Immersion' },
            { code: '04', description: 'Jackknife' },
            { code: '05', description: 'Ran Off Road - Right' },
            { code: '06', description: 'Ran Off Road - Left' },
            { code: '07', description: 'Crossed Median / Centerline' },
            { code: '08', description: 'Downhill Runaway' },
            { code: '09', description: 'Cargo / Equipment Loss or Shift' },
            { code: '10', description: 'Separation of Units' },
            { code: '11', description: 'Fell / Jumped From Vehicle' },
            { code: '12', description: 'Thrown / Falling Object' },
            { code: '13', description: 'Equipment Failure' },
            { code: '19', description: 'Other Non Collision' },

            { code: '21', description: 'Pedalcyclist' },
            { code: '22', description: 'Pedestrian' },
            { code: '23', description: 'Train / Trolley / Other Railcar' },
            { code: '24', description: 'Deer' },
            { code: '25', description: 'Other Animal' },
            { code: '26', description: 'MV in Transport' },
            { code: '27', description: 'MV in Transport, Other Roadway' },
            { code: '28', description: 'Parked MV' },
            { code: '29', description: 'Work Zone or Maint. Equipment' },
            { code: '30', description: 'Struck By Object Set In Motion By MV' },
            { code: '39', description: 'Other Non-Fixed Object' },

            { code: '41', description: 'Impact Attenuator / Crash Cushion' },
            { code: '42', description: 'Bridge Overhead Structure' },
            { code: '43', description: 'Bridge Pier or Support' },
            { code: '44', description: 'Bridge Parapet End' },
            { code: '45', description: 'Bridge Rail' },
            { code: '46', description: 'Guardrail Face' },
            { code: '47', description: 'Guardrail End' },
            { code: '48', description: 'Concrete Traffic Barrier' },
            { code: '49', description: 'Other Traffic Barrier' },
            { code: '50', description: 'Traffic Sign Support ' },
            { code: '51', description: 'Traffic Signal Standard' },
            { code: '52', description: 'Utility Pole' },
            { code: '53', description: 'Light Standard' },
            { code: '54', description: 'Other Post, Pole, Support' },
            { code: '55', description: 'Culvert' },
            { code: '56', description: 'Curb' },
            { code: '57', description: 'Ditch' },
            { code: '58', description: 'Embankment' },
            { code: '59', description: 'Fence' },
            { code: '60', description: 'Tree' },
            { code: '61', description: 'Mailbox' },
            { code: '62', description: 'Fire Hydrant' },
            { code: '69', description: 'Other Fixed Object' },
            { code: '99', description: 'Other' },
            { code: '00', description: 'Unknown' },
            { code: '-20', description: 'Not Recorded' },
            { code: '20', description: 'Value Unknown' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Other Property Damage',
        fieldName: 'other_prop_damage',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Report Badge #',
        fieldName: 'report_badge_num',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Review Badge #',
        fieldName: 'review_badge_num',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Cellphone In Use',
        fieldName: 'flg_cell_in_use',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        }
    },
    {
        title: 'Crash Month',
        fieldName: 'acc_month',
        values: [
            { code: 1, description: 'January' },
            { code: 2, description: 'February' },
            { code: 3, description: 'March' },
            { code: 4, description: 'April' },
            { code: 5, description: 'May' },
            { code: 6, description: 'June' },
            { code: 7, description: 'July' },
            { code: 8, description: 'August' },
            { code: 9, description: 'September' },
            { code: 10, description: 'October' },
            { code: 11, description: 'November' },
            { code: 12, description: 'December' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Driver Physical Condition: Apparently Normal',
        fieldName: 'driver_phys_apptly_nrml',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Alcohol Use',
        fieldName: 'driver_phys_alcl_use',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Illicit Drug Use',
        fieldName: 'driver_phys_drug_use_illicit',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Medication',
        fieldName: 'driver_phys_medication',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Alcohol, Drug, Meds Use',
        fieldName: 'driver_phys_alcl_drug_med_use',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Handicaps',
        fieldName: 'driver_phys_handicaps',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Illness',
        fieldName: 'driver_phys_illness',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Fatigue',
        fieldName: 'driver_phys_fatigue',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Fell Asleep',
        fieldName: 'driver_phys_fell_aslp',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Other',
        fieldName: 'driver_phys_other',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Unknown',
        fieldName: 'driver_phys_unknown',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Driver Physical Condition: Not Recorded',
        fieldName: 'driver_phys_not_recorded',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },

    {
        title: 'Cyclist Involved',
        fieldName: 'cyclist_involved',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },

    {
        title: 'Traffic Control: Police Officer',
        fieldName: 'trf_ctrl_police_officer',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: RR Watchman',
        fieldName: 'trf_ctrl_rr_watchman',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Traffic Signal',
        fieldName: 'trf_ctrl_traffic_signal',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Lane Markings',
        fieldName: 'trf_ctrl_lane_markings',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Channelization Painted',
        fieldName: 'trf_ctrl_channelization_painted',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Channelization Phys.',
        fieldName: 'trf_ctrl_channelization_physical',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Warning Signal',
        fieldName: 'trf_ctrl_warning_signal',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Stop Sign',
        fieldName: 'trf_ctrl_stop_sign',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Yield Sign',
        fieldName: 'trf_ctrl_yield_sign',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Flagman',
        fieldName: 'trf_ctrl_flagman',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: None Present',
        fieldName: 'trf_ctrl_no_control_present',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Flashing',
        fieldName: 'trf_ctrl_flashing_traffic_control',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: School Zone Signs',
        fieldName: 'trf_ctrl_school_zone_signs_controls',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Crossing Guard',
        fieldName: 'trf_ctrl_adult_crossing_guard',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Other',
        fieldName: 'trf_ctrl_other',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Unknown',
        fieldName: 'trf_ctrl_unknown',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Traffic Control: Not Recorded',
        fieldName: 'trf_ctrl_not_recorded',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },

    {
        title: 'Mercator X',
        fieldName: 'mercatorx',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        },
        redacted: true
    },
    {
        title: 'Mercator Y',
        fieldName: 'mercatory',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        },
        redacted: true
    },
    {
        title: 'Calculated SRI',
        fieldName: 'calc_sri',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        },
        redacted: true
    },
    {
        title: 'Calculated Milepost',
        fieldName: 'calc_milepost',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        },
        redacted: true
    },

    {
        title: 'Occupant Physical Condition: Fatal Injury',
        fieldName: 'occupant_phys_cond_killed',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Occupant Physical Condition: Suspected Serious Injury',
        fieldName: 'occupant_phys_cond_incapacitated',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Occupant Physical Condition: Suspected Minor Injury',
        fieldName: 'occupant_phys_cond_moderate_injury',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Occupant Physical Condition: Possible Injury',
        fieldName: 'occupant_phys_cond_complaint_pain',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Occupant Physical Condition: Unknown',
        fieldName: 'occupant_phys_cond_unknown',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Occupant Physical Condition: Not Recorded',
        fieldName: 'occupant_phys_cond_not_recorded',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },

    {
        title: 'Pedestrian Physical Condition: Fatal Injury',
        fieldName: 'pedestrian_phys_cond_killed',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Pedestrian Physical Condition: Suspected Serious Injury',
        fieldName: 'pedestrian_phys_cond_incapacitated',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Pedestrian Physical Condition: Suspected Minor Injury',
        fieldName: 'pedestrian_phys_cond_moderate_injury',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Pedestrian Physical Condition: Possible Injury',
        fieldName: 'pedestrian_phys_cond_complaint_pain',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Pedestrian Physical Condition: Unknown',
        fieldName: 'pedestrian_phys_cond_unknown',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },

    {
        title: 'Pedestrian & Cyclist Physical Condition: Fatal Injury',
        fieldName: 'pedestrian_cyclist_phys_cond_killed',
        query: function (input) {
            return createQueryPedCyclist(this, tableName);
        }
    },
    {
        title: 'Pedestrian & Cyclist Physical Condition: Suspected Serious Injury',
        fieldName: 'pedestrian_cyclist_phys_cond_incapacitated',
        query: function (input) {
            return createQueryPedCyclist(this, tableName);
        }
    },
    {
        title: 'Pedestrian & Cyclist Physical Condition: Suspected Minor Injury',
        fieldName: 'pedestrian_cyclist_phys_cond_moderate_injury',
        query: function (input) {
            return createQueryPedCyclist(this, tableName);
        }
    },
    {
        title: 'Pedestrian & Cyclist Physical Condition: Possible Injury',
        fieldName: 'pedestrian_cyclist_phys_cond_complaint_pain',
        query: function (input) {
            return createQueryPedCyclist(this, tableName);
        }
    },

    {
        title: 'Functional Class',
        fieldName: 'functional_class',
        values: [
            { code: '1', description: 'Interstate' },
            { code: '2', description: 'Principal Arterial - Other Frwys & Xprswys' },
            { code: '3', description: 'Principal Arterial - Other' },
            { code: '4', description: 'Minor Arterial' },
            { code: '5', description: 'Major Collector' },
            { code: '6', description: 'Minor Collector' },
            { code: '7', description: 'Local' },
            { code: '-20', description: 'Not a HPMS Reportable Trafficway' },
            { code: '', description: 'Not a HPMS Reportable Trafficway' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        }
    },
    {
        title: 'Hit and Run',
        fieldName: 'hit_run',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Pedestrians Involved',
        fieldName: 'ped_involved',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        },
        redacted: true
    },
    {
        title: 'Calculated Longitude',
        fieldName: 'calc_latitude',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        },
        redacted: true
    },
    {
        title: 'Calculated Latitude',
        fieldName: 'calc_longitude',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input);
        },
        redacted: true
    },
    {
        title: 'Pedestrian: Suspected Serious Injury',
        fieldName: 'ped_incapacitated',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },

    {
        title: 'Cyclist: Fatal Injury',
        fieldName: 'cyclist_killed',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Cyclist: Suspected Serious Injury',
        fieldName: 'cyclist_incapacitated',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Cyclist: Suspected Minor Injury',
        fieldName: 'cyclist_moderate_pain',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Cyclist: Possible Injury',
        fieldName: 'cyclist_complaint_of_pain',
        query: function (input) {
            return createQueryClauseSingleton(this, tableName, input, '>');
        }
    },
    {
        title: 'Vehicle One Travel Direction Code',
        fieldName: 'veh_one_travel_dir_code',
        values: [
            { code: '01', description: 'North' },
            { code: '02', description: 'East' },
            { code: '03', description: 'South' },
            { code: '04', description: 'West' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        },
        redacted: true
    },
    {
        title: 'Vehicle Two Travel Direction Code',
        fieldName: 'veh_two_travel_dir_code',
        values: [
            { code: '01', description: 'North' },
            { code: '02', description: 'East' },
            { code: '03', description: 'South' },
            { code: '04', description: 'West' },
            { code: '-20', description: 'Not Recorded' }
        ],
        query: function (input) {
            return createQueryClauseMultiple(this, tableName, input);
        },
        redacted: true
    }
];

const codeDefinitions = {
    table: tableName,
    filters: filterDictonary,
    viewableAttributes: viewableAttributes
};

module.exports = codeDefinitions;
