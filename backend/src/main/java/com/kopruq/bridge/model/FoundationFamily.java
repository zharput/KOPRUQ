package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.FoundationFamilyType;

/**
 * A foundation family as stored by the frontend; only {@code id} is required. A generation, when present, has all
 * of its rules. Rule values are in metres, except the pile counts which are unitless.
 */
public record FoundationFamily(String id, String name, FoundationFamilyType foundationType, Boolean enabled,
        ShallowGeneration shallowGeneration, PiledGeneration piledGeneration, String source) {

    /** Shallow foundation generation rules (metres). */
    public record ShallowGeneration(RangeRule lengthX, RangeRule lengthY, RangeRule height) {

        public ShallowGeneration {
            SectionInvariants.required("lengthX", lengthX);
            SectionInvariants.required("lengthY", lengthY);
            SectionInvariants.required("height", height);
        }
    }

    /** Piled foundation generation rules (metres; the pile counts are unitless). */
    public record PiledGeneration(RangeRule pileDiameter, RangeRule pileCountX, RangeRule pileSpacingX,
            RangeRule pileCountY, RangeRule pileSpacingY, RangeRule height) {

        public PiledGeneration {
            SectionInvariants.required("pileDiameter", pileDiameter);
            SectionInvariants.required("pileCountX", pileCountX);
            SectionInvariants.required("pileSpacingX", pileSpacingX);
            SectionInvariants.required("pileCountY", pileCountY);
            SectionInvariants.required("pileSpacingY", pileSpacingY);
            SectionInvariants.required("height", height);
        }
    }

    public FoundationFamily {
        SectionInvariants.notBlank("id", id);
    }
}
