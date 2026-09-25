package com.kopruq.landxml;

import com.kopruq.alignment.Alignment;
import com.kopruq.alignment.VerticalProfile;
import com.kopruq.terrain.TerrainModel;

import java.util.List;

/** {@code alignment}/{@code profile} are null when the engineer chose to import a surface only (no alignment selected). */
public record LandXmlImportResult(
        String id,
        TerrainModel terrain,
        Alignment alignment,
        VerticalProfile profile,
        List<String> warnings) {
}
