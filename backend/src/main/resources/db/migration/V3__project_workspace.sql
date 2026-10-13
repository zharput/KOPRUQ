-- V3: project workspace persistence (backend-db-persistence M1).
-- Adds the domain revision counter and last-change timestamp to project, and the project information and bridge
-- inventory tables. Same principles as V1/V2: no DEFAULT values and no engineering-value CHECKs; user-entered text is
-- stored as VARCHAR exactly as given (it is not interpreted here); units live in the column names (_m, _cm).
-- Existing project rows get revision 0 and updated_utc = created_utc.

ALTER TABLE project ADD COLUMN revision BIGINT;
ALTER TABLE project ADD COLUMN updated_utc TIMESTAMP WITH TIME ZONE;
UPDATE project SET revision = 0, updated_utc = created_utc;
ALTER TABLE project ALTER COLUMN revision SET NOT NULL;
ALTER TABLE project ALTER COLUMN updated_utc SET NOT NULL;

-- 0..1 per project: no row => the project predates V3 and has no stored workspace yet.
-- The project name is NOT here: it is project.project_name.
CREATE TABLE project_info (
    project_id                     UUID    NOT NULL,
    project_code                   VARCHAR NOT NULL,
    client                         VARCHAR NOT NULL,
    designer                       VARCHAR NOT NULL,
    country                        VARCHAR NOT NULL,
    region                         VARCHAR NOT NULL,
    project_type                   VARCHAR NOT NULL,
    status                         VARCHAR NOT NULL,
    start_date                     VARCHAR NOT NULL,
    target_date                    VARCHAR NOT NULL,
    description                    VARCHAR NOT NULL,
    location_start                 VARCHAR NOT NULL,
    location_end                   VARCHAR NOT NULL,
    coordinate_system              VARCHAR NOT NULL,
    design_standard_family         VARCHAR NOT NULL,
    concrete_code                  VARCHAR NOT NULL,
    steel_code                     VARCHAR NOT NULL,
    composite_code                 VARCHAR NOT NULL,
    seismic_code                   VARCHAR NOT NULL,
    geotechnical_code              VARCHAR NOT NULL,
    traffic_load_standard          VARCHAR NOT NULL,
    unit_length                    VARCHAR NOT NULL,
    unit_force                     VARCHAR NOT NULL,
    unit_moment                    VARCHAR NOT NULL,
    unit_stress                    VARCHAR NOT NULL,
    unit_mass                      VARCHAR NOT NULL,
    unit_temperature               VARCHAR NOT NULL,
    coordinate_name                VARCHAR NOT NULL,
    coordinate_epsg                VARCHAR NOT NULL,
    coordinate_horizontal_datum    VARCHAR NOT NULL,
    coordinate_vertical_datum      VARCHAR NOT NULL,
    coordinate_origin_x            VARCHAR NOT NULL,
    coordinate_origin_y            VARCHAR NOT NULL,
    coordinate_origin_z            VARCHAR NOT NULL,
    coordinate_north_angle         VARCHAR NOT NULL,
    criteria_design_life           VARCHAR NOT NULL,
    criteria_reliability_class     VARCHAR NOT NULL,
    criteria_exposure              VARCHAR NOT NULL,
    criteria_concrete_class        VARCHAR NOT NULL,
    criteria_cover                 VARCHAR NOT NULL,
    criteria_philosophy            VARCHAR NOT NULL,
    environment_terrain_dataset_id VARCHAR,
    environment_land_xml_import_id VARCHAR,
    last_modified                  VARCHAR NOT NULL,
    CONSTRAINT pk_project_info PRIMARY KEY (project_id),
    CONSTRAINT fk_project_info_project FOREIGN KEY (project_id) REFERENCES project (id)
);

-- Bridge inventory rows of a project; ordinal keeps the order the client sent.
CREATE TABLE project_bridge_row (
    id                 UUID             NOT NULL,
    project_id         UUID             NOT NULL,
    ordinal            INTEGER          NOT NULL,
    row_id             VARCHAR          NOT NULL,
    inventory_no       VARCHAR          NOT NULL,
    km                 VARCHAR          NOT NULL,
    crossing_type      VARCHAR          NOT NULL,
    estimated_length_m DOUBLE PRECISION NOT NULL,
    road_width_m       DOUBLE PRECISION NOT NULL,
    terrain            VARCHAR          NOT NULL,
    status             VARCHAR          NOT NULL,
    bridge_type        VARCHAR(32)      NOT NULL,
    girder_note        VARCHAR,
    pier_shape         VARCHAR(32)      NOT NULL,
    -- false => girderDepthCm is null; true with no depth rows => an empty list
    has_girder_depths  BOOLEAN          NOT NULL,
    CONSTRAINT pk_project_bridge_row PRIMARY KEY (id),
    CONSTRAINT fk_project_bridge_row_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_project_bridge_row_row_id UNIQUE (project_id, row_id)
);
CREATE INDEX ix_project_bridge_row_project ON project_bridge_row (project_id);

CREATE TABLE project_bridge_row_span (
    bridge_row_id UUID             NOT NULL,
    span_index    INTEGER          NOT NULL,
    length_m      DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_project_bridge_row_span PRIMARY KEY (bridge_row_id, span_index),
    CONSTRAINT fk_project_bridge_row_span_row FOREIGN KEY (bridge_row_id) REFERENCES project_bridge_row (id)
);

CREATE TABLE project_bridge_row_girder_depth (
    bridge_row_id UUID             NOT NULL,
    depth_index   INTEGER          NOT NULL,
    depth_cm      DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_project_bridge_row_girder_depth PRIMARY KEY (bridge_row_id, depth_index),
    CONSTRAINT fk_project_bridge_row_girder_depth_row FOREIGN KEY (bridge_row_id) REFERENCES project_bridge_row (id)
);
