package com.spanova.api.materials;

import com.spanova.analysis.EurocodeConcrete;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ConcreteMaterialControllerTest {
    private final ConcreteMaterialController controller = new ConcreteMaterialController();

    @Test
    void resolvesOnlyPropertiesProvidedByTheExistingEurocodeDomainUtility() {
        var material = controller.getConcreteMaterial("C40/50");
        assertEquals("ConcreteMaterial", material.domainType());
        assertEquals("C40/50", material.id());
        assertEquals(40, material.properties().get("fck").value());
        assertEquals(EurocodeConcrete.meanCompressiveStrengthMpa(40), material.properties().get("fcm").value());
        assertEquals(EurocodeConcrete.elasticModulusKnPerM2(40) / 1_000.0, material.properties().get("Ecm").value());
        assertEquals(25.0, material.properties().get("unitWeight").value());
        assertEquals(EurocodeConcrete.massDensityTonnesPerM3(25), material.properties().get("density").value());
        assertEquals(0.2, material.properties().get("poissonRatioUncracked").value());
    }

    @Test
    void rejectsUnknownMaterialIds() {
        var error = assertThrows(ResponseStatusException.class, () -> controller.getConcreteMaterial("C999/999"));
        assertEquals(404, error.getStatusCode().value());
    }
}
