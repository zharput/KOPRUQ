package com.spanova.terrain;
/** Import diagnostics are retained with engineering geometry, not inferred by the viewer. */
public record TerrainSource(String application, String formatVersion, String units, String surfaceName,
        String coordinateOrder, int sourcePointCount, int sourceFaceCount, int invalidPoints,
        int duplicatePointIds, int invalidFaces, int missingPointReferences, int degenerateFaces) { }
