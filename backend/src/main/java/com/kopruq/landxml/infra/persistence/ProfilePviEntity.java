package com.kopruq.landxml.infra.persistence;

import com.kopruq.alignment.model.Pvi;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** One PVI of the vertical profile: a row of {@code landxml_profile_pvi} (ordered by its {@code ordinal} column). */
@Embeddable
class ProfilePviEntity {

    @Column(name = "chainage_m", nullable = false)
    private double chainageM;
    @Column(name = "elevation_m", nullable = false)
    private double elevationM;
    @Column(name = "curve_length_m", nullable = false)
    private double curveLengthM;

    protected ProfilePviEntity() {
    }

    static ProfilePviEntity from(Pvi pvi) {
        ProfilePviEntity e = new ProfilePviEntity();
        e.chainageM = pvi.chainageM();
        e.elevationM = pvi.elevationM();
        e.curveLengthM = pvi.curveLengthM();
        return e;
    }

    Pvi toDomain() {
        return new Pvi(chainageM, elevationM, curveLengthM);
    }
}
