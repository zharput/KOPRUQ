package com.kopruq.trafficloads;

/**
 * Carriageway width = deck width minus both walkways - the engineer's
 * own confirmed formula (docs/roadmap.md's "P07 loads/bearing/soil"
 * section), same as {@code carriagewayWidthM()} already implemented in
 * the frontend's `features/superstructure-families` for the Precast
 * cross section. Kept as its own small record here (not re-deriving
 * from {@code CrossSectionValues}, which is a frontend-only type) so
 * this module stays independent of any particular caller's state shape.
 */
public record CarriagewayInput(double deckWidthM, double leftWalkwayM, double rightWalkwayM) {

    public CarriagewayInput {
        if (!Double.isFinite(deckWidthM) || !Double.isFinite(leftWalkwayM) || !Double.isFinite(rightWalkwayM)) {
            throw new IllegalArgumentException("deckWidthM, leftWalkwayM and rightWalkwayM must be finite numbers");
        }
    }

    public double carriagewayWidthM() {
        return deckWidthM - leftWalkwayM - rightWalkwayM;
    }
}
