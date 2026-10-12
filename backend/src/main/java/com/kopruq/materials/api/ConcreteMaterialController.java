package com.kopruq.materials.api;

import com.kopruq.materials.domain.ConcreteStrengthClasses;
import com.kopruq.materials.domain.EurocodeConcrete;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

/** Exposes the existing canonical EN concrete calculations to typed Graph material references. */
@RestController
@RequestMapping("/api/materials/concrete")
public final class ConcreteMaterialController {
    @GetMapping
    public ConcreteMaterialDto getConcreteMaterial(@RequestParam String materialId) {
        final int fck = ConcreteStrengthClasses.characteristicStrengthMpa(materialId).orElseThrow(
                () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Unknown concrete material ID: " + materialId));
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
