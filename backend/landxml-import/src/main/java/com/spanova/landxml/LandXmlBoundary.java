package com.spanova.landxml;
import java.util.List;
public record LandXmlBoundary(String name, String type, boolean edgeTrim, List<LandXmlPoint> points) { }
