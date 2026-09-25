package com.kopruq.api.materials;

import com.kopruq.analysis.EurocodeConcrete;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Exposes the existing canonical EN concrete calculations to typed Graph material references. */
@RestController
@RequestMapping("/api/materials/concrete")
@CrossOrigin(origins = "http://localhost:5173")
public final class ConcreteMaterialController {
    private static final Set<String> SUPPORTED_MATERIAL_IDS = Set.of("C12/15", "C16/20", "C20/25", "C25/30", "C30/37", "C35/45", "C40/50", "C45/55", "C50/60", "C55/67", "C60/75", "C70/85", "C80/95", "C90/105");

    @GetMapping
    public ConcreteMaterialDto getConcreteMaterial(@RequestParam String materialId) {
        int separator = materialId.indexOf('/');
        if (!SUPPORTED_MATERIAL_IDS.contains(materialId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown concrete material ID: " + materialId);
        }
        final int fck;
        try {
            fck = Integer.parseInt(materialId.substring(1, separator));
        } catch (NumberFormatException error) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown concrete material ID: " + materialId);
        }
        double unitWeight = EurocodeConcrete.UNIT_WEIGHT_REINFORCED_KN_PER_M3;
        return new ConcreteMaterialDto("ConcreteMaterial", materialId, materialId, Map.of(
                "fck", new QuantityDto(fck, "MPa"),
                "fcm", new QuantityDto(EurocodeConcrete.meanCompressiveStrengthMpa(fck), "MPa"),
                "Ecm", new QuantityDto(EurocodeConcrete.elasticModulusKnPerM2(fck) / 1_000.0, "MPa"),
                "unitWeight", new QuantityDto(unitWeight, "kN/m3"),
                "density", new QuantityDto(EurocodeConcrete.massDensityTonnesPerM3(unitWeight), "t/m3"),
                "poissonRatioUncracked", new QuantityDto(EurocodeConcrete.POISSON_RATIO_UNCRACKED, "-")));
    }

    public record QuantityDto(double value, String unit) { }
    public record ConcreteMaterialDto(String domainType, String id, String name, Map<String, QuantityDto> properties) { }
}
