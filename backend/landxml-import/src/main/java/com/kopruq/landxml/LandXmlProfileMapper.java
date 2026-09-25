package com.kopruq.landxml;

import com.kopruq.alignment.Pvi;
import com.kopruq.alignment.VerticalProfile;

import java.util.List;

/** Maps a {@link LandXmlProfile} to KOPRUQ's own {@link VerticalProfile} - a near 1:1 copy, both are PVI-based by design (this file's own javadoc). */
public final class LandXmlProfileMapper {

    public VerticalProfile toVerticalProfile(LandXmlProfile profile) {
        List<Pvi> pvis = profile.pvis().stream()
                .map(p -> new Pvi(p.chainageM(), p.elevationM(), p.curveLengthM()))
                .toList();
        return new VerticalProfile(profile.name(), pvis);
    }
}
