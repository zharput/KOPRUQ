package com.kopruq.bridge.model;

import com.kopruq.bridge.enums.WindResultStatus;

/**
 * The calculated wind result stored with a snapshot, exactly as calculated. Units are in the field names (m, m/s,
 * kN/m2, kN/m); kr, cr, turbulence intensity, b/d and cfx are unitless. Only structure is checked (status present,
 * numbers finite, {@code transverseKNm} null or finite); there is no range or consistency rule, and {@code missing}
 * is free text.
 */
public record WindSnapshotResult(WindResultStatus status, double z0M, double zminM, double kr, double cr,
        double vmMs, double turbulenceIntensity, double qpKNm2, double bOverD, double cfx, Double transverseKNm,
        String missing) {

    public WindSnapshotResult {
        SectionInvariants.required("status", status);
        SectionInvariants.finite("z0M", z0M);
        SectionInvariants.finite("zminM", zminM);
        SectionInvariants.finite("kr", kr);
        SectionInvariants.finite("cr", cr);
        SectionInvariants.finite("vmMs", vmMs);
        SectionInvariants.finite("turbulenceIntensity", turbulenceIntensity);
        SectionInvariants.finite("qpKNm2", qpKNm2);
        SectionInvariants.finite("bOverD", bOverD);
        SectionInvariants.finite("cfx", cfx);
        SectionInvariants.finiteOrNull("transverseKNm", transverseKNm);
    }
}
