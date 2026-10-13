package com.kopruq.bridge.infra.persistence;

import com.kopruq.bridge.application.ProjectLoadInputs;
import com.kopruq.bridge.model.Lm1LaneFactor;
import com.kopruq.bridge.model.SeismicInputsSection;
import com.kopruq.bridge.model.SelfWeightInputsSection;
import com.kopruq.bridge.model.TemperatureInputsSection;
import com.kopruq.bridge.model.TrafficLm1Inputs;
import com.kopruq.bridge.model.TrafficLm1Section;
import com.kopruq.bridge.model.WindInputsSection;
import com.kopruq.bridge.model.WindSnapshotSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;

/**
 * Reads and writes the six load-input sections (seismic, wind, temperature, self-weight, traffic LM1, wind snapshot).
 * Like {@link DesignSystemContentStore} it has no transaction of its own: it runs inside the
 * {@link JpaProjectContentRepository} transaction. The 1:1 sections are replaced by delete, {@code flush}, insert,
 * {@code flush}; a null value only deletes (the section is cleared). Traffic LM1 is a row list; its "was written"
 * state is a {@code project_section_presence} row and a written section always has exactly one
 * {@code REMAINING_AREA_UDL} row.
 */
@Component
class LoadInputContentStore {

    private final ProjectSectionPresenceJpaRepository presence;
    private final SeismicInputJpaRepository seismic;
    private final WindInputJpaRepository wind;
    private final TemperatureInputJpaRepository temperature;
    private final SelfWeightInputJpaRepository selfWeight;
    private final TrafficLm1FactorJpaRepository lm1;
    private final WindSnapshotJpaRepository windSnapshots;

    LoadInputContentStore(ProjectSectionPresenceJpaRepository presence, SeismicInputJpaRepository seismic,
            WindInputJpaRepository wind, TemperatureInputJpaRepository temperature,
            SelfWeightInputJpaRepository selfWeight, TrafficLm1FactorJpaRepository lm1,
            WindSnapshotJpaRepository windSnapshots) {
        this.presence = presence;
        this.seismic = seismic;
        this.wind = wind;
        this.temperature = temperature;
        this.selfWeight = selfWeight;
        this.lm1 = lm1;
        this.windSnapshots = windSnapshots;
    }

    // ------------------------------------------------------------------ load

    ProjectLoadInputs load(UUID projectId) {
        return new ProjectLoadInputs(
                seismic.findById(projectId).map(SeismicInputEntity::toDomain).orElse(null),
                wind.findById(projectId).map(WindInputEntity::toDomain).orElse(null),
                temperature.findById(projectId).map(TemperatureInputEntity::toDomain).orElse(null),
                selfWeight.findById(projectId).map(SelfWeightInputEntity::toDomain).orElse(null),
                loadTrafficLm1(projectId),
                windSnapshots.findById(projectId).map(WindSnapshotEntity::toDomain).orElse(null));
    }

    private TrafficLm1Inputs loadTrafficLm1(UUID projectId) {
        if (!presence.existsByProjectIdAndSection(projectId, StoredSection.TRAFFIC_LM1)) {
            return null;
        }
        List<TrafficLm1FactorEntity> rows = lm1.findByProjectIdOrderByFactorIndexAsc(projectId);
        List<Lm1LaneFactor> tandem = group(rows, Lm1FactorGroup.TANDEM_SYSTEM);
        List<Lm1LaneFactor> udl = group(rows, Lm1FactorGroup.UDL);
        List<Lm1LaneFactor> remaining = group(rows, Lm1FactorGroup.REMAINING_AREA_UDL);
        if (remaining.size() != 1) {
            throw new IllegalStateException("Stored traffic LM1 section of project " + projectId
                    + " must have exactly one REMAINING_AREA_UDL row but has " + remaining.size());
        }
        return new TrafficLm1Inputs(tandem, udl, remaining.get(0));
    }

    private static List<Lm1LaneFactor> group(List<TrafficLm1FactorEntity> rows, Lm1FactorGroup group) {
        return rows.stream().filter(r -> r.getFactorGroup() == group).map(TrafficLm1FactorEntity::toDomain)
                .toList();
    }

    // ------------------------------------------------------------------ replace

    void replace(UUID projectId, SeismicInputsSection section) {
        replaceOne(projectId, seismic, section.inputs() == null ? null
                : new SeismicInputEntity(projectId, section.inputs()));
    }

    void replace(UUID projectId, WindInputsSection section) {
        replaceOne(projectId, wind, section.inputs() == null ? null : new WindInputEntity(projectId, section.inputs()));
    }

    void replace(UUID projectId, TemperatureInputsSection section) {
        replaceOne(projectId, temperature, section.inputs() == null ? null
                : new TemperatureInputEntity(projectId, section.inputs()));
    }

    void replace(UUID projectId, SelfWeightInputsSection section) {
        replaceOne(projectId, selfWeight, section.inputs() == null ? null
                : new SelfWeightInputEntity(projectId, section.inputs()));
    }

    void replace(UUID projectId, WindSnapshotSection section) {
        replaceOne(projectId, windSnapshots, section.snapshot() == null ? null
                : new WindSnapshotEntity(projectId, section.snapshot()));
    }

    void replace(UUID projectId, TrafficLm1Section section) {
        lm1.deleteByProjectId(projectId);
        // Hibernate runs INSERTs before DELETEs: flush the delete first or UNIQUE (project_id, group, index) is violated.
        lm1.flush();
        TrafficLm1Inputs inputs = section.inputs();
        if (inputs != null) {
            List<TrafficLm1FactorEntity> fresh = new ArrayList<>();
            for (int i = 0; i < inputs.tandemSystem().size(); i++) {
                fresh.add(new TrafficLm1FactorEntity(projectId, Lm1FactorGroup.TANDEM_SYSTEM, i,
                        inputs.tandemSystem().get(i)));
            }
            for (int i = 0; i < inputs.udl().size(); i++) {
                fresh.add(new TrafficLm1FactorEntity(projectId, Lm1FactorGroup.UDL, i, inputs.udl().get(i)));
            }
            fresh.add(new TrafficLm1FactorEntity(projectId, Lm1FactorGroup.REMAINING_AREA_UDL, 0,
                    inputs.remainingAreaUdl()));
            lm1.saveAll(fresh);
        }
        boolean marked = presence.existsByProjectIdAndSection(projectId, StoredSection.TRAFFIC_LM1);
        if (inputs != null && !marked) {
            presence.save(new ProjectSectionPresenceEntity(projectId, StoredSection.TRAFFIC_LM1));
        } else if (inputs == null && marked) {
            presence.deleteByProjectIdAndSection(projectId, StoredSection.TRAFFIC_LM1);
        }
        lm1.flush();
    }

    /** 1:1 section: delete the existing row (if any), flush, insert the new one (if any), flush. */
    private <E> void replaceOne(UUID projectId, JpaRepository<E, UUID> repository, E fresh) {
        repository.findById(projectId).ifPresent(repository::delete);
        repository.flush();
        if (fresh != null) {
            repository.save(fresh);
        }
        repository.flush();
    }
}
