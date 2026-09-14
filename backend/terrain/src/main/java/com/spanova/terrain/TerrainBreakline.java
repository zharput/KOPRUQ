package com.spanova.terrain;
import com.spanova.spatialcore.Point3D;
import java.util.List;
public record TerrainBreakline(String name, List<Point3D> points) { }
