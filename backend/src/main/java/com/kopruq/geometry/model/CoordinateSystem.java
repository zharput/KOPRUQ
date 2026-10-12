package com.kopruq.geometry.model;

/** A coordinate reference system, identified by its EPSG code. */
public record CoordinateSystem(String epsgCode, String name) {
}
