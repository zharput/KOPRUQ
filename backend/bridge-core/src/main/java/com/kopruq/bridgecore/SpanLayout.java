package com.kopruq.bridgecore;

import java.util.List;

/** An ordered sequence of spans along the bridge alignment. */
public record SpanLayout(List<Span> spans) {

    public int spanCount() {
        return spans.size();
    }

    /** Sum of all span lengths, in meters. */
    public double totalLengthM() {
        return spans.stream().mapToDouble(Span::lengthM).sum();
    }
}
