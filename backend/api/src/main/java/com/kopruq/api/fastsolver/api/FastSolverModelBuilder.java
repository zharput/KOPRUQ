package com.kopruq.api.fastsolver.api;

import com.kopruq.api.error.FieldViolation;
import com.kopruq.api.error.InvalidRequestException;
import com.kopruq.modelbuilder.FrameBridgeInput;
import com.kopruq.modelbuilder.FrameBridgeModel;
import com.kopruq.modelbuilder.FrameBridgeModelBuilder;

import java.util.ArrayList;
import java.util.List;

/**
 * Validates a {@link FastSolverRequest} (collecting every offending field) and maps it onto the solver-independent
 * {@link FrameBridgeInput}; the model itself (topology, modelling simplifications) is built by
 * {@link FrameBridgeModelBuilder} in the {@code model-builder} module.
 */
public final class FastSolverModelBuilder {

    private final FrameBridgeModelBuilder modelBuilder = new FrameBridgeModelBuilder();

    public FrameBridgeModel build(FastSolverRequest request) {
        validate(request);
        return modelBuilder.build(toInput(request));
    }

    /** Maps a validated request (every field present and finite) to the domain input. */
    private static FrameBridgeInput toInput(FastSolverRequest request) {
        return new FrameBridgeInput(
                request.spanLengthsM(), request.deckWidthM(), request.deckThicknessM(), request.sdlKnPerM(),
                request.pierHeightsM(), request.columnLongitudinalM(), request.columnTransverseM(),
                request.columnSpacingTransverseM(), request.capBeamWidthM(), request.capBeamDepthM(),
                request.concreteFckMpa(),
                request.bearingKx(), request.bearingKy(), request.bearingKz(),
                request.bearingKrx(), request.bearingKry(), request.bearingKrz());
    }

    /**
     * Input-domain checks only (finite numbers, required fields, dimensions
     * greater than 0) - no engineering limit is applied. {@code sdlKnPerM} and
     * the bearing stiffnesses are required and finite but deliberately have no
     * sign/range rule. Every violation is collected and reported together.
     */
    static void validate(FastSolverRequest request) {
        var violations = new ArrayList<FieldViolation>();
        if (request == null) {
            violations.add(new FieldViolation("request", "is required"));
            throw new InvalidRequestException(violations);
        }

        List<Double> spans = request.spanLengthsM();
        if (spans == null) {
            violations.add(new FieldViolation("spanLengthsM", "is required"));
        } else if (spans.isEmpty()) {
            violations.add(new FieldViolation("spanLengthsM", "must contain at least one span"));
        } else {
            for (int i = 0; i < spans.size(); i++) {
                requirePositive(violations, "spanLengthsM[" + i + "]", spans.get(i));
            }
        }

        List<Double> piers = request.pierHeightsM();
        if (piers == null) {
            violations.add(new FieldViolation("pierHeightsM", "is required"));
        } else {
            for (int i = 0; i < piers.size(); i++) {
                requirePositive(violations, "pierHeightsM[" + i + "]", piers.get(i));
            }
            if (spans != null && !spans.isEmpty() && piers.size() != spans.size() - 1) {
                violations.add(new FieldViolation("pierHeightsM",
                        "must have one entry per intermediate pier (spanCount - 1 = " + (spans.size() - 1) + "), got " + piers.size()));
            }
        }

        requirePositive(violations, "deckWidthM", request.deckWidthM());
        requirePositive(violations, "deckThicknessM", request.deckThicknessM());
        requirePositive(violations, "columnLongitudinalM", request.columnLongitudinalM());
        requirePositive(violations, "columnTransverseM", request.columnTransverseM());
        requirePositive(violations, "columnSpacingTransverseM", request.columnSpacingTransverseM());
        requirePositive(violations, "capBeamWidthM", request.capBeamWidthM());
        requirePositive(violations, "capBeamDepthM", request.capBeamDepthM());
        requirePositive(violations, "concreteFckMpa", request.concreteFckMpa());

        requireFinite(violations, "sdlKnPerM", request.sdlKnPerM());
        requireFinite(violations, "bearingKx", request.bearingKx());
        requireFinite(violations, "bearingKy", request.bearingKy());
        requireFinite(violations, "bearingKz", request.bearingKz());
        requireFinite(violations, "bearingKrx", request.bearingKrx());
        requireFinite(violations, "bearingKry", request.bearingKry());
        requireFinite(violations, "bearingKrz", request.bearingKrz());

        if (!violations.isEmpty()) {
            throw new InvalidRequestException(violations);
        }
    }

    private static void requireFinite(List<FieldViolation> violations, String field, Double value) {
        if (value == null) {
            violations.add(new FieldViolation(field, "is required"));
        } else if (!Double.isFinite(value)) {
            violations.add(new FieldViolation(field, "must be a finite number"));
        }
    }

    private static void requirePositive(List<FieldViolation> violations, String field, Double value) {
        if (value == null) {
            violations.add(new FieldViolation(field, "is required"));
        } else if (!Double.isFinite(value)) {
            violations.add(new FieldViolation(field, "must be a finite number"));
        } else if (value <= 0) {
            violations.add(new FieldViolation(field, "must be greater than 0"));
        }
    }
}
