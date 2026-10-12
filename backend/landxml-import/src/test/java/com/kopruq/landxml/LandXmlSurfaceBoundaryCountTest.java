package com.kopruq.landxml;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class LandXmlSurfaceBoundaryCountTest {

    @Test
    void countsBoundariesByType() {
        List<LandXmlBoundary> boundaries = List.of(
                new LandXmlBoundary("o1", "OUTER", false, List.of()),
                new LandXmlBoundary("o2", "OUTER", true, List.of()),
                new LandXmlBoundary("v1", "VOID", false, List.of()));
        LandXmlSurface surface = new LandXmlSurface("s", List.of(), List.of(), boundaries, List.of(), 0, 0);
        assertEquals(2, surface.countBoundaries("OUTER"));
        assertEquals(1, surface.countBoundaries("VOID"));
        assertEquals(0, surface.countBoundaries("OTHER"));
    }
}
