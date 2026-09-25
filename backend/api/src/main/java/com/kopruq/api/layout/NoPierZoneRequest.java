package com.kopruq.api.layout;

import com.kopruq.constraints.NoPierZone;

/** One no-pier zone from the Site & Layout form. */
public record NoPierZoneRequest(String id, double startChainageM, double endChainageM, String description) {

    public NoPierZone toNoPierZone() {
        return new NoPierZone(id, startChainageM, endChainageM, description);
    }
}
