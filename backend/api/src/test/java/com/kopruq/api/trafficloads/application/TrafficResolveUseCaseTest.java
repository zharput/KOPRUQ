package com.kopruq.api.trafficloads.application;

import com.kopruq.trafficloads.CarriagewayInput;
import com.kopruq.trafficloads.Lm1DefaultsFactory;
import com.kopruq.trafficloads.Lm1Parameters;
import com.kopruq.trafficloads.NotionalLaneResult;
import com.kopruq.trafficloads.TrafficLoadsService;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class TrafficResolveUseCaseTest {

    private final TrafficLoadsService service = new TrafficLoadsService();
    private final TrafficResolveUseCase useCase = new TrafficResolveUseCase(service);

    @Test
    void resolvesLanesAndValidation_exactlyAsTheDomainService() {
        CarriagewayInput carriageway = new CarriagewayInput(13.80, 1.00, 1.50);
        Lm1Parameters lm1 = new Lm1DefaultsFactory().codeDefaults(3);

        TrafficResolution resolution = useCase.resolve(carriageway, lm1);

        NotionalLaneResult lanes = service.generateLanes(carriageway);
        assertEquals(lanes, resolution.lanes());
        assertSame(lm1, resolution.lm1());
        assertEquals(service.validate(lanes, lm1), resolution.validation());
    }

    @Test
    void aMissingCarriagewayIsRejectedWithTheSameMessage() {
        IllegalArgumentException e = assertThrows(IllegalArgumentException.class, () -> useCase.resolve(null, null));
        assertEquals("carriageway is required", e.getMessage());
    }
}
