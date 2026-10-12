-- V2: bridge Project aggregate persistence (Project, Bridge, DesignSpace, BridgeAlternative and its parts).
-- All lengths are SI metres (_m). No DEFAULT values and no value CHECKs on engineering columns; the only CHECK is
-- structural (a pier has diameter and height together). Value rules stay in the bridge model.
-- Computed results (rule results, layouts, loads, analysis) are intentionally NOT persisted.

CREATE TABLE project (
    id                      UUID                     NOT NULL,
    project_name            VARCHAR,
    created_utc             TIMESTAMP WITH TIME ZONE NOT NULL,
    selected_alternative_id UUID,
    row_version             BIGINT                   NOT NULL,
    CONSTRAINT pk_project PRIMARY KEY (id)
);

-- 0..1 per project: no row => Project.bridge == null.
CREATE TABLE project_bridge (
    project_id     UUID             NOT NULL,
    bridge_name    VARCHAR,
    total_length_m DOUBLE PRECISION NOT NULL,
    deck_width_m   DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_project_bridge PRIMARY KEY (project_id),
    CONSTRAINT fk_project_bridge_project FOREIGN KEY (project_id) REFERENCES project (id)
);

-- 0..1 per project: no row => Project.designSpace == null. All 15 DesignSpace fields, required together.
CREATE TABLE project_design_space (
    project_id           UUID             NOT NULL,
    min_span_m           DOUBLE PRECISION NOT NULL,
    max_span_m           DOUBLE PRECISION NOT NULL,
    min_girder_count     INTEGER          NOT NULL,
    max_girder_count     INTEGER          NOT NULL,
    min_girder_spacing_m DOUBLE PRECISION NOT NULL,
    max_girder_spacing_m DOUBLE PRECISION NOT NULL,
    min_girder_depth_m   DOUBLE PRECISION NOT NULL,
    max_girder_depth_m   DOUBLE PRECISION NOT NULL,
    min_slab_thickness_m DOUBLE PRECISION NOT NULL,
    max_slab_thickness_m DOUBLE PRECISION NOT NULL,
    min_pier_diameter_m  DOUBLE PRECISION NOT NULL,
    max_pier_diameter_m  DOUBLE PRECISION NOT NULL,
    min_pier_height_m    DOUBLE PRECISION NOT NULL,
    max_pier_height_m    DOUBLE PRECISION NOT NULL,
    girder_depth_step_m  DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_project_design_space PRIMARY KEY (project_id),
    CONSTRAINT fk_project_design_space_project FOREIGN KEY (project_id) REFERENCES project (id)
);

-- deck present       <=> deck_slab_thickness_m NOT NULL
-- pier present       <=> pier_diameter_m NOT NULL (pier_height_m together with it)
-- foundation present <=> foundation_type NOT NULL (pile columns are only meaningful for PILE, not enforced here)
CREATE TABLE bridge_alternative (
    id                         UUID             NOT NULL,
    project_id                 UUID             NOT NULL,
    ordinal                    INTEGER          NOT NULL,
    girder_count               INTEGER          NOT NULL,
    girder_depth_m             DOUBLE PRECISION NOT NULL,
    girder_spacing_m           DOUBLE PRECISION NOT NULL,
    deck_slab_thickness_m      DOUBLE PRECISION,
    pier_diameter_m            DOUBLE PRECISION,
    pier_height_m              DOUBLE PRECISION,
    pier_type                  VARCHAR,
    foundation_type            VARCHAR(32),
    foundation_pile_count      INTEGER,
    foundation_pile_diameter_m DOUBLE PRECISION,
    CONSTRAINT pk_bridge_alternative PRIMARY KEY (id),
    CONSTRAINT fk_bridge_alternative_project FOREIGN KEY (project_id) REFERENCES project (id),
    CONSTRAINT ck_bridge_alternative_pier_cols CHECK ((pier_diameter_m IS NULL) = (pier_height_m IS NULL))
);

CREATE INDEX ix_bridge_alternative_project ON bridge_alternative (project_id);

CREATE TABLE bridge_alternative_span (
    alternative_id UUID             NOT NULL,
    span_index     INTEGER          NOT NULL,
    length_m       DOUBLE PRECISION NOT NULL,
    CONSTRAINT pk_bridge_alternative_span PRIMARY KEY (alternative_id, span_index),
    CONSTRAINT fk_bridge_span_alternative FOREIGN KEY (alternative_id) REFERENCES bridge_alternative (id)
);
