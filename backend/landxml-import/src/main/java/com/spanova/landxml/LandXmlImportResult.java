package com.spanova.landxml;

import com.spanova.alignment.Alignment;
import com.spanova.alignment.VerticalProfile;
import com.spanova.terrain.TerrainModel;

import java.util.List;

/** {@code alignment}/{@code profile} are null when the engineer chose to import a surface only (no alignment selected). */
public record LandXmlImportResult(
        String id,
        TerrainModel terrain,
        Alignment alignment,
        VerticalProfile profile,
        List<String> warnings) {
}
