package com.kopruq.terrain;
import com.kopruq.spatialcore.Point3D;
import java.util.List;
/** Supporting source definition; never replaces or clips authoritative faces. */
public record TerrainBoundary(String name, String type, boolean edgeTrim, List<Point3D> points) { }
