package com.spanova.landxml;

import com.spanova.alignment.Pvi;
import com.spanova.alignment.VerticalProfile;

import java.util.List;

/** Maps a {@link LandXmlProfile} to SPANOVA's own {@link VerticalProfile} - a near 1:1 copy, both are PVI-based by design (this file's own javadoc). */
public final class LandXmlProfileMapper {

    public VerticalProfile toVerticalProfile(LandXmlProfile profile) {
        List<Pvi> pvis = profile.pvis().stream()
                .map(p -> new Pvi(p.chainageM(), p.elevationM(), p.curveLengthM()))
                .toList();
        return new VerticalProfile(profile.name(), pvis);
    }
}
