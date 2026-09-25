package com.kopruq.trafficloads;

import java.util.List;

/** LM1 (EN 1991-2 4.3.2) - Tandem System + UDL per lane, plus the remaining-area UDL. */
public record Lm1Parameters(List<LaneFactor> tandemSystem, List<LaneFactor> udl, LaneFactor remainingAreaUdl) {
}
