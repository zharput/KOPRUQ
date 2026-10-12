package com.kopruq.landxml.application;

/**
 * One station of the longitudinal profile, metres. {@code groundElevationM} comes from the terrain query,
 * {@code designElevationM} from the imported vertical profile; each is null where there is none.
 */
public record ProfileSample(double chainageM, Double groundElevationM, Double designElevationM) {
}
