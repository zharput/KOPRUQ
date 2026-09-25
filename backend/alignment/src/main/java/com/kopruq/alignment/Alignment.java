package com.kopruq.alignment;

import com.kopruq.spatialcore.Point3D;

import java.util.ArrayList;
import java.util.List;

/**
 * Horizontal bridge/corridor alignment: converts between chainage-based
 * positions and real-world XYZ coordinates
 * (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md section C, E). This is the
 * single most-depended-on primitive in the site/layout domain - every
 * {@link ChainagePosition} anywhere ultimately resolves through this
 * class.
 *
 * <p><b>Scope:</b> {@link StraightElement} and {@link CurveElement}
 * (circular arcs, LANDXML-P01) are supported (see {@link
 * HorizontalElement}). There is still no *vertical* alignment model for
 * the original {@link #toXYZ(ChainagePosition)}/{@link #toChainage}
 * pair - elevation there is always supplied directly by the caller via
 * {@link ChainagePosition#elevationM()}. {@link #toXYZ(double, double,
 * VerticalProfile)} is an additive overload that derives elevation from
 * a real {@link VerticalProfile} instead - it does not change the
 * behavior of the original method or any existing caller.
 *
 * <p><b>Chainage convention:</b> measured along the horizontal (x,y)
 * path of the alignment (arc length along curves, straight-line length
 * along straights), never along 3D slope distance - standard road/rail
 * alignment practice.
 *
 * <p><b>Offset convention:</b> positive offset is to the right of the
 * direction of travel (from the start of the alignment towards its
 * end) - the standard convention for chainage/offset systems. For a
 * circular arc this means: on a clockwise curve, positive offset is
 * toward the center (the inside of the turn); on a counterclockwise
 * curve, positive offset is away from the center.
 */
public final class Alignment {

    private static final double CHAINAGE_TOLERANCE_M = 1e-6;
    private static final double TWO_PI = 2 * Math.PI;

    private final List<HorizontalElement> elements;
    private final List<Double> elementStartChainageM;
    private final double totalLengthM;

    public Alignment(List<HorizontalElement> elements) {
        if (elements == null || elements.isEmpty()) {
            throw new IllegalArgumentException("Alignment requires at least one horizontal element");
        }
        this.elements = List.copyOf(elements);
        this.elementStartChainageM = new ArrayList<>(this.elements.size());
        double cumulativeM = 0;
        for (HorizontalElement element : this.elements) {
            elementStartChainageM.add(cumulativeM);
            cumulativeM += elementLengthM(element);
        }
        this.totalLengthM = cumulativeM;
    }

    public double totalLengthM() {
        return totalLengthM;
    }

    /** Resolves a chainage/offset/elevation position to a real-world point - elevation is exactly what the caller supplied. */
    public Point3D toXYZ(ChainagePosition position) {
        int index = elementIndexAtChainage(position.chainageM());
        HorizontalElement element = elements.get(index);
        double localS = position.chainageM() - elementStartChainageM.get(index);

        double[] base = pointAt(element, localS);
        double[] right = rightUnitVectorAt(element, localS);
        double x = base[0] + position.offsetM() * right[0];
        double y = base[1] + position.offsetM() * right[1];

        return new Point3D(x, y, position.elevationM());
    }

    /**
     * Same horizontal resolution as {@link #toXYZ(ChainagePosition)},
     * but elevation is derived from a real {@link VerticalProfile}
     * instead of being supplied by the caller (LANDXML-P01).
     */
    public Point3D toXYZ(double chainageM, double offsetM, VerticalProfile profile) {
        Point3D horizontal = toXYZ(new ChainagePosition(chainageM, offsetM, 0));
        return new Point3D(horizontal.x(), horizontal.y(), profile.elevationAt(chainageM));
    }

    /** Projects a real-world point onto the alignment (nearest point). */
    public ChainagePosition toChainage(Point3D point) {
        ChainagePosition best = null;
        double bestDistanceSqM = Double.MAX_VALUE;

        for (int i = 0; i < elements.size(); i++) {
            ElementProjection projection = projectOntoElement(elements.get(i), point);
            if (projection.distanceSqM() < bestDistanceSqM) {
                bestDistanceSqM = projection.distanceSqM();
                double chainageM = elementStartChainageM.get(i) + projection.localChainageM();
                best = new ChainagePosition(chainageM, projection.offsetM(), point.z());
            }
        }
        return best;
    }

    private int elementIndexAtChainage(double chainageM) {
        if (chainageM < -CHAINAGE_TOLERANCE_M || chainageM > totalLengthM + CHAINAGE_TOLERANCE_M) {
            throw new IllegalArgumentException(
                    "Chainage " + chainageM + " m is outside this alignment (0 - " + totalLengthM + " m)");
        }
        for (int i = 0; i < elements.size(); i++) {
            double endM = elementStartChainageM.get(i) + elementLengthM(elements.get(i));
            if (chainageM <= endM + CHAINAGE_TOLERANCE_M) {
                return i;
            }
        }
        return elements.size() - 1;
    }

    // ---- per-element-type geometry (sealed switch - exhaustive, compiler-enforced) ----

    private static double elementLengthM(HorizontalElement element) {
        return switch (element) {
            case StraightElement s -> horizontalLengthM(s);
            case CurveElement c -> curveLengthM(c);
        };
    }

    private static double[] pointAt(HorizontalElement element, double localS) {
        return switch (element) {
            case StraightElement s -> straightPointAt(s, localS);
            case CurveElement c -> curvePointAt(c, localS);
        };
    }

    private static double[] rightUnitVectorAt(HorizontalElement element, double localS) {
        return switch (element) {
            case StraightElement s -> rightUnitVector(s.end().x() - s.start().x(), s.end().y() - s.start().y());
            case CurveElement c -> {
                double[] tangent = curveTangentAt(c, localS);
                yield rightUnitVector(tangent[0], tangent[1]);
            }
        };
    }

    private static ElementProjection projectOntoElement(HorizontalElement element, Point3D point) {
        return switch (element) {
            case StraightElement s -> projectOntoStraight(s, point);
            case CurveElement c -> projectOntoCurve(c, point);
        };
    }

    // ---- straight-element geometry (unchanged from the original implementation) ----

    private static double[] straightPointAt(StraightElement s, double localS) {
        double lengthM = horizontalLengthM(s);
        double fraction = lengthM == 0 ? 0 : localS / lengthM;
        double x = s.start().x() + fraction * (s.end().x() - s.start().x());
        double y = s.start().y() + fraction * (s.end().y() - s.start().y());
        return new double[] {x, y};
    }

    private static ElementProjection projectOntoStraight(StraightElement element, Point3D point) {
        double dx = element.end().x() - element.start().x();
        double dy = element.end().y() - element.start().y();
        double lengthSqM = dx * dx + dy * dy;

        double t;
        if (lengthSqM == 0) {
            t = 0;
        } else {
            double px = point.x() - element.start().x();
            double py = point.y() - element.start().y();
            t = (px * dx + py * dy) / lengthSqM;
            t = Math.max(0, Math.min(1, t));
        }

        double projX = element.start().x() + t * dx;
        double projY = element.start().y() + t * dy;
        double elementLengthM = Math.sqrt(lengthSqM);

        double[] right = rightUnitVector(dx, dy);
        double offsetM = (point.x() - projX) * right[0] + (point.y() - projY) * right[1];

        return new ElementProjection(t * elementLengthM, offsetM, squaredDistance(point.x(), point.y(), projX, projY));
    }

    private static double horizontalLengthM(StraightElement element) {
        return Math.sqrt(squaredDistance(
                element.start().x(), element.start().y(), element.end().x(), element.end().y()));
    }

    // ---- circular-arc geometry (standard closed-form formulas, LANDXML-P01) ----

    private static double curveSweepAngleRad(CurveElement c) {
        double startAngle = Math.atan2(c.start().y() - c.center().y(), c.start().x() - c.center().x());
        double endAngle = Math.atan2(c.end().y() - c.center().y(), c.end().x() - c.center().x());
        double raw = c.clockwise() ? (startAngle - endAngle) : (endAngle - startAngle);
        return ((raw % TWO_PI) + TWO_PI) % TWO_PI;
    }

    private static double curveLengthM(CurveElement c) {
        return c.radiusM() * curveSweepAngleRad(c);
    }

    private static double angleAtArcLength(CurveElement c, double localS) {
        double startAngle = Math.atan2(c.start().y() - c.center().y(), c.start().x() - c.center().x());
        double angularOffsetRad = localS / c.radiusM();
        return c.clockwise() ? startAngle - angularOffsetRad : startAngle + angularOffsetRad;
    }

    private static double[] curvePointAt(CurveElement c, double localS) {
        double angle = angleAtArcLength(c, localS);
        double x = c.center().x() + c.radiusM() * Math.cos(angle);
        double y = c.center().y() + c.radiusM() * Math.sin(angle);
        return new double[] {x, y};
    }

    /** Unit tangent (direction of travel) at arc-length {@code localS} from the curve's start. */
    private static double[] curveTangentAt(CurveElement c, double localS) {
        double angle = angleAtArcLength(c, localS);
        double directionSign = c.clockwise() ? -1 : 1;
        return new double[] {-Math.sin(angle) * directionSign, Math.cos(angle) * directionSign};
    }

    private static ElementProjection projectOntoCurve(CurveElement c, Point3D point) {
        double sweepRad = curveSweepAngleRad(c);
        double startAngle = Math.atan2(c.start().y() - c.center().y(), c.start().x() - c.center().x());
        double pointAngle = Math.atan2(point.y() - c.center().y(), point.x() - c.center().x());

        double rawOffsetRad = c.clockwise() ? (startAngle - pointAngle) : (pointAngle - startAngle);
        double angularOffsetRad = ((rawOffsetRad % TWO_PI) + TWO_PI) % TWO_PI;
        double clampedAngularOffsetRad = Math.max(0, Math.min(sweepRad, angularOffsetRad));
        double localChainageM = c.radiusM() * clampedAngularOffsetRad;

        double[] nearest = curvePointAt(c, localChainageM);
        double[] tangent = curveTangentAt(c, localChainageM);
        double[] right = rightUnitVector(tangent[0], tangent[1]);
        double offsetM = (point.x() - nearest[0]) * right[0] + (point.y() - nearest[1]) * right[1];

        return new ElementProjection(localChainageM, offsetM, squaredDistance(point.x(), point.y(), nearest[0], nearest[1]));
    }

    // ---- shared helpers ----

    private record ElementProjection(double localChainageM, double offsetM, double distanceSqM) {
    }

    private static double squaredDistance(double x1, double y1, double x2, double y2) {
        double dx = x2 - x1;
        double dy = y2 - y1;
        return dx * dx + dy * dy;
    }

    /** Unit vector pointing to the right of travel direction (dx, dy) - i.e. direction rotated -90 degrees. */
    private static double[] rightUnitVector(double dx, double dy) {
        double length = Math.sqrt(dx * dx + dy * dy);
        if (length == 0) {
            return new double[] {0, 0};
        }
        return new double[] {dy / length, -dx / length};
    }
}
