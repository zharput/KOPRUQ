package com.kopruq.alignment.application;

import com.kopruq.alignment.domain.ChainageSampler;
import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.ChainagePosition;
import com.kopruq.geometry.model.Point3D;

import java.util.ArrayList;
import java.util.List;

/**
 * Samples an alignment for the 3D viewer overlay: the chainages come from {@link ChainageSampler#forOverlay},
 * the plan position from {@link Alignment#toXYZ} (offset 0). Horizontal only - no z is invented.
 */
public class AlignmentSamplingService {

    private final ChainageSampler chainageSampler;

    public AlignmentSamplingService(ChainageSampler chainageSampler) {
        this.chainageSampler = chainageSampler;
    }

    /**
     * @param stepM requested chainage step in metres; {@code <= 0} chooses the default step
     */
    public List<AlignmentSample> sample(Alignment alignment, double stepM) {
        List<AlignmentSample> samples = new ArrayList<>();
        for (double chainageM : chainageSampler.forOverlay(alignment.totalLengthM(), stepM)) {
            Point3D p = alignment.toXYZ(new ChainagePosition(chainageM, 0, 0));
            samples.add(new AlignmentSample(chainageM, p.x(), p.y()));
        }
        return samples;
    }
}
