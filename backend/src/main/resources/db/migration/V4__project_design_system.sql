-- V4: project design-system persistence (backend-db-persistence M2).
-- Bridge definitions, the five family catalogs, the girder library, the preferred span rules and the cross section.
-- Same principles as V1-V3: no DEFAULT values and no engineering-value CHECKs; user-entered text is stored as VARCHAR
-- exactly as given (it is not interpreted here); units live in the column names only where the frontend field name or
-- UI label states them (_m, _mm, skew_degrees). A sweep dimension's unit is only inside its label text.
-- Nullable columns mirror optional frontend fields; *_present flags tell "object present but all values null" from
-- "object absent". Existing projects simply have no rows in these tables.

-- A list section (definitions, family catalogs, preferred span rules) that was written has a row here, so an empty
-- written list can be told from a never-written one.
CREATE TABLE project_section_presence (
    id          UUID        NOT NULL,
    project_id  UUID        NOT NULL,
    section_key VARCHAR(40) NOT NULL,
    CONSTRAINT pk_project_section_presence PRIMARY KEY (id),
    CONSTRAINT fk_project_section_presence_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_project_section_presence UNIQUE (project_id, section_key)
);

-- Bridge definitions (a map keyed by definition_key in the frontend store).
CREATE TABLE bridge_definition (
    id                       UUID             NOT NULL,
    project_id               UUID             NOT NULL,
    ordinal                  INTEGER          NOT NULL,
    definition_key           VARCHAR          NOT NULL,
    bridge_id                VARCHAR          NOT NULL,
    superstructure_type      VARCHAR          NOT NULL,
    girder_family_id         VARCHAR,
    girder_variant_id        VARCHAR,
    girder_count             DOUBLE PRECISION,
    deck_width_override_m    DOUBLE PRECISION,
    abutment_a1_family_id    VARCHAR,
    abutment_a2_family_id    VARCHAR,
    construction_method      VARCHAR          NOT NULL,
    construction_stages_note VARCHAR          NOT NULL,
    CONSTRAINT pk_bridge_definition PRIMARY KEY (id),
    CONSTRAINT fk_bridge_definition_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_bridge_definition_key UNIQUE (project_id, definition_key)
);
CREATE INDEX ix_bridge_definition_project ON bridge_definition (project_id);

CREATE TABLE bridge_definition_span (
    bridge_definition_id UUID             NOT NULL,
    span_index           INTEGER          NOT NULL,
    length_m             DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_bridge_definition_span PRIMARY KEY (bridge_definition_id, span_index),
    CONSTRAINT fk_bridge_definition_span_def FOREIGN KEY (bridge_definition_id) REFERENCES bridge_definition (id)
);

CREATE TABLE bridge_definition_axis (
    bridge_definition_id UUID             NOT NULL,
    axis_index           INTEGER          NOT NULL,
    axis_id              VARCHAR          NOT NULL,
    name                 VARCHAR          NOT NULL,
    axis_type            VARCHAR(16)      NOT NULL,
    chainage_m           DOUBLE PRECISION NOT NULL,
    elevation_m          DOUBLE PRECISION,
    skew_degrees         DOUBLE PRECISION,
    CONSTRAINT pk_bridge_definition_axis PRIMARY KEY (bridge_definition_id, axis_index),
    CONSTRAINT fk_bridge_definition_axis_def FOREIGN KEY (bridge_definition_id) REFERENCES bridge_definition (id)
);

CREATE TABLE bridge_definition_axis_assignment (
    bridge_definition_id   UUID             NOT NULL,
    assignment_index       INTEGER          NOT NULL,
    axis_id                VARCHAR          NOT NULL,
    pier_family_id         VARCHAR,
    pier_height_m          DOUBLE PRECISION,
    pier_cap_family_id     VARCHAR,
    foundation_family_id   VARCHAR,
    foundation_elevation_m DOUBLE PRECISION,
    soil_reference         VARCHAR          NOT NULL,
    bearing_family_id      VARCHAR,
    bearing_quantity       DOUBLE PRECISION,
    bearing_orientation    VARCHAR          NOT NULL,
    longitudinal_behavior  VARCHAR          NOT NULL,
    transverse_behavior    VARCHAR          NOT NULL,
    CONSTRAINT pk_bridge_definition_assignment PRIMARY KEY (bridge_definition_id, assignment_index),
    CONSTRAINT fk_bridge_definition_assignment_def FOREIGN KEY (bridge_definition_id) REFERENCES bridge_definition (id)
);

CREATE TABLE bridge_definition_constraint (
    bridge_definition_id UUID             NOT NULL,
    constraint_index     INTEGER          NOT NULL,
    constraint_id        VARCHAR          NOT NULL,
    constraint_kind      VARCHAR(32)      NOT NULL,
    name                 VARCHAR          NOT NULL,
    start_chainage_m     DOUBLE PRECISION,
    end_chainage_m       DOUBLE PRECISION,
    note                 VARCHAR          NOT NULL,
    CONSTRAINT pk_bridge_definition_constraint PRIMARY KEY (bridge_definition_id, constraint_index),
    CONSTRAINT fk_bridge_definition_constraint_def FOREIGN KEY (bridge_definition_id) REFERENCES bridge_definition (id)
);

-- Pier families.
CREATE TABLE family_pier (
    id                           UUID        NOT NULL,
    project_id                   UUID        NOT NULL,
    ordinal                      INTEGER     NOT NULL,
    family_id                    VARCHAR     NOT NULL,
    name                         VARCHAR,
    pier_type                    VARCHAR(16),
    enabled                      BOOLEAN,
    source                       VARCHAR,
    has_dimensions               BOOLEAN     NOT NULL,
    has_allowed_configurations   BOOLEAN     NOT NULL,
    two_column_spacing_present   BOOLEAN     NOT NULL,
    two_column_spacing_key       VARCHAR,
    two_column_spacing_label     VARCHAR,
    two_column_spacing_min       DOUBLE PRECISION,
    two_column_spacing_max       DOUBLE PRECISION,
    two_column_spacing_delta     DOUBLE PRECISION,
    height_applicability_present BOOLEAN     NOT NULL,
    height_minimum_m             DOUBLE PRECISION,
    height_preferred_min_m       DOUBLE PRECISION,
    height_preferred_max_m       DOUBLE PRECISION,
    height_maximum_m             DOUBLE PRECISION,
    CONSTRAINT pk_family_pier PRIMARY KEY (id),
    CONSTRAINT fk_family_pier_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_family_pier UNIQUE (project_id, family_id)
);
CREATE INDEX ix_family_pier_project ON family_pier (project_id);

CREATE TABLE family_pier_dimension (
    pier_family_id  UUID             NOT NULL,
    dimension_index INTEGER          NOT NULL,
    dimension_key   VARCHAR          NOT NULL,
    label           VARCHAR          NOT NULL,
    min_value       DOUBLE PRECISION NOT NULL,
    max_value       DOUBLE PRECISION NOT NULL,
    delta_value     DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_family_pier_dimension PRIMARY KEY (pier_family_id, dimension_index),
    CONSTRAINT fk_family_pier_dimension_family FOREIGN KEY (pier_family_id) REFERENCES family_pier (id)
);

CREATE TABLE family_pier_configuration (
    pier_family_id      UUID    NOT NULL,
    configuration_index INTEGER NOT NULL,
    configuration       VARCHAR NOT NULL,
    CONSTRAINT pk_family_pier_configuration PRIMARY KEY (pier_family_id, configuration_index),
    CONSTRAINT fk_family_pier_configuration_family FOREIGN KEY (pier_family_id) REFERENCES family_pier (id)
);

-- Pier cap families (rule values in metres).
CREATE TABLE family_pier_cap (
    id                            UUID    NOT NULL,
    project_id                    UUID    NOT NULL,
    ordinal                       INTEGER NOT NULL,
    family_id                     VARCHAR NOT NULL,
    name                          VARCHAR,
    cap_type                      VARCHAR(16),
    compatible_pier_configuration VARCHAR(16),
    enabled                       BOOLEAN,
    source                        VARCHAR,
    cap_transverse_length_present BOOLEAN NOT NULL,
    cap_transverse_length_min_m   DOUBLE PRECISION,
    cap_transverse_length_max_m   DOUBLE PRECISION,
    cap_transverse_length_delta_m DOUBLE PRECISION,
    cap_structural_height_present BOOLEAN NOT NULL,
    cap_structural_height_min_m   DOUBLE PRECISION,
    cap_structural_height_max_m   DOUBLE PRECISION,
    cap_structural_height_delta_m DOUBLE PRECISION,
    stem_width_present            BOOLEAN NOT NULL,
    stem_width_min_m              DOUBLE PRECISION,
    stem_width_max_m              DOUBLE PRECISION,
    stem_width_delta_m            DOUBLE PRECISION,
    CONSTRAINT pk_family_pier_cap PRIMARY KEY (id),
    CONSTRAINT fk_family_pier_cap_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_family_pier_cap UNIQUE (project_id, family_id)
);
CREATE INDEX ix_family_pier_cap_project ON family_pier_cap (project_id);

-- Foundation families (lengths in metres, pile counts unitless).
CREATE TABLE family_foundation (
    id                           UUID    NOT NULL,
    project_id                   UUID    NOT NULL,
    ordinal                      INTEGER NOT NULL,
    family_id                    VARCHAR NOT NULL,
    name                         VARCHAR,
    foundation_type              VARCHAR(16),
    enabled                      BOOLEAN,
    source                       VARCHAR,
    shallow_present              BOOLEAN NOT NULL,
    shallow_length_x_min_m       DOUBLE PRECISION,
    shallow_length_x_max_m       DOUBLE PRECISION,
    shallow_length_x_delta_m     DOUBLE PRECISION,
    shallow_length_y_min_m       DOUBLE PRECISION,
    shallow_length_y_max_m       DOUBLE PRECISION,
    shallow_length_y_delta_m     DOUBLE PRECISION,
    shallow_height_min_m         DOUBLE PRECISION,
    shallow_height_max_m         DOUBLE PRECISION,
    shallow_height_delta_m       DOUBLE PRECISION,
    piled_present                BOOLEAN NOT NULL,
    piled_pile_diameter_min_m    DOUBLE PRECISION,
    piled_pile_diameter_max_m    DOUBLE PRECISION,
    piled_pile_diameter_delta_m  DOUBLE PRECISION,
    piled_pile_count_x_min       DOUBLE PRECISION,
    piled_pile_count_x_max       DOUBLE PRECISION,
    piled_pile_count_x_delta     DOUBLE PRECISION,
    piled_pile_spacing_x_min_m   DOUBLE PRECISION,
    piled_pile_spacing_x_max_m   DOUBLE PRECISION,
    piled_pile_spacing_x_delta_m DOUBLE PRECISION,
    piled_pile_count_y_min       DOUBLE PRECISION,
    piled_pile_count_y_max       DOUBLE PRECISION,
    piled_pile_count_y_delta     DOUBLE PRECISION,
    piled_pile_spacing_y_min_m   DOUBLE PRECISION,
    piled_pile_spacing_y_max_m   DOUBLE PRECISION,
    piled_pile_spacing_y_delta_m DOUBLE PRECISION,
    piled_height_min_m           DOUBLE PRECISION,
    piled_height_max_m           DOUBLE PRECISION,
    piled_height_delta_m         DOUBLE PRECISION,
    CONSTRAINT pk_family_foundation PRIMARY KEY (id),
    CONSTRAINT fk_family_foundation_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_family_foundation UNIQUE (project_id, family_id)
);
CREATE INDEX ix_family_foundation_project ON family_foundation (project_id);

-- Bearing families (rule values in millimetres).
CREATE TABLE family_bearing (
    id              UUID    NOT NULL,
    project_id      UUID    NOT NULL,
    ordinal         INTEGER NOT NULL,
    family_id       VARCHAR NOT NULL,
    name            VARCHAR,
    bearing_type    VARCHAR(16),
    enabled         BOOLEAN,
    source          VARCHAR,
    length_present  BOOLEAN NOT NULL,
    length_min_mm   DOUBLE PRECISION,
    length_max_mm   DOUBLE PRECISION,
    length_delta_mm DOUBLE PRECISION,
    width_present   BOOLEAN NOT NULL,
    width_min_mm    DOUBLE PRECISION,
    width_max_mm    DOUBLE PRECISION,
    width_delta_mm  DOUBLE PRECISION,
    height_present  BOOLEAN NOT NULL,
    height_min_mm   DOUBLE PRECISION,
    height_max_mm   DOUBLE PRECISION,
    height_delta_mm DOUBLE PRECISION,
    CONSTRAINT pk_family_bearing PRIMARY KEY (id),
    CONSTRAINT fk_family_bearing_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_family_bearing UNIQUE (project_id, family_id)
);
CREATE INDEX ix_family_bearing_project ON family_bearing (project_id);

-- Material assignments.
CREATE TABLE family_material (
    id             UUID    NOT NULL,
    project_id     UUID    NOT NULL,
    ordinal        INTEGER NOT NULL,
    assignment_id  VARCHAR NOT NULL,
    material_no    DOUBLE PRECISION,
    element        VARCHAR,
    concrete_class VARCHAR,
    CONSTRAINT pk_family_material PRIMARY KEY (id),
    CONSTRAINT fk_family_material_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT uq_family_material UNIQUE (project_id, assignment_id)
);
CREATE INDEX ix_family_material_project ON family_material (project_id);

-- Girder library: 0..1 per project. No row means never written or cleared.
CREATE TABLE girder_library (
    project_id     UUID    NOT NULL,
    enabled        BOOLEAN,
    has_dimensions BOOLEAN NOT NULL,
    CONSTRAINT pk_girder_library PRIMARY KEY (project_id),
    CONSTRAINT fk_girder_library_project FOREIGN KEY (project_id) REFERENCES project (id)
);

CREATE TABLE girder_library_dimension (
    project_id      UUID             NOT NULL,
    dimension_index INTEGER          NOT NULL,
    dimension_key   VARCHAR          NOT NULL,
    label           VARCHAR          NOT NULL,
    min_value       DOUBLE PRECISION NOT NULL,
    max_value       DOUBLE PRECISION NOT NULL,
    delta_value     DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_girder_library_dimension PRIMARY KEY (project_id, dimension_index),
    CONSTRAINT fk_girder_library_dimension_library FOREIGN KEY (project_id) REFERENCES girder_library (project_id)
);

-- Preferred span rules (metres). rule_id is deliberately not UNIQUE: the frontend does not guarantee it.
CREATE TABLE preferred_span_rule (
    id                  UUID             NOT NULL,
    project_id          UUID             NOT NULL,
    ordinal             INTEGER          NOT NULL,
    rule_id             VARCHAR          NOT NULL,
    superstructure_type VARCHAR          NOT NULL,
    girder_variant_id   VARCHAR          NOT NULL,
    min_span_m          DOUBLE PRECISION NOT NULL,
    max_span_m          DOUBLE PRECISION NOT NULL,
    span_delta_m        DOUBLE PRECISION NOT NULL,
    primary_span_m      DOUBLE PRECISION NOT NULL,
    enabled             BOOLEAN          NOT NULL,
    source              VARCHAR          NOT NULL,
    CONSTRAINT pk_preferred_span_rule PRIMARY KEY (id),
    CONSTRAINT fk_preferred_span_rule_project FOREIGN KEY (project_id) REFERENCES project (id)
);
CREATE INDEX ix_preferred_span_rule_project ON preferred_span_rule (project_id);

-- Cross section: 0..1 per project (metres; the girder count is unitless).
CREATE TABLE cross_section (
    project_id        UUID             NOT NULL,
    platform_width_m  DOUBLE PRECISION NOT NULL,
    left_walkway_m    DOUBLE PRECISION NOT NULL,
    right_walkway_m   DOUBLE PRECISION NOT NULL,
    space_of_girder_m DOUBLE PRECISION NOT NULL,
    number_of_girders DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_cross_section PRIMARY KEY (project_id),
    CONSTRAINT fk_cross_section_project FOREIGN KEY (project_id) REFERENCES project (id)
);
