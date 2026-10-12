package com.kopruq.api.landxml.api;

/** {@code groundElevationM} comes from the terrain query; {@code designElevationM} from the imported vertical profile - null if that chainage/terrain point has none. */
public record LongitudinalProfilePoint(double chainageM, Double groundElevationM, Double designElevationM) {
}
