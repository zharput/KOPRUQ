package com.kopruq.landxml.model;
import java.util.List;
public record LandXmlBoundary(String name, String type, boolean edgeTrim, List<LandXmlPoint> points) { }
