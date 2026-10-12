package com.kopruq.bridgelayout;

import com.kopruq.alignment.Alignment;
import com.kopruq.constraints.NoPierZone;

import java.util.ArrayList;
import java.util.List;

/**
 * LAYOUT-P01 (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md sections D, G, M,
 * addendum Q): generates candidate {@link BridgeLayoutAlternative}s for
 * one {@link BridgeSite}.
 *
 * <p>Algorithm: walk candidate C1 (first abutment) chainages across the
 * site at {@link LayoutDesignSpace#c1StepM()}; for each C1, walk
 * candidate span counts and uniform span lengths (mirrors
 * {@code generative-engine}'s {@code AlternativeGenerator}); keep only
 * arrangements whose C2 (last abutment) still fits inside the site;
 * evaluate every intermediate pier against every {@link NoPierZone}.
 * This is "reject early, reject cheap" at a small scale
 * (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md section J/G) - out-of-site
 * arrangements are never even constructed, constraint violations are
 * caught while walking, not in a separate pass.
 *
 * <p><b>Deliberately out of scope for now</b> (see the analysis
 * document's own sections for why): no terrain, no abutment/pier height,
 * no geotechnical/hydraulic evaluation, no {@code WARNING} tier, no
 * preliminary foundation/quantity/cost/carbon scoring. This class will
 * likely split into the documented {@code AbutmentPlacementEngine}/
 * {@code PierPlacementEngine}/{@code ConstraintEvaluator}/
 * {@code SpanArrangementGenerator} sub-components once each grows real,
 * independent logic (e.g. once terrain-based height feasibility is
 * added) - one class is enough while the logic is this small.
 */
public final class BridgeLayoutEngine {

    private static final double TOLERANCE_M = 1e-6;

    public List<BridgeLayoutAlternative> generate(
            Alignment alignment, BridgeSite site, List<NoPierZone> noPierZones, LayoutDesignSpace designSpace) {
        validate(alignment, site, designSpace);

        var results = new ArrayList<BridgeLayoutAlternative>();
        int counter = 0;

        requireAdvancing(site.startChainageM(), designSpace.c1StepM(), "c1StepM");
        requireRepresentable((site.endChainageM() - site.startChainageM()) / designSpace.c1StepM(), "c1StepM");
        List<Double> spanLengths = feasibleSpanLengths(designSpace);

        // Index-based C1 walk (c1 = start + i * step): "c1 += step" never ends once the step falls below the ULP of c1.
        for (long c1Index = 0; ; c1Index++) {
            double c1ChainageM = site.startChainageM() + c1Index * designSpace.c1StepM();
            if (c1ChainageM > site.endChainageM() + TOLERANCE_M) {
                break;
            }

            // long counter: an int counter wraps (and never ends) when maxSpanCount == Integer.MAX_VALUE
            for (long spanCount = designSpace.minSpanCount(); spanCount <= designSpace.maxSpanCount(); spanCount++) {
                for (double spanLengthM : spanLengths) {
                    double bridgeLengthM = spanCount * spanLengthM;
                    double c2ChainageM = c1ChainageM + bridgeLengthM;
                    if (c2ChainageM > site.endChainageM() + TOLERANCE_M) {
                        continue;
                    }

                    var piers = new ArrayList<PierCandidate>();
                    var constraintResults = new ArrayList<ConstraintCheckResult>();
                    boolean anyPierRejected = false;

                    for (int k = 1; k < spanCount; k++) {
                        double pierChainageM = c1ChainageM + k * spanLengthM;
                        var reasons = new ArrayList<String>();

                        for (NoPierZone zone : noPierZones) {
                            boolean violated = zone.containsChainage(pierChainageM, TOLERANCE_M);
                            constraintResults.add(new ConstraintCheckResult(
                                    zone.id(), pierChainageM, violated,
                                    violated
                                            ? "Pier at chainage %.3f m falls inside no-pier zone [%.3f, %.3f] m"
                                                    .formatted(pierChainageM, zone.startChainageM(), zone.endChainageM())
                                            : "OK"));
                            if (violated) {
                                reasons.add("Inside no-pier zone " + zone.id());
                            }
                        }

                        var status = reasons.isEmpty() ? FeasibilityStatus.FEASIBLE : FeasibilityStatus.REJECT;
                        if (status == FeasibilityStatus.REJECT) {
                            anyPierRejected = true;
                        }
                        piers.add(new PierCandidate(pierChainageM, status, List.copyOf(reasons)));
                    }

                    var spanLengthsM = new ArrayList<Double>((int) spanCount);
                    for (long i = 0; i < spanCount; i++) {
                        spanLengthsM.add(spanLengthM);
                    }

                    results.add(new BridgeLayoutAlternative(
                            "LAYOUT-" + (++counter),
                            new AbutmentCandidate(c1ChainageM),
                            new AbutmentCandidate(c2ChainageM),
                            List.copyOf(piers),
                            List.copyOf(spanLengthsM),
                            bridgeLengthM,
                            anyPierRejected ? FeasibilityStatus.REJECT : FeasibilityStatus.FEASIBLE,
                            List.copyOf(constraintResults)));
                }
            }
        }

        return results;
    }

    private static List<Double> feasibleSpanLengths(LayoutDesignSpace designSpace) {
        requireAdvancing(designSpace.minSpanM(), designSpace.spanLengthStepM(), "spanLengthStepM");
        requireRepresentable((designSpace.maxSpanM() - designSpace.minSpanM()) / designSpace.spanLengthStepM(), "spanLengthStepM");
        var lengths = new ArrayList<Double>();
        for (long i = 0; ; i++) {
            double lengthM = designSpace.minSpanM() + i * designSpace.spanLengthStepM();
            if (lengthM > designSpace.maxSpanM() + 1e-9) {
                break;
            }
            lengths.add(Math.round(lengthM * 1_000_000d) / 1_000_000d);
        }
        return lengths;
    }

    /** A step that does not change the value it is added to would make a walk loop forever. */
    private static void requireAdvancing(double from, double step, String name) {
        if (!(from + step > from)) {
            throw new IllegalArgumentException(name + " is too small to advance (it does not change the value it is added to)");
        }
    }

    private static void requireRepresentable(double stepCount, String name) {
        if (!(stepCount <= Integer.MAX_VALUE)) {
            throw new IllegalArgumentException(name + " produces more steps than can be represented");
        }
    }

    private static void validate(Alignment alignment, BridgeSite site, LayoutDesignSpace designSpace) {
        if (site.startChainageM() < -TOLERANCE_M || site.endChainageM() > alignment.totalLengthM() + TOLERANCE_M) {
            throw new IllegalArgumentException(
                    "BridgeSite [" + site.startChainageM() + ", " + site.endChainageM() +
                            "] m falls outside the alignment (0 - " + alignment.totalLengthM() + " m)");
        }
        if (!(designSpace.minSpanM() > 0) || designSpace.maxSpanM() < designSpace.minSpanM()) {
            throw new IllegalArgumentException("minSpanM/maxSpanM range is invalid");
        }
        if (designSpace.minSpanCount() < 1 || designSpace.maxSpanCount() < designSpace.minSpanCount()) {
            throw new IllegalArgumentException("minSpanCount/maxSpanCount range is invalid");
        }
        if (!(designSpace.spanLengthStepM() > 0)) {
            throw new IllegalArgumentException("spanLengthStepM must be > 0");
        }
        if (!(designSpace.c1StepM() > 0)) {
            throw new IllegalArgumentException("c1StepM must be > 0");
        }
    }
}
