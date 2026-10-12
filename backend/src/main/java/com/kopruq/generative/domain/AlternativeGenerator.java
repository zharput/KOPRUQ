package com.kopruq.generative.domain;

import com.kopruq.bridge.model.Bridge;
import com.kopruq.bridge.model.BridgeAlternative;
import com.kopruq.bridge.model.DesignSpace;
import com.kopruq.bridge.model.Girder;
import com.kopruq.bridge.model.Span;
import com.kopruq.bridge.model.SpanLayout;

import java.util.ArrayList;
import java.util.List;

/**
 * P03's "first computational design engine" (spec section 20).
 *
 * <p>Scope, per the spec's own P03 description: generate feasible
 * SPAN-LAYOUT and GIRDER alternatives only - not Deck/Pier/Foundation
 * (see {@link BridgeAlternative}). "Feasible" here means only the
 * definitional/geometric consequences of the engineer's own ranges
 * (span count fits, spans sum to the requested length, girder
 * count/depth inside the requested range) - there is no Rules Engine
 * yet (that is P04) and no invented structural ratio or limit is
 * applied.
 *
 * <p>Open assumption: alternatives use a UNIFORM span layout (every
 * span in one alternative has the same length, totalLengthM /
 * spanCount). The spec's own example gives a single "Span Range =
 * 30-45 m" per alternative, not a per-span breakdown, so this is read
 * as the simplest faithful interpretation - flag it to the engineer if
 * non-uniform layouts (e.g. shorter end spans) are actually wanted
 * here. Same reading as the archived C#/Avalonia build's generator.
 */
public final class AlternativeGenerator {

    public List<BridgeAlternative> generate(Bridge bridge, DesignSpace designSpace) {
        if (bridge.totalLengthM() <= 0) {
            throw new IllegalArgumentException("totalLengthM must be > 0.");
        }
        validateRange(designSpace.minSpanM(), designSpace.maxSpanM(), "span");
        validateRange(designSpace.minGirderCount(), designSpace.maxGirderCount(), "girderCount");
        validateRange(designSpace.minGirderDepthM(), designSpace.maxGirderDepthM(), "girderDepth");
        if (designSpace.girderDepthStepM() <= 0) {
            throw new IllegalArgumentException("girderDepthStepM must be > 0.");
        }

        var results = new ArrayList<BridgeAlternative>();

        List<Double> girderDepths = feasibleGirderDepths(designSpace);
        for (int spanCount : feasibleSpanCounts(bridge.totalLengthM(), designSpace)) {
            double uniformSpanLengthM = bridge.totalLengthM() / spanCount;
            var spans = new ArrayList<Span>(spanCount);
            for (int i = 0; i < spanCount; i++) {
                spans.add(new Span(uniformSpanLengthM));
            }
            var spanLayout = new SpanLayout(spans);

            // long counter: an int counter would wrap around (and never end) when maxGirderCount == Integer.MAX_VALUE
            for (long girderCount = designSpace.minGirderCount(); girderCount <= designSpace.maxGirderCount(); girderCount++) {
                for (double girderDepthM : girderDepths) {
                    var girder = new Girder((int) girderCount, girderDepthM, 0);
                    results.add(BridgeAlternative.of(spanLayout, girder));
                }
            }
        }

        return results;
    }

    /**
     * Span counts N for which a uniform span length totalLengthM / N
     * falls inside [minSpanM, maxSpanM]. A small tolerance avoids
     * rejecting a valid layout on floating-point rounding alone.
     */
    private static List<Integer> feasibleSpanCounts(double totalLengthM, DesignSpace designSpace) {
        final double tolerance = 1e-6;

        // Compute the bounds as doubles first: a (int) cast would saturate at Integer.MAX_VALUE and an
        // int loop up to it would never terminate. A count that cannot be represented is rejected.
        double minSpanCountExact = Math.max(1, Math.floor(totalLengthM / designSpace.maxSpanM()));
        double maxSpanCountExact = Math.max(1, Math.ceil(totalLengthM / designSpace.minSpanM()));
        if (!(maxSpanCountExact <= Integer.MAX_VALUE) || !(minSpanCountExact <= Integer.MAX_VALUE)) {
            throw new IllegalArgumentException(
                    "The span count range for this bridge length and span range cannot be represented (more than "
                            + Integer.MAX_VALUE + " spans).");
        }
        long minSpanCount = (long) minSpanCountExact;
        long maxSpanCount = (long) maxSpanCountExact;

        var counts = new ArrayList<Integer>();
        for (long n = minSpanCount; n <= maxSpanCount; n++) {
            double uniformSpan = totalLengthM / n;
            if (uniformSpan >= designSpace.minSpanM() - tolerance && uniformSpan <= designSpace.maxSpanM() + tolerance) {
                counts.add((int) n);
            }
        }
        return counts;
    }

    private static List<Double> feasibleGirderDepths(DesignSpace designSpace) {
        double min = designSpace.minGirderDepthM();
        double max = designSpace.maxGirderDepthM();
        double step = designSpace.girderDepthStepM();
        // A step that cannot move the value (below its ULP) would loop forever with "depth += step".
        if (!(min + step > min)) {
            throw new IllegalArgumentException("girderDepthStepM is too small to advance from minGirderDepthM.");
        }
        if (!((max - min) / step <= Integer.MAX_VALUE)) {
            throw new IllegalArgumentException("The girder depth range / step produces more depths than can be represented.");
        }
        var depths = new ArrayList<Double>();
        // Index-based: depth = min + i * step (no accumulated rounding), same 1e-9 inclusion tolerance and 1e-6 rounding as before.
        for (long i = 0; ; i++) {
            double depth = min + i * step;
            if (depth > max + 1e-9) {
                break;
            }
            depths.add(Math.round(depth * 1_000_000d) / 1_000_000d);
        }
        return depths;
    }

    private static void validateRange(double min, double max, String name) {
        if (!(min > 0) || !(max > 0) || min > max) {
            throw new IllegalArgumentException(name + " min/max range is invalid.");
        }
    }
}
