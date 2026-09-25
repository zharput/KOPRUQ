package com.kopruq.api.terrain;

/** {@code elevationM} is null when the queried (x,y) falls outside the terrain's triangulated surface. */
public record TerrainElevationResponse(Double elevationM) {
}
