package com.spanova.api.landxml;
import com.spanova.landxml.*;
import java.util.List;

public record LandXmlInspectResponse(String unitsLabel, String crsStatus, String crsLabel,
        List<String> surfaceNames, List<String> alignmentNames, List<String> profileNames,
        List<String> warnings, String application, String formatVersion, List<SurfacePreview> surfaces) {
    public record SourcePoint(String id, double coordinate1, double coordinate2, double elevation) { }
    public record SurfacePreview(String name, int points, int faces, long outerBoundaries, long voidBoundaries,
            int breaklines, double[] sourceBounds, List<SourcePoint> sourcePoints) { }
    private static SurfacePreview preview(LandXmlSurface surface) {
        double[] bounds = {Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY,
                Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY};
        for (LandXmlPoint p : surface.points()) {
            bounds[0]=Math.min(bounds[0],p.y()); bounds[1]=Math.max(bounds[1],p.y());
            bounds[2]=Math.min(bounds[2],p.x()); bounds[3]=Math.max(bounds[3],p.x());
            bounds[4]=Math.min(bounds[4],p.z()); bounds[5]=Math.max(bounds[5],p.z());
        }
        return new SurfacePreview(surface.name(),surface.points().size(),surface.faces().size(),
                surface.boundaries().stream().filter(b -> "OUTER".equals(b.type())).count(),
                surface.boundaries().stream().filter(b -> "VOID".equals(b.type())).count(),surface.breaklines().size(),
                surface.points().isEmpty() ? null : bounds,
                surface.points().stream().limit(8).map(p -> new SourcePoint(p.id(),p.y(),p.x(),p.z())).toList());
    }
    public static LandXmlInspectResponse from(LandXmlDocument document) {
        return new LandXmlInspectResponse(document.units().linearUnit(),document.crsStatus().name(),document.crsLabel(),
                document.surfaces().stream().map(LandXmlSurface::name).toList(),
                document.alignments().stream().map(LandXmlAlignment::name).toList(),
                document.profiles().stream().map(LandXmlProfile::name).toList(),document.warnings(),
                document.application(),document.formatVersion(),document.surfaces().stream().map(LandXmlInspectResponse::preview).toList());
    }
}
