package com.kopruq.terrain;
import com.kopruq.spatialcore.Point3D;
import java.util.List;
public record TerrainBreakline(String name, List<Point3D> points) { }
