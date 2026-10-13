-- V5: project load inputs and graph documents (backend-db-persistence M3).
-- Six load sections (seismic, wind, temperature, self-weight, traffic LM1, wind snapshot) and the graph documents.
-- Same principles as V1-V4: no DEFAULT values and no engineering-value CHECKs; user-entered text is stored as VARCHAR
-- exactly as given (string load inputs are not interpreted here); units live in the column names only where the
-- frontend field name states them (_m, _kn_m3, _kn_m). The wind snapshot stores its inputs only; the calculated wind
-- result is never stored. FKs carry no ON DELETE CASCADE. Graph node references are client strings, so they have no
-- database FK (checked in the application layer). Existing projects simply have no rows in these tables.

-- Seismic inputs (frontend fields a, g, t, i), 0..1 per project.
CREATE TABLE load_seismic_input (
    project_id        UUID    NOT NULL,
    reference_pga     VARCHAR NOT NULL,
    ground_type       VARCHAR NOT NULL,
    spectrum_type     VARCHAR NOT NULL,
    importance_factor VARCHAR NOT NULL,
    CONSTRAINT pk_load_seismic_input PRIMARY KEY (project_id),
    CONSTRAINT fk_load_seismic_input_project FOREIGN KEY (project_id) REFERENCES project (id)
);

-- Wind inputs (vb, terrain, ze), 0..1 per project.
CREATE TABLE load_wind_input (
    project_id          UUID    NOT NULL,
    basic_wind_velocity VARCHAR NOT NULL,
    terrain_category    VARCHAR NOT NULL,
    reference_height    VARCHAR NOT NULL,
    CONSTRAINT pk_load_wind_input PRIMARY KEY (project_id),
    CONSTRAINT fk_load_wind_input_project FOREIGN KEY (project_id) REFERENCES project (id)
);

-- Temperature inputs (min, max, t0), 0..1 per project.
CREATE TABLE load_temperature_input (
    project_id          UUID    NOT NULL,
    effective_minimum   VARCHAR NOT NULL,
    effective_maximum   VARCHAR NOT NULL,
    initial_temperature VARCHAR NOT NULL,
    CONSTRAINT pk_load_temperature_input PRIMARY KEY (project_id),
    CONSTRAINT fk_load_temperature_input_project FOREIGN KEY (project_id) REFERENCES project (id)
);

-- Self-weight / permanent-load inputs, 0..1 per project. Counts are unitless (stored as numbers, as in the frontend).
CREATE TABLE load_self_weight_input (
    project_id                        UUID             NOT NULL,
    asphalt_thickness_m               DOUBLE PRECISION NOT NULL,
    asphalt_unit_weight_kn_m3         DOUBLE PRECISION NOT NULL,
    sidewalk_thickness_m              DOUBLE PRECISION NOT NULL,
    sidewalk_unit_weight_kn_m3        DOUBLE PRECISION NOT NULL,
    facia_count                       DOUBLE PRECISION NOT NULL,
    facia_width_m                     DOUBLE PRECISION NOT NULL,
    facia_thickness_m                 DOUBLE PRECISION NOT NULL,
    facia_unit_weight_kn_m3           DOUBLE PRECISION NOT NULL,
    guardrail_count                   DOUBLE PRECISION NOT NULL,
    guardrail_unit_load_kn_m          DOUBLE PRECISION NOT NULL,
    pedestrian_railing_count          DOUBLE PRECISION NOT NULL,
    pedestrian_railing_unit_load_kn_m DOUBLE PRECISION NOT NULL,
    protective_fence_count            DOUBLE PRECISION NOT NULL,
    protective_fence_unit_load_kn_m   DOUBLE PRECISION NOT NULL,
    sound_panel_count                 DOUBLE PRECISION NOT NULL,
    sound_panel_unit_load_kn_m        DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_load_self_weight_input PRIMARY KEY (project_id),
    CONSTRAINT fk_load_self_weight_input_project FOREIGN KEY (project_id) REFERENCES project (id)
);

-- Traffic LM1 parameters. A written section has a project_section_presence row (TRAFFIC_LM1) and exactly one
-- REMAINING_AREA_UDL row. Units depend on the group, so they are not in column names (source: Lm1Panel.tsx):
-- characteristic value in kN (TANDEM_SYSTEM) or kN/m2 (UDL, REMAINING_AREA_UDL); adjustment factor unitless.
CREATE TABLE load_traffic_lm1_factor (
    id                          UUID             NOT NULL,
    project_id                  UUID             NOT NULL,
    factor_group                VARCHAR(24)      NOT NULL,
    factor_index                INTEGER          NOT NULL,
    label                       VARCHAR          NOT NULL,
    characteristic_value        DOUBLE PRECISION,
    characteristic_provenance   VARCHAR(32)      NOT NULL,
    characteristic_code_default DOUBLE PRECISION,
    adjustment_value            DOUBLE PRECISION,
    adjustment_provenance       VARCHAR(32)      NOT NULL,
    adjustment_code_default     DOUBLE PRECISION,
    CONSTRAINT pk_load_traffic_lm1_factor PRIMARY KEY (id),
    CONSTRAINT fk_load_traffic_lm1_factor_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_load_traffic_lm1_factor UNIQUE (project_id, factor_group, factor_index)
);
CREATE INDEX ix_load_traffic_lm1_factor_project ON load_traffic_lm1_factor (project_id);

-- Wind calculation snapshot: the inputs only, no result. 0..1 per project.
CREATE TABLE load_wind_snapshot (
    project_id          UUID             NOT NULL,
    schema_version      INTEGER          NOT NULL,
    snapshot_status     VARCHAR,
    basic_wind_velocity VARCHAR          NOT NULL,
    terrain_category    VARCHAR          NOT NULL,
    reference_height    VARCHAR          NOT NULL,
    deck_width_m        DOUBLE PRECISION NOT NULL,
    dref_m              DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_load_wind_snapshot PRIMARY KEY (project_id),
    CONSTRAINT fk_load_wind_snapshot_project FOREIGN KEY (project_id) REFERENCES project (id)
);

-- Graph documents: one row per graph, ordered by ordinal (creation order). graph_id is unique per project; group ids
-- are NOT unique (the frontend can generate the same group id twice).
CREATE TABLE graph_document (
    id               UUID    NOT NULL,
    project_id       UUID    NOT NULL,
    ordinal          INTEGER NOT NULL,
    graph_id         VARCHAR NOT NULL,
    name             VARCHAR NOT NULL,
    schema_version   INTEGER NOT NULL,
    owner_project_id VARCHAR,
    owner_bridge_id  VARCHAR,
    has_groups       BOOLEAN NOT NULL,
    CONSTRAINT pk_graph_document PRIMARY KEY (id),
    CONSTRAINT fk_graph_document_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_graph_document_graph UNIQUE (project_id, graph_id)
);
CREATE INDEX ix_graph_document_project ON graph_document (project_id);

CREATE TABLE graph_node (
    id                UUID             NOT NULL,
    graph_document_id UUID             NOT NULL,
    node_index        INTEGER          NOT NULL,
    node_id           VARCHAR          NOT NULL,
    node_type         VARCHAR          NOT NULL,
    name              VARCHAR          NOT NULL,
    position_x        DOUBLE PRECISION NOT NULL,
    position_y        DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_graph_node PRIMARY KEY (id),
    CONSTRAINT fk_graph_node_document FOREIGN KEY (graph_document_id) REFERENCES graph_document (id),
    CONSTRAINT uq_graph_node UNIQUE (graph_document_id, node_id)
);
CREATE INDEX ix_graph_node_document ON graph_node (graph_document_id);

-- One node parameter: value_kind says which of the value columns is used (NUMBER, BOOLEAN, STRING, NUMBER_ARRAY).
CREATE TABLE graph_node_parameter (
    id              UUID        NOT NULL,
    graph_node_id   UUID        NOT NULL,
    parameter_index INTEGER     NOT NULL,
    parameter_key   VARCHAR     NOT NULL,
    value_kind      VARCHAR(16) NOT NULL,
    number_value    DOUBLE PRECISION,
    boolean_value   BOOLEAN,
    string_value    VARCHAR,
    CONSTRAINT pk_graph_node_parameter PRIMARY KEY (id),
    CONSTRAINT fk_graph_node_parameter_node FOREIGN KEY (graph_node_id) REFERENCES graph_node (id),
    CONSTRAINT uq_graph_node_parameter UNIQUE (graph_node_id, parameter_key)
);
CREATE INDEX ix_graph_node_parameter_node ON graph_node_parameter (graph_node_id);

CREATE TABLE graph_node_parameter_item (
    graph_node_parameter_id UUID             NOT NULL,
    item_index              INTEGER          NOT NULL,
    item_value              DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_graph_node_parameter_item PRIMARY KEY (graph_node_parameter_id, item_index),
    CONSTRAINT fk_graph_node_parameter_item_parameter FOREIGN KEY (graph_node_parameter_id)
        REFERENCES graph_node_parameter (id)
);

CREATE TABLE graph_connection (
    graph_document_id UUID    NOT NULL,
    connection_index  INTEGER NOT NULL,
    connection_id     VARCHAR NOT NULL,
    source_node_id    VARCHAR NOT NULL,
    source_port_id    VARCHAR NOT NULL,
    target_node_id    VARCHAR NOT NULL,
    target_port_id    VARCHAR NOT NULL,
    CONSTRAINT pk_graph_connection PRIMARY KEY (graph_document_id, connection_index),
    CONSTRAINT fk_graph_connection_document FOREIGN KEY (graph_document_id) REFERENCES graph_document (id),
    CONSTRAINT uq_graph_connection UNIQUE (graph_document_id, connection_id)
);

CREATE TABLE graph_group (
    id                UUID    NOT NULL,
    graph_document_id UUID    NOT NULL,
    group_index       INTEGER NOT NULL,
    group_id          VARCHAR NOT NULL,
    name              VARCHAR NOT NULL,
    color             VARCHAR NOT NULL,
    CONSTRAINT pk_graph_group PRIMARY KEY (id),
    CONSTRAINT fk_graph_group_document FOREIGN KEY (graph_document_id) REFERENCES graph_document (id)
);
CREATE INDEX ix_graph_group_document ON graph_group (graph_document_id);

CREATE TABLE graph_group_node (
    graph_group_id UUID    NOT NULL,
    node_index     INTEGER NOT NULL,
    node_id        VARCHAR NOT NULL,
    CONSTRAINT pk_graph_group_node PRIMARY KEY (graph_group_id, node_index),
    CONSTRAINT fk_graph_group_node_group FOREIGN KEY (graph_group_id) REFERENCES graph_group (id)
);
