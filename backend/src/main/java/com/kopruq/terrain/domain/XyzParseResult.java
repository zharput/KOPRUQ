package com.kopruq.terrain.domain;

import com.kopruq.geometry.model.Point3D;

import java.util.List;

/**
 * What {@link XyzTerrainParser} read from a text file, with the counts a
 * reviewer needs to judge whether the file was understood.
 *
 * @param points the usable (finite) X Y Z points, in file order
 * @param nonFiniteRows rows whose first three columns were numbers but at least
 *        one was NaN or an infinity (skipped, counted)
 * @param wideRows rows with MORE than three numeric columns; the first three were
 *        read as X Y Z, but the column layout (or a decimal comma) is unconfirmed
 */
record XyzParseResult(List<Point3D> points, int nonFiniteRows, int wideRows) {
}
