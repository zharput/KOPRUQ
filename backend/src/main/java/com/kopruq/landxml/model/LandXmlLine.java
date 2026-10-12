package com.kopruq.landxml.model;

public record LandXmlLine(double startX, double startY, double endX, double endY) implements LandXmlGeometryElement {
}
