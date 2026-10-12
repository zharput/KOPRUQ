package com.kopruq.landxml.application;

import com.kopruq.alignment.domain.ChainageSampler;
import com.kopruq.alignment.model.Alignment;
import com.kopruq.alignment.model.ChainagePosition;
import com.kopruq.geometry.model.Point3D;
import com.kopruq.landxml.model.LandXmlImportResult;
import com.kopruq.terrain.domain.TerrainQueryService;
import com.kopruq.terrain.model.TerrainModel;

import java.util.ArrayList;
import java.util.List;

/**
 * Ground (terrain-queried) vs. design (imported vertical profile) elevation along an imported alignment, sampled
 * at the chainages of {@link ChainageSampler#forProfile}. The data behind the longitudinal profile chart.
 */
public class LongitudinalProfileService {

    private final TerrainQueryService terrainQueryService;
    private final ChainageSampler chainageSampler;

    public LongitudinalProfileService(TerrainQueryService terrainQueryService, ChainageSampler chainageSampler) {
        this.terrainQueryService = terrainQueryService;
        this.chainageSampler = chainageSampler;
    }

    /**
     * @param result an import that has an alignment
     * @param stepM  requested chainage step in metres; {@code <= 0} chooses the default step
     * @throws IllegalArgumentException if the import has no alignment
     */
    public List<ProfileSample> profile(LandXmlImportResult result, double stepM) {
        Alignment alignment = result.alignment();
        if (alignment == null) {
            throw new IllegalArgumentException("the import has no alignment");
        }
        TerrainModel terrain = result.terrain();
        List<ProfileSample> points = new ArrayList<>();
        for (double chainageM : chainageSampler.forProfile(alignment.totalLengthM(), stepM)) {
            points.add(profilePointAt(alignment, terrain, result, chainageM));
        }
        return points;
    }

    private ProfileSample profilePointAt(Alignment alignment, TerrainModel terrain, LandXmlImportResult result, double chainageM) {
        Point3D horizontal = alignment.toXYZ(new ChainagePosition(chainageM, 0, 0));
        Double groundElevationM = terrainQueryService.getElevation(terrain, horizontal.x(), horizontal.y()).orElse(null);
        // Outside the PVI range the profile would only be an extrapolation of its end grades: report no design elevation.
        Double designElevationM = result.profile() != null && result.profile().covers(chainageM)
                ? result.profile().elevationAt(chainageM) : null;
        return new ProfileSample(chainageM, groundElevationM, designElevationM);
    }
}
