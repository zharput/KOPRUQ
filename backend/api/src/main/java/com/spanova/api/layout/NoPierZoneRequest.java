package com.spanova.api.layout;

import com.spanova.constraints.NoPierZone;

/** One no-pier zone from the Site & Layout form. */
public record NoPierZoneRequest(String id, double startChainageM, double endChainageM, String description) {

    public NoPierZone toNoPierZone() {
        return new NoPierZone(id, startChainageM, endChainageM, description);
    }
}
