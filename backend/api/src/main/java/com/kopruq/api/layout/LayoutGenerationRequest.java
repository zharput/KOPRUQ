package com.kopruq.api.layout;

import com.kopruq.alignment.Alignment;
import com.kopruq.alignment.StraightElement;
import com.kopruq.bridgelayout.BridgeSite;
import com.kopruq.bridgelayout.LayoutDesignSpace;
import com.kopruq.spatialcore.Point3D;

import java.util.List;

/**
 * LAYOUT-P01 form fields (docs/SITE_LAYOUT_PLATFORM_ANALYSIS.md sections
 * M, addendum Q): one straight alignment, one bridge site, zero or more
 * no-pier zones, and the span search ranges. Mirrors
 * {@code KernelStateRequest}'s pattern of centralizing the request -&gt;
 * domain-object mapping here.
 */
public record LayoutGenerationRequest(
        double alignmentLengthM,
        double siteStartChainageM,
        double siteEndChainageM,
        String crossingType,
        List<NoPierZoneRequest> noPierZones,
        double minSpanM,
        double maxSpanM,
        int minSpanCount,
        int maxSpanCount,
        double spanLengthStepM,
        double c1StepM) {

    public Alignment toAlignment() {
        return new Alignment(List.of(new StraightElement(
                new Point3D(0, 0, 0), new Point3D(alignmentLengthM, 0, 0))));
    }

    public BridgeSite toBridgeSite() {
        return new BridgeSite("SITE-1", "Site", siteStartChainageM, siteEndChainageM, crossingType);
    }

    public LayoutDesignSpace toLayoutDesignSpace() {
        return new LayoutDesignSpace(minSpanM, maxSpanM, minSpanCount, maxSpanCount, spanLengthStepM, c1StepM);
    }
}
