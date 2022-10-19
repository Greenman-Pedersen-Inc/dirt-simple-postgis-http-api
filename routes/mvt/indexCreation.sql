SELECT schemaname as schema,
    tablename as table,
    indexname as index
FROM pg_indexes
WHERE schemaname = 'public'
    and tablename = 'ard_vehicles_partition' create index on ard_occupants (veh_acc_year, crashid);
create index on ard_occupants (veh_acc_year);
create index on ard_occupants (veh_acc_year, crashid);
create index on ard_occupants (veh_acc_year, veh_acc_mun_cty_co);
create index on ard_occupants (veh_acc_year, veh_acc_mun_cty_co, veh_acc_mun_mu);
create index on ard_occupants (veh_acc_year, veh_acc_acc_case);
create index on ard_occupants (veh_acc_year, veh_id);
create index on ard_occupants (veh_acc_year, id);
create index on ard_occupants (veh_acc_year, severity_rating);
create index on ard_occupants (veh_acc_year, phys_cond_code);
create index on ard_occupants (veh_acc_year, position_in_code);
create index on ard_occupants (veh_acc_year, ejection_code);
create index on ard_occupants (veh_acc_year, age);
create index on ard_occupants (veh_acc_year, sex);
create index on ard_occupants (veh_acc_year, loc_injury_code);
create index on ard_occupants (veh_acc_year, type_injury_code);
create index on ard_occupants (veh_acc_year, flg_ref_medical);
create index on ard_occupants (veh_acc_year, safety_avail_code);
create index on ard_occupants (veh_acc_year, safety_used_code);
create index on ard_occupants (veh_acc_year, airbag_deploy);
create index on ard_occupants (veh_acc_year, hospital_code);
create index on ard_occupants (veh_acc_year, infant_age);
create index on ard_occupants (veh_acc_year, update_date);
create index on ard_occupants (veh_acc_year, dio_crash_switch);
create index on ard_occupants (veh_acc_year, di_crash_date);
create index on ard_occupants (veh_acc_year, dte_death);
create index on ard_occupants (veh_acc_year, tme_death);
create index on ard_occupants (veh_acc_year, cde_fatality);

drop index ard_occupants_partition_veh_acc_year_crashid_idx;
drop index ard_occupants_partition_veh_acc_year_safety_used_code_idx;
drop index ard_occupants_partition_safety_used_code_idx;
drop index ard_occupants_partition_veh_acc_year_crashid_safety_used_co_idx;
drop index ard_occupants_partition_veh_acc_year_veh_acc_mun_cty_co_cra_idx;
drop index "ard_vehicles_partition_acc_year_acc_mun_cty_co_acc_mun_mu_idx" drop index "ard_vehicles_partition_acc_year_contr_circum_code1_idx" drop index "ard_vehicles_partition_acc_year_contr_circum_code2_idx" drop index "ard_vehicles_partition_acc_year_driver_phys_stat_code1_idx" drop index "ard_vehicles_partition_acc_year_driver_phys_stat_code2_idx" drop index "ard_vehicles_partition_acc_year_first_event_code_idx" drop index "ard_vehicles_partition_acc_year_idx" drop index "ard_vehicles_partition_acc_year_second_event_code_idx" drop index "ard_vehicles_partition_acc_year_third_event_code_idx" drop index "ard_vehicles_partition_acc_year_fourth_event_code_idx" drop index "ard_vehicles_partition_acc_year_flg_hit_run_idx" drop index "ard_vehicles_partition_acc_year_travel_dir_code_idx" drop index "ard_vehicles_partition_acc_year_unlicensed_idx" drop index "ard_vehicles_partition_acc_year_cargo_body_code_idx" drop index "ard_vehicles_partition_acc_year_initial_impact_idx" drop index "ard_vehicles_partition_acc_year_principal_damage_idx" drop index "ard_vehicles_partition_acc_year_special_veh_code_idx" drop index "ard_vehicles_partition_acc_year_pre_crash_type_idx" drop index "ard_vehicles_partition_acc_year_veh_use_code_idx" drop index "ard_vehicles_partition_acc_year_type_code_idx" drop index ard_vehicles_partition_crashid_idx;
create index on ard_vehicles_partition (acc_year, crashid);