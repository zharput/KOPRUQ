package com.kopruq.alignment.application;

import com.kopruq.alignment.domain.ChainageSampler;
import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.StraightElement;
import com.kopruq.geometry.model.Point3D;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;

class AlignmentSamplingServiceTest {

    private final ChainageSampler sampler = new ChainageSampler();
    private final AlignmentSamplingService service = new AlignmentSamplingService(sampler);

    private static Alignment straight() {
        return new Alignment(List.of(new StraightElement(new Point3D(100, 200, 0), new Point3D(160, 280, 0))));
    }

    @Test
    void usesTheOverlayChainages_andThePlanPositionOfTheAlignment() {
        Alignment alignment = straight();
        List<AlignmentSample> samples = service.sample(alignment, 25);

        List<Double> expected = sampler.forOverlay(alignment.totalLengthM(), 25);
        assertEquals(expected.size(), samples.size());
        for (int i = 0; i < expected.size(); i++) {
            assertEquals(expected.get(i), samples.get(i).chainageM(), 0.0);
        }
        assertEquals(100.0, samples.get(0).xM(), 1e-12);
        assertEquals(200.0, samples.get(0).yM(), 1e-12);
        // 100 m long, direction (0.6, 0.8): the 25 m sample sits 15 m east and 20 m north of the start
        assertEquals(115.0, samples.get(1).xM(), 1e-9);
        assertEquals(220.0, samples.get(1).yM(), 1e-9);
        assertEquals(160.0, samples.get(samples.size() - 1).xM(), 1e-9);
    }

    @Test
    void nonPositiveStepChoosesTheDefaultStep() {
        Alignment alignment = straight();
        assertEquals(sampler.forOverlay(alignment.totalLengthM(), 0).size(), service.sample(alignment, 0).size());
    }
}
