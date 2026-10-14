-- V6: wind snapshot result (backend-db-persistence M3b; user decision 2026-10-14: the calculated wind result is stored
-- together with the inputs it was calculated from; supersedes the "result is never stored" note of V5).
-- Values are stored exactly as calculated; units live in the column names only where the frontend field name states
-- them (_m, _m_s, _kn_m2, _kn_m); kr, cr, turbulence intensity, b/d and cfx are unitless. result_present tells
-- "no result" from a result; the result columns are nullable because a snapshot may have no result (required-ness
-- when present is checked in the application layer and re-checked on read). No DEFAULT, no CHECK. Existing rows are
-- back-filled with result_present = FALSE (they read back with "result": null).
ALTER TABLE load_wind_snapshot ADD COLUMN result_present BOOLEAN;
UPDATE load_wind_snapshot SET result_present = FALSE;
ALTER TABLE load_wind_snapshot ALTER COLUMN result_present SET NOT NULL;
ALTER TABLE load_wind_snapshot ADD COLUMN result_status VARCHAR(16);
ALTER TABLE load_wind_snapshot ADD COLUMN result_z0_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_zmin_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_kr DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_cr DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_vm_m_s DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_turbulence_intensity DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_qp_kn_m2 DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_b_over_d DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_cfx DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_transverse_kn_m DOUBLE PRECISION;
ALTER TABLE load_wind_snapshot ADD COLUMN result_missing VARCHAR;
