package com.spanova.api.kernel;

import com.spanova.bridgecore.Bridge;
import com.spanova.bridgecore.DesignSpace;

/**
 * P02's 9 fields, exactly as named in spec section 20 (Bridge Name,
 * Bridge Length, Deck Width, Minimum/Maximum Span, Minimum/Maximum
 * Girder Count, Minimum/Maximum Girder Depth). Nothing else - Girder
 * Spacing, Slab Thickness, Pier Diameter/Height are real
 * {@link com.spanova.bridgecore.DesignSpace} fields but are out of
 * scope for the P02 form.
 *
 * <p>{@link #toBridge()}/{@link #toDesignSpace()} centralize the
 * request -&gt; bridge-core mapping so both {@link KernelStateController}
 * (P02) and the P03 alternative-generation endpoint build the exact
 * same {@code Bridge}/{@code DesignSpace} from this request - fields
 * not on the form are zeroed, never invented (see
 * {@link DesignSpace#DEFAULT_GIRDER_DEPTH_STEP_M}).
 */
public record KernelStateRequest(
        String bridgeName,
        double totalLengthM,
        double deckWidthM,
        double minSpanM,
        double maxSpanM,
        int minGirderCount,
        int maxGirderCount,
        double minGirderDepthM,
        double maxGirderDepthM) {

    public Bridge toBridge() {
        return new Bridge(bridgeName, totalLengthM, deckWidthM);
    }

    public DesignSpace toDesignSpace() {
        return new DesignSpace(
                minSpanM, maxSpanM,
                minGirderCount, maxGirderCount,
                0, 0,
                minGirderDepthM, maxGirderDepthM,
                0, 0,
                0, 0,
                0, 0,
                DesignSpace.DEFAULT_GIRDER_DEPTH_STEP_M);
    }
}
