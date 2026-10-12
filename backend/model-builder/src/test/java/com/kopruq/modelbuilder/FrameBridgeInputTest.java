package com.kopruq.modelbuilder;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class FrameBridgeInputTest {

    private static FrameBridgeInput with(List<Double> spans, List<Double> piers, double deckWidth, double sdl, double kx) {
        return new FrameBridgeInput(spans, deckWidth, 1.0, sdl, piers, 2.0, 4.0, 8.0, 3.0, 1.5, 30.0,
                kx, 30000.0, 100000.0, 100000.0, 100000.0, 100000.0);
    }

    @Test
    void aValidInputIsAccepted_andSdlAndBearingStiffnessHaveNoSignRule() {
        assertDoesNotThrow(() -> with(List.of(30.0, 40.0), List.of(10.0), 15.0, 10.0, 3000.0));
        assertDoesNotThrow(() -> with(List.of(30.0, 40.0), List.of(10.0), 15.0, -10.0, 0.0));
    }

    @Test
    void spansMustBePresentNonEmptyFiniteAndPositive() {
        assertThrows(IllegalArgumentException.class, () -> with(null, List.of(), 15.0, 10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(), List.of(), 15.0, 10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(0.0), List.of(), 15.0, 10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(Double.NaN), List.of(), 15.0, 10.0, 1.0));
    }

    @Test
    void oneHeightPerIntermediatePierIsRequired() {
        assertThrows(IllegalArgumentException.class, () -> with(List.of(30.0, 40.0), List.of(), 15.0, 10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(30.0, 40.0), List.of(10.0, 12.0), 15.0, 10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(30.0, 40.0), null, 15.0, 10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(30.0, 40.0), List.of(-1.0), 15.0, 10.0, 1.0));
    }

    @Test
    void dimensionsMustBePositive_andSdlAndStiffnessFinite() {
        assertThrows(IllegalArgumentException.class, () -> with(List.of(30.0), List.of(), 0.0, 10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(30.0), List.of(), Double.POSITIVE_INFINITY, 10.0, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(30.0), List.of(), 15.0, Double.NaN, 1.0));
        assertThrows(IllegalArgumentException.class, () -> with(List.of(30.0), List.of(), 15.0, 10.0, Double.NaN));
    }
}
