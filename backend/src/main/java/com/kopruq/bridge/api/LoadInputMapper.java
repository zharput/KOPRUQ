package com.kopruq.bridge.api;

import com.kopruq.bridge.api.LoadInputDtos.Lm1LaneFactorDto;
import com.kopruq.bridge.api.LoadInputDtos.Lm1ParameterValueDto;
import com.kopruq.bridge.api.LoadInputDtos.SeismicInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.SelfWeightInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.TemperatureInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.TrafficLm1Dto;
import com.kopruq.bridge.api.LoadInputDtos.WindInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.WindSnapshotDto;
import com.kopruq.bridge.api.LoadInputDtos.WindSnapshotInputsDto;
import com.kopruq.bridge.api.LoadInputDtos.WindSnapshotResultDto;
import com.kopruq.bridge.application.ProjectLoadInputs;
import com.kopruq.bridge.enums.ParameterProvenance;
import com.kopruq.bridge.enums.WindResultStatus;
import com.kopruq.bridge.model.Lm1LaneFactor;
import com.kopruq.bridge.model.Lm1ParameterValue;
import com.kopruq.bridge.model.SeismicInputs;
import com.kopruq.bridge.model.SeismicInputsSection;
import com.kopruq.bridge.model.SelfWeightInputs;
import com.kopruq.bridge.model.SelfWeightInputsSection;
import com.kopruq.bridge.model.TemperatureInputs;
import com.kopruq.bridge.model.TemperatureInputsSection;
import com.kopruq.bridge.model.TrafficLm1Inputs;
import com.kopruq.bridge.model.TrafficLm1Section;
import com.kopruq.bridge.model.WindInputs;
import com.kopruq.bridge.model.WindInputsSection;
import com.kopruq.bridge.model.WindSnapshot;
import com.kopruq.bridge.model.WindSnapshotInputs;
import com.kopruq.bridge.model.WindSnapshotResult;
import com.kopruq.bridge.model.WindSnapshotSection;

import java.util.List;

/**
 * Converts the six load-input JSON shapes to the model and back. Only structure is checked (present, finite, known
 * provenance, wind-result status, wind-snapshot schema version); no engineering rule, range, default or unit conversion is applied, and
 * string inputs are stored exactly as typed. A null {@code value} clears the section.
 */
final class LoadInputMapper {

    private LoadInputMapper() {
    }

    // ------------------------------------------------------------------ to model

    static SeismicInputsSection toSeismic(SeismicInputsDto dto, String path) {
        if (dto == null) {
            return new SeismicInputsSection(null);
        }
        SectionChecks c = new SectionChecks();
        String a = c.text(path + ".a", dto.a());
        String g = c.text(path + ".g", dto.g());
        String t = c.text(path + ".t", dto.t());
        String i = c.text(path + ".i", dto.i());
        c.throwIfAny();
        return new SeismicInputsSection(new SeismicInputs(a, g, t, i));
    }

    static WindInputsSection toWind(WindInputsDto dto, String path) {
        if (dto == null) {
            return new WindInputsSection(null);
        }
        SectionChecks c = new SectionChecks();
        String vb = c.text(path + ".vb", dto.vb());
        String terrain = c.text(path + ".terrain", dto.terrain());
        String ze = c.text(path + ".ze", dto.ze());
        c.throwIfAny();
        return new WindInputsSection(new WindInputs(vb, terrain, ze));
    }

    static TemperatureInputsSection toTemperature(TemperatureInputsDto dto, String path) {
        if (dto == null) {
            return new TemperatureInputsSection(null);
        }
        SectionChecks c = new SectionChecks();
        String min = c.text(path + ".min", dto.min());
        String max = c.text(path + ".max", dto.max());
        String t0 = c.text(path + ".t0", dto.t0());
        c.throwIfAny();
        return new TemperatureInputsSection(new TemperatureInputs(min, max, t0));
    }

    static SelfWeightInputsSection toSelfWeight(SelfWeightInputsDto d, String path) {
        if (d == null) {
            return new SelfWeightInputsSection(null);
        }
        SectionChecks c = new SectionChecks();
        double asphaltThickness = c.requiredFinite(path + ".asphaltThicknessM", d.asphaltThicknessM());
        double asphaltUnitWeight = c.requiredFinite(path + ".asphaltUnitWeightKNm3", d.asphaltUnitWeightKNm3());
        double sidewalkThickness = c.requiredFinite(path + ".sidewalkThicknessM", d.sidewalkThicknessM());
        double sidewalkUnitWeight = c.requiredFinite(path + ".sidewalkUnitWeightKNm3", d.sidewalkUnitWeightKNm3());
        double faciaCount = c.requiredFinite(path + ".faciaCount", d.faciaCount());
        double faciaWidth = c.requiredFinite(path + ".faciaWidthM", d.faciaWidthM());
        double faciaThickness = c.requiredFinite(path + ".faciaThicknessM", d.faciaThicknessM());
        double faciaUnitWeight = c.requiredFinite(path + ".faciaUnitWeightKNm3", d.faciaUnitWeightKNm3());
        double guardrailCount = c.requiredFinite(path + ".guardrailCount", d.guardrailCount());
        double guardrailLoad = c.requiredFinite(path + ".guardrailUnitLoadKNm", d.guardrailUnitLoadKNm());
        double railingCount = c.requiredFinite(path + ".pedestrianRailingCount", d.pedestrianRailingCount());
        double railingLoad = c.requiredFinite(path + ".pedestrianRailingUnitLoadKNm",
                d.pedestrianRailingUnitLoadKNm());
        double fenceCount = c.requiredFinite(path + ".protectiveFenceCount", d.protectiveFenceCount());
        double fenceLoad = c.requiredFinite(path + ".protectiveFenceUnitLoadKNm", d.protectiveFenceUnitLoadKNm());
        double panelCount = c.requiredFinite(path + ".soundPanelCount", d.soundPanelCount());
        double panelLoad = c.requiredFinite(path + ".soundPanelUnitLoadKNm", d.soundPanelUnitLoadKNm());
        c.throwIfAny();
        return new SelfWeightInputsSection(new SelfWeightInputs(asphaltThickness, asphaltUnitWeight,
                sidewalkThickness, sidewalkUnitWeight, faciaCount, faciaWidth, faciaThickness, faciaUnitWeight,
                guardrailCount, guardrailLoad, railingCount, railingLoad, fenceCount, fenceLoad, panelCount,
                panelLoad));
    }

    static TrafficLm1Section toTrafficLm1(TrafficLm1Dto dto, String path) {
        if (dto == null) {
            return new TrafficLm1Section(null);
        }
        SectionChecks c = new SectionChecks();
        List<Lm1LaneFactor> tandem = laneList(c, path + ".tandemSystem", dto.tandemSystem());
        List<Lm1LaneFactor> udl = laneList(c, path + ".udl", dto.udl());
        Lm1LaneFactor remaining = null;
        if (dto.remainingAreaUdl() == null) {
            c.add(path + ".remainingAreaUdl", "is required");
        } else {
            remaining = lane(c, path + ".remainingAreaUdl", dto.remainingAreaUdl());
        }
        c.throwIfAny();
        return new TrafficLm1Section(new TrafficLm1Inputs(tandem, udl, remaining));
    }

    static WindSnapshotSection toWindSnapshot(WindSnapshotDto dto, String path) {
        if (dto == null) {
            return new WindSnapshotSection(null);
        }
        SectionChecks c = new SectionChecks();
        if (dto.schemaVersion() == null) {
            c.add(path + ".schemaVersion", "is required");
        } else if (dto.schemaVersion() != WindSnapshot.SCHEMA_VERSION) {
            c.add(path + ".schemaVersion", "must be " + WindSnapshot.SCHEMA_VERSION);
        }
        WindSnapshotInputs inputs = null;
        WindSnapshotInputsDto in = dto.inputs();
        if (in == null) {
            c.add(path + ".inputs", "is required");
        } else {
            String ip = path + ".inputs";
            int before = c.count();
            String vb = c.text(ip + ".vb", in.vb());
            String terrain = c.text(ip + ".terrain", in.terrain());
            String ze = c.text(ip + ".ze", in.ze());
            double deckWidth = c.requiredFinite(ip + ".deckWidthM", in.deckWidthM());
            double dref = c.requiredFinite(ip + ".drefM", in.drefM());
            if (c.count() == before) {
                inputs = new WindSnapshotInputs(vb, terrain, ze, deckWidth, dref);
            }
        }
        WindSnapshotResult result = null;
        WindSnapshotResultDto r = dto.result();
        if (r != null) {
            String rp = path + ".result";
            int before = c.count();
            WindResultStatus status = c.requiredEnum(rp + ".status", r.status(), WindResultStatus.class);
            double z0 = c.requiredFinite(rp + ".z0M", r.z0M());
            double zmin = c.requiredFinite(rp + ".zminM", r.zminM());
            double kr = c.requiredFinite(rp + ".kr", r.kr());
            double cr = c.requiredFinite(rp + ".cr", r.cr());
            double vm = c.requiredFinite(rp + ".vmMs", r.vmMs());
            double turbulence = c.requiredFinite(rp + ".turbulenceIntensity", r.turbulenceIntensity());
            double qp = c.requiredFinite(rp + ".qpKNm2", r.qpKNm2());
            double bOverD = c.requiredFinite(rp + ".bOverD", r.bOverD());
            double cfx = c.requiredFinite(rp + ".cfx", r.cfx());
            Double transverse = c.optionalFinite(rp + ".transverseKNm", r.transverseKNm());
            if (c.count() == before) {
                result = new WindSnapshotResult(status, z0, zmin, kr, cr, vm, turbulence, qp, bOverD, cfx,
                        transverse, r.missing());
            }
        }
        c.throwIfAny();
        return new WindSnapshotSection(new WindSnapshot(dto.schemaVersion(), dto.status(), inputs, result));
    }

    private static List<Lm1LaneFactor> laneList(SectionChecks c, String path, List<Lm1LaneFactorDto> dtos) {
        if (dtos == null) {
            c.add(path, "is required");
            return List.of();
        }
        return c.list(path, dtos, (d, p) -> lane(c, p, d));
    }

    private static Lm1LaneFactor lane(SectionChecks c, String p, Lm1LaneFactorDto d) {
        int before = c.count();
        String label = c.text(p + ".label", d.label());
        Lm1ParameterValue characteristic = parameter(c, p + ".characteristicValue", d.characteristicValue());
        Lm1ParameterValue adjustment = parameter(c, p + ".adjustmentFactor", d.adjustmentFactor());
        if (c.count() > before) {
            return null;
        }
        return new Lm1LaneFactor(label, characteristic, adjustment);
    }

    private static Lm1ParameterValue parameter(SectionChecks c, String p, Lm1ParameterValueDto d) {
        if (d == null) {
            c.add(p, "is required");
            return null;
        }
        int before = c.count();
        Double value = c.optionalFinite(p + ".value", d.value());
        ParameterProvenance provenance = c.requiredEnum(p + ".provenance", d.provenance(),
                ParameterProvenance.class);
        Double codeDefault = c.optionalFinite(p + ".codeDefaultValue", d.codeDefaultValue());
        if (c.count() > before) {
            return null;
        }
        return new Lm1ParameterValue(value, provenance, codeDefault);
    }

    // ------------------------------------------------------------------ to dto

    static SeismicInputsDto seismicDto(SeismicInputs v) {
        return v == null ? null : new SeismicInputsDto(v.a(), v.g(), v.t(), v.i());
    }

    static WindInputsDto windDto(WindInputs v) {
        return v == null ? null : new WindInputsDto(v.vb(), v.terrain(), v.ze());
    }

    static TemperatureInputsDto temperatureDto(TemperatureInputs v) {
        return v == null ? null : new TemperatureInputsDto(v.min(), v.max(), v.t0());
    }

    static SelfWeightInputsDto selfWeightDto(SelfWeightInputs v) {
        return v == null ? null : new SelfWeightInputsDto(v.asphaltThicknessM(), v.asphaltUnitWeightKNm3(),
                v.sidewalkThicknessM(), v.sidewalkUnitWeightKNm3(), v.faciaCount(), v.faciaWidthM(),
                v.faciaThicknessM(), v.faciaUnitWeightKNm3(), v.guardrailCount(), v.guardrailUnitLoadKNm(),
                v.pedestrianRailingCount(), v.pedestrianRailingUnitLoadKNm(), v.protectiveFenceCount(),
                v.protectiveFenceUnitLoadKNm(), v.soundPanelCount(), v.soundPanelUnitLoadKNm());
    }

    static TrafficLm1Dto trafficLm1Dto(TrafficLm1Inputs v) {
        return v == null ? null : new TrafficLm1Dto(v.tandemSystem().stream().map(LoadInputMapper::laneDto).toList(),
                v.udl().stream().map(LoadInputMapper::laneDto).toList(), laneDto(v.remainingAreaUdl()));
    }

    static WindSnapshotDto windSnapshotDto(WindSnapshot v) {
        return v == null ? null : new WindSnapshotDto(v.schemaVersion(), v.status(),
                new WindSnapshotInputsDto(v.inputs().vb(), v.inputs().terrain(), v.inputs().ze(),
                        v.inputs().deckWidthM(), v.inputs().drefM()),
                windResultDto(v.result()));
    }

    private static WindSnapshotResultDto windResultDto(WindSnapshotResult r) {
        return r == null ? null : new WindSnapshotResultDto(r.status().name(), r.z0M(), r.zminM(), r.kr(), r.cr(),
                r.vmMs(), r.turbulenceIntensity(), r.qpKNm2(), r.bOverD(), r.cfx(), r.transverseKNm(),
                r.missing());
    }

    static LoadsDto loadsDto(ProjectLoadInputs l) {
        return new LoadsDto(seismicDto(l.seismic()), windDto(l.wind()), temperatureDto(l.temperature()),
                selfWeightDto(l.selfWeight()), trafficLm1Dto(l.trafficLm1()), windSnapshotDto(l.windSnapshot()));
    }

    private static Lm1LaneFactorDto laneDto(Lm1LaneFactor f) {
        return new Lm1LaneFactorDto(f.label(), parameterDto(f.characteristicValue()),
                parameterDto(f.adjustmentFactor()));
    }

    private static Lm1ParameterValueDto parameterDto(Lm1ParameterValue p) {
        return new Lm1ParameterValueDto(p.value(), p.provenance().name(), p.codeDefaultValue());
    }
}
