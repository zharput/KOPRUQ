package com.kopruq.trafficloads;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class NotionalLaneGeneratorTest {

    private static final double EPS = 1e-9;
    private final NotionalLaneGenerator generator = new NotionalLaneGenerator();

    @Test
    void generatesThreeLanesForTheDefaultPrecastCarriageway() {
        // Same default as Superstructure Families' Precast cross section: platform 13.80 m, walkways 1.00/1.50 m -> carriageway 11.30 m.
        NotionalLaneResult result = generator.generate(new CarriagewayInput(13.80, 1.00, 1.50));

        assertEquals(3, result.lanes().size());
        assertEquals(3.00, result.lanes().get(0).widthM(), EPS);
        assertEquals(11.30 - 9.00, result.remainingAreaWidthM(), EPS);
    }

    @Test
    void lanesAreNumberedSequentiallyFromOne() {
        NotionalLaneResult result = generator.generate(new CarriagewayInput(9.30, 0, 0));

        assertEquals(1, result.lanes().get(0).number());
        assertEquals(2, result.lanes().get(1).number());
        assertEquals(3, result.lanes().get(2).number());
    }

    @Test
    void exactMultipleOfLaneWidth_leavesNoRemainder() {
        NotionalLaneResult result = generator.generate(new CarriagewayInput(6.00, 0, 0));

        assertEquals(2, result.lanes().size());
        assertEquals(0, result.remainingAreaWidthM(), EPS);
    }

    @Test
    void narrowCarriageway_stillProducesAnHonestResultNoCrash() {
        NotionalLaneResult result = generator.generate(new CarriagewayInput(2.00, 0, 0));

        assertEquals(0, result.lanes().size());
        assertEquals(2.00, result.remainingAreaWidthM(), EPS);
    }

    @Test
    void nonPositiveCarriageway_doesNotCrashOrGoNegative() {
        NotionalLaneResult result = generator.generate(new CarriagewayInput(1.00, 1.00, 0.50));

        assertEquals(0, result.lanes().size());
        assertEquals(0, result.remainingAreaWidthM(), EPS);
    }
}
