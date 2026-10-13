package com.kopruq.bridge.infra.persistence;

/** The list sections whose "was written" state is recorded in {@code project_section_presence}. */
enum StoredSection {
    BRIDGE_DEFINITIONS,
    FAMILY_PIER,
    FAMILY_PIER_CAP,
    FAMILY_FOUNDATION,
    FAMILY_BEARING,
    FAMILY_MATERIAL,
    PREFERRED_SPAN_RULES
}
