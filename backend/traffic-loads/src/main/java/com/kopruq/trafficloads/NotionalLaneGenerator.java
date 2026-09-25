package com.kopruq.trafficloads;

import java.util.ArrayList;
import java.util.List;

/**
 * Generates notional lanes from a carriageway width - EN 1991-2 Table
 * 4.1's confirmed part only (spec section 22, never invented from
 * memory): lane width = 3.00 m/lane (the engineer's own confirmed
 * value, docs/roadmap.md's "P07 loads/bearing/soil" section), lane
 * count = floor(carriagewayWidthM / 3.00), remainder as the remaining
 * area.
 *
 * <p><b>Deliberately NOT implemented</b>: EN 1991-2 Table 4.1's special
 * cases for narrow carriageways (w &lt; 5.4 m -&gt; 1 lane at 3 m; 5.4 m
 * &lt;= w &lt; 6 m -&gt; 2 lanes at w/2 each). Those specific branch
 * thresholds have not been explicitly confirmed by the engineer in this
 * project - only the general 3.00 m/lane rule has. Using this generator
 * on a carriageway narrower than 6 m may not match the code's own
 * special-case rule yet - surfaced as a warning by
 * {@link TrafficLoadsService#validate}, not silently assumed correct.
 */
public final class NotionalLaneGenerator {

    public static final double CONFIRMED_LANE_WIDTH_M = 3.00;
    public static final double NARROW_CARRIAGEWAY_THRESHOLD_M = 6.00;

    public NotionalLaneResult generate(CarriagewayInput input) {
        double carriagewayWidthM = input.carriagewayWidthM();
        int laneCount = carriagewayWidthM > 0 ? (int) Math.floor(carriagewayWidthM / CONFIRMED_LANE_WIDTH_M) : 0;

        List<NotionalLane> lanes = new ArrayList<>(laneCount);
        for (int i = 1; i <= laneCount; i++) {
            lanes.add(new NotionalLane(i, CONFIRMED_LANE_WIDTH_M));
        }
        double remainingAreaWidthM = carriagewayWidthM - laneCount * CONFIRMED_LANE_WIDTH_M;

        return new NotionalLaneResult(lanes, Math.max(0, remainingAreaWidthM));
    }
}
