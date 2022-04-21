
function getTableNames(category, subcategory) {
    const schema = "emphasis_explorer";
    const tables = {
        lane_departure: {
            crashes: "lane_departure_crashes",
            age: "lane_departure_persons",
            aggressive: "lane_departure_crashes_aggressive",
            drowsy_distracted: "lane_departure_crashes_drowsy_distracted",
            unbelted: "lane_departure_crashes_unbelted",
            impaired: "lane_departure_crashes_impaired",
            unlicensed: "lane_departure_crashes_unlicensed"
        },
        ped_cyclists: {
            crashes: "ped_bike_crashes",
            age: "ped_bike_persons",
            aggressive: "ped_bike_crashes_aggressive",
            drowsy_distracted: "ped_bike_crashes_drowsy_distracted",
            unbelted: "ped_bike_crashes_unbelted",
            impaired: "ped_bike_crashes_impaired",
            unlicensed: "ped_bike_crashes_unlicensed"
        },
        intersections: {
            crashes: "intersections_crashes",
            age: "intersections_persons",
            aggressive: "intersections_crashes_aggressive",
            drowsy_distracted: "intersections_crashes_drowsy_distracted",
            unbelted: "intersections_crashes_unbelted",
            impaired: "intersections_crashes_impaired",
            unlicensed: "intersections_crashes_unlicensed"
        },
        driver_behavior: {
            subcategory: {
                aggressive: "db_aggressive_crashes",
                drowsy_distracted: "db_drowsy_distracted_crashes",
                unbelted: "db_unbelted_crashes",
                impaired: "db_impaired_crashes",
                unlicensed: "db_unlicensed_crashes",
                heavy_vehicle: "db_heavy_vehicles_crashes"                
            }
        },
        road_users: {
            subcategory: {
                mature: "ru_mature_driver_crashes",
                motorcyclist: "ru_motorcyclist_crashes",
                younger: "ru_younger_driver_crashes",
                work_zone: "ru_work_zone_crashes"                
            }
        }
    }
}


