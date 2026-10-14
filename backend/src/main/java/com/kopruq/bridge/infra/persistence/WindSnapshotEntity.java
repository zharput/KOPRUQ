package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.enums.WindResultStatus;
import com.kopruq.bridge.model.WindSnapshot;
import com.kopruq.bridge.model.WindSnapshotInputs;
import com.kopruq.bridge.model.WindSnapshotResult;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.util.UUID;

/**
 * Persistent form of the wind snapshot (one row per project): the inputs and, when present, the calculated result as
 * typed columns. {@code result_present} tells "no result" from a result; the result columns are nullable.
 */
@Entity
@Table(name = "load_wind_snapshot")
class WindSnapshotEntity {

    @Id
    @Column(name = "project_id")
    private UUID projectId;

    @Column(name = "schema_version", nullable = false)
    private int schemaVersion;

    @Column(name = "snapshot_status")
    private String snapshotStatus;

    @Column(name = "basic_wind_velocity", nullable = false)
    private String basicWindVelocity;

    @Column(name = "terrain_category", nullable = false)
    private String terrainCategory;

    @Column(name = "reference_height", nullable = false)
    private String referenceHeight;

    @Column(name = "deck_width_m", nullable = false)
    private double deckWidthM;

    @Column(name = "dref_m", nullable = false)
    private double drefM;

    @Column(name = "result_present", nullable = false)
    private boolean resultPresent;

    @Enumerated(EnumType.STRING)
    @Column(name = "result_status", length = 16)
    private WindResultStatus resultStatus;

    @Column(name = "result_z0_m")
    private Double resultZ0M;

    @Column(name = "result_zmin_m")
    private Double resultZminM;

    @Column(name = "result_kr")
    private Double resultKr;

    @Column(name = "result_cr")
    private Double resultCr;

    @Column(name = "result_vm_m_s")
    private Double resultVmMs;

    @Column(name = "result_turbulence_intensity")
    private Double resultTurbulenceIntensity;

    @Column(name = "result_qp_kn_m2")
    private Double resultQpKNm2;

    @Column(name = "result_b_over_d")
    private Double resultBOverD;

    @Column(name = "result_cfx")
    private Double resultCfx;

    @Column(name = "result_transverse_kn_m")
    private Double resultTransverseKNm;

    @Column(name = "result_missing")
    private String resultMissing;

    protected WindSnapshotEntity() {
    }

    WindSnapshotEntity(UUID projectId, WindSnapshot s) {
        this.projectId = projectId;
        this.schemaVersion = s.schemaVersion();
        this.snapshotStatus = s.status();
        this.basicWindVelocity = s.inputs().vb();
        this.terrainCategory = s.inputs().terrain();
        this.referenceHeight = s.inputs().ze();
        this.deckWidthM = s.inputs().deckWidthM();
        this.drefM = s.inputs().drefM();
        WindSnapshotResult r = s.result();
        if (r != null) {
            this.resultPresent = true;
            this.resultStatus = r.status();
            this.resultZ0M = r.z0M();
            this.resultZminM = r.zminM();
            this.resultKr = r.kr();
            this.resultCr = r.cr();
            this.resultVmMs = r.vmMs();
            this.resultTurbulenceIntensity = r.turbulenceIntensity();
            this.resultQpKNm2 = r.qpKNm2();
            this.resultBOverD = r.bOverD();
            this.resultCfx = r.cfx();
            this.resultTransverseKNm = r.transverseKNm();
            this.resultMissing = r.missing();
        }
    }

    WindSnapshot toDomain() {
        return new WindSnapshot(schemaVersion, snapshotStatus, new WindSnapshotInputs(basicWindVelocity,
                terrainCategory, referenceHeight, deckWidthM, drefM), resultToDomain());
    }

    private WindSnapshotResult resultToDomain() {
        if (!resultPresent) {
            if (resultStatus != null || resultZ0M != null || resultZminM != null || resultKr != null
                    || resultCr != null || resultVmMs != null || resultTurbulenceIntensity != null
                    || resultQpKNm2 != null || resultBOverD != null || resultCfx != null
                    || resultTransverseKNm != null || resultMissing != null) {
                throw new IllegalStateException("Stored wind snapshot of project " + projectId
                        + " has result_present = false but a result column is not null");
            }
            return null;
        }
        requireColumn("result_status", resultStatus);
        requireColumn("result_z0_m", resultZ0M);
        requireColumn("result_zmin_m", resultZminM);
        requireColumn("result_kr", resultKr);
        requireColumn("result_cr", resultCr);
        requireColumn("result_vm_m_s", resultVmMs);
        requireColumn("result_turbulence_intensity", resultTurbulenceIntensity);
        requireColumn("result_qp_kn_m2", resultQpKNm2);
        requireColumn("result_b_over_d", resultBOverD);
        requireColumn("result_cfx", resultCfx);
        return new WindSnapshotResult(resultStatus, resultZ0M, resultZminM, resultKr, resultCr, resultVmMs,
                resultTurbulenceIntensity, resultQpKNm2, resultBOverD, resultCfx, resultTransverseKNm,
                resultMissing);
    }

    private void requireColumn(String column, Object value) {
        if (value == null) {
            throw new IllegalStateException("Stored wind snapshot of project " + projectId
                    + " has result_present but " + column + " is null");
        }
    }
}
