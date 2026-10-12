package com.kopruq.terrain.model;
import com.kopruq.geometry.model.Point3D;
import java.util.List;
public record TerrainBreakline(String name, List<Point3D> points) { }
