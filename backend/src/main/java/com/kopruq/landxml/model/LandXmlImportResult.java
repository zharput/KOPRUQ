package com.kopruq.landxml.model;

import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.VerticalProfile;
import com.kopruq.terrain.model.TerrainModel;

import java.util.List;

/** {@code alignment}/{@code profile} are null when the engineer chose to import a surface only (no alignment selected). */
public record LandXmlImportResult(
        String id,
        TerrainModel terrain,
        Alignment alignment,
        VerticalProfile profile,
        List<String> warnings) {
}
