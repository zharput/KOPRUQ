package com.kopruq.bridge.api;

import com.kopruq.bridge.model.Bridge;
import com.kopruq.bridge.model.DesignSpace;
import com.kopruq.shared.exception.FieldViolation;
import com.kopruq.shared.validation.FieldChecks;
import java.util.ArrayList;


/**
 * P02's 9 fields, exactly as named in spec section 20 (Bridge Name,
 * Bridge Length, Deck Width, Minimum/Maximum Span, Minimum/Maximum
 * Girder Count, Minimum/Maximum Girder Depth). Nothing else - Girder
 * Spacing, Slab Thickness, Pier Diameter/Height are real
 * {@link com.kopruq.bridge.model.DesignSpace} fields but are out of
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
        Double totalLengthM,
        Double deckWidthM,
        Double minSpanM,
        Double maxSpanM,
        Integer minGirderCount,
        Integer maxGirderCount,
        Double minGirderDepthM,
        Double maxGirderDepthM) {

    /**
     * Every numeric field is required and finite (a missing field must not silently become 0).
     * Reports all offending fields at once via {@link InvalidRequestException}.
     */
    void validate() {
        var violations = new ArrayList<FieldViolation>();
        FieldChecks.requireFinite(violations, "totalLengthM", totalLengthM);
        FieldChecks.requireFinite(violations, "deckWidthM", deckWidthM);
        FieldChecks.requireFinite(violations, "minSpanM", minSpanM);
        FieldChecks.requireFinite(violations, "maxSpanM", maxSpanM);
        FieldChecks.requireNonNull(violations, "minGirderCount", minGirderCount);
        FieldChecks.requireNonNull(violations, "maxGirderCount", maxGirderCount);
        FieldChecks.requireFinite(violations, "minGirderDepthM", minGirderDepthM);
        FieldChecks.requireFinite(violations, "maxGirderDepthM", maxGirderDepthM);
        FieldChecks.throwIfAny(violations);
    }

    public Bridge toBridge() {
        validate();
        return new Bridge(bridgeName, totalLengthM, deckWidthM);
    }

    public DesignSpace toDesignSpace() {
        validate();
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
