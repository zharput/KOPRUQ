package com.spanova.bridgecore;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class SpanLayoutTest {

    @Test
    void spanCount_reflectsNumberOfSpans() {
        var layout = new SpanLayout(List.of(new Span(35), new Span(35), new Span(35)));

        assertEquals(3, layout.spanCount());
    }

    @Test
    void totalLengthM_isSumOfSpanLengths() {
        var layout = new SpanLayout(List.of(new Span(35), new Span(40), new Span(35)));

        assertEquals(110, layout.totalLengthM(), 1e-6);
    }

    @Test
    void emptyLayout_hasZeroCountAndLength() {
        var layout = new SpanLayout(List.of());

        assertEquals(0, layout.spanCount());
        assertEquals(0, layout.totalLengthM(), 1e-6);
    }
}
