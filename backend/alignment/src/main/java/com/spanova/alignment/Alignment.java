package com.spanova.alignment;

import com.spanova.spatialcore.Point3D;

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
 * <p><b>Scope for now:</b> only {@link StraightElement} horizontal
 * geometry is supported (see {@link HorizontalElement}). There is no
 * vertical alignment model yet - elevation at a given chainage is never
 * derived here, it is always supplied directly by the caller via
 * {@link ChainagePosition#elevationM()}.
 *
 * <p><b>Chainage convention:</b> measured along the horizontal (x,y)
 * projection of the alignment only, never along 3D slope distance -
 * standard road/rail alignment practice.
 *
 * <p><b>Offset convention:</b> positive offset is to the right of the
 * direction of travel (from the start of the alignment towards its
 * end) - the standard convention for chainage/offset systems.
 */
public final class Alignment {

    private static final double CHAINAGE_TOLERANCE_M = 1e-6;

    private final List<StraightElement> elements;
    private final List<Double> elementStartChainageM;
    private final double totalLengthM;

    public Alignment(List<HorizontalElement> elements) {
        if (elements == null || elements.isEmpty()) {
            throw new IllegalArgumentException("Alignment requires at least one horizontal element");
        }
        this.elements = elements.stream().map(Alignment::asStraight).toList();
        this.elementStartChainageM = new ArrayList<>(this.elements.size());
        double cumulativeM = 0;
        for (StraightElement element : this.elements) {
            elementStartChainageM.add(cumulativeM);
            cumulativeM += horizontalLengthM(element);
        }
        this.totalLengthM = cumulativeM;
    }

    public double totalLengthM() {
        return totalLengthM;
    }

    /** Resolves a chainage/offset/elevation position to a real-world point. */
    public Point3D toXYZ(ChainagePosition position) {
        int index = elementIndexAtChainage(position.chainageM());
        StraightElement element = elements.get(index);
        double elementStartM = elementStartChainageM.get(index);
        double elementLengthM = horizontalLengthM(element);
        double fraction = elementLengthM == 0 ? 0 : (position.chainageM() - elementStartM) / elementLengthM;

        double dx = element.end().x() - element.start().x();
        double dy = element.end().y() - element.start().y();
        double baseX = element.start().x() + fraction * dx;
        double baseY = element.start().y() + fraction * dy;

        double[] right = rightUnitVector(dx, dy);
        double x = baseX + position.offsetM() * right[0];
        double y = baseY + position.offsetM() * right[1];

        return new Point3D(x, y, position.elevationM());
    }

    /** Projects a real-world point onto the alignment (nearest point). */
    public ChainagePosition toChainage(Point3D point) {
        ChainagePosition best = null;
        double bestDistanceSqM = Double.MAX_VALUE;

        for (int i = 0; i < elements.size(); i++) {
            StraightElement element = elements.get(i);
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
            double distanceSqM = squaredDistance(point.x(), point.y(), projX, projY);

            if (distanceSqM < bestDistanceSqM) {
                bestDistanceSqM = distanceSqM;
                double elementLengthM = Math.sqrt(lengthSqM);
                double chainageM = elementStartChainageM.get(i) + t * elementLengthM;

                double[] right = rightUnitVector(dx, dy);
                double offsetM = (point.x() - projX) * right[0] + (point.y() - projY) * right[1];

                best = new ChainagePosition(chainageM, offsetM, point.z());
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
            double endM = elementStartChainageM.get(i) + horizontalLengthM(elements.get(i));
            if (chainageM <= endM + CHAINAGE_TOLERANCE_M) {
                return i;
            }
        }
        return elements.size() - 1;
    }

    private static StraightElement asStraight(HorizontalElement element) {
        if (element instanceof StraightElement straight) {
            return straight;
        }
        throw new UnsupportedOperationException(
                "Only StraightElement is supported so far - see HorizontalElement's class javadoc");
    }

    private static double horizontalLengthM(StraightElement element) {
        return Math.sqrt(squaredDistance(
                element.start().x(), element.start().y(), element.end().x(), element.end().y()));
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
