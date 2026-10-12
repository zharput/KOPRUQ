package com.kopruq.terrain.model;

/** A triangle in a {@link TerrainModel}'s TIN, as indices into its {@code vertices()} list. */
public record TerrainTriangle(int a, int b, int c) {
}
