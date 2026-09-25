package com.kopruq.generative;

import com.kopruq.bridgecore.Bridge;
import com.kopruq.bridgecore.BridgeAlternative;
import com.kopruq.bridgecore.DesignSpace;
import com.kopruq.bridgecore.Girder;
import com.kopruq.bridgecore.Span;
import com.kopruq.bridgecore.SpanLayout;

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

        for (int spanCount : feasibleSpanCounts(bridge.totalLengthM(), designSpace)) {
            double uniformSpanLengthM = bridge.totalLengthM() / spanCount;
            var spans = new ArrayList<Span>(spanCount);
            for (int i = 0; i < spanCount; i++) {
                spans.add(new Span(uniformSpanLengthM));
            }
            var spanLayout = new SpanLayout(spans);

            for (int girderCount = designSpace.minGirderCount(); girderCount <= designSpace.maxGirderCount(); girderCount++) {
                for (double girderDepthM : feasibleGirderDepths(designSpace)) {
                    var girder = new Girder(girderCount, girderDepthM, 0);
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

        int minSpanCount = Math.max(1, (int) Math.floor(totalLengthM / designSpace.maxSpanM()));
        int maxSpanCount = Math.max(1, (int) Math.ceil(totalLengthM / designSpace.minSpanM()));

        var counts = new ArrayList<Integer>();
        for (int n = minSpanCount; n <= maxSpanCount; n++) {
            double uniformSpan = totalLengthM / n;
            if (uniformSpan >= designSpace.minSpanM() - tolerance && uniformSpan <= designSpace.maxSpanM() + tolerance) {
                counts.add(n);
            }
        }
        return counts;
    }

    private static List<Double> feasibleGirderDepths(DesignSpace designSpace) {
        var depths = new ArrayList<Double>();
        for (double depth = designSpace.minGirderDepthM();
             depth <= designSpace.maxGirderDepthM() + 1e-9;
             depth += designSpace.girderDepthStepM()) {
            depths.add(Math.round(depth * 1_000_000d) / 1_000_000d);
        }
        return depths;
    }

    private static void validateRange(double min, double max, String name) {
        if (min <= 0 || max <= 0 || min > max) {
            throw new IllegalArgumentException(name + " min/max range is invalid.");
        }
    }
}
