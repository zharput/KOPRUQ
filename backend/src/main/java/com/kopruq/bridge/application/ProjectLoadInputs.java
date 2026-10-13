package com.kopruq.bridge.application;

import com.kopruq.bridge.model.SeismicInputs;
import com.kopruq.bridge.model.SelfWeightInputs;
import com.kopruq.bridge.model.TemperatureInputs;
import com.kopruq.bridge.model.TrafficLm1Inputs;
import com.kopruq.bridge.model.WindInputs;
import com.kopruq.bridge.model.WindSnapshot;

/** The six stored load-input sections of a project. Every member is null when that section was never written or was cleared. */
public record ProjectLoadInputs(SeismicInputs seismic, WindInputs wind, TemperatureInputs temperature,
        SelfWeightInputs selfWeight, TrafficLm1Inputs trafficLm1, WindSnapshot windSnapshot) {

    /** Nothing stored. */
    public static final ProjectLoadInputs NONE = new ProjectLoadInputs(null, null, null, null, null, null);

    public ProjectLoadInputs withSeismic(SeismicInputs v) {
        return new ProjectLoadInputs(v, wind, temperature, selfWeight, trafficLm1, windSnapshot);
    }

    public ProjectLoadInputs withWind(WindInputs v) {
        return new ProjectLoadInputs(seismic, v, temperature, selfWeight, trafficLm1, windSnapshot);
    }

    public ProjectLoadInputs withTemperature(TemperatureInputs v) {
        return new ProjectLoadInputs(seismic, wind, v, selfWeight, trafficLm1, windSnapshot);
    }

    public ProjectLoadInputs withSelfWeight(SelfWeightInputs v) {
        return new ProjectLoadInputs(seismic, wind, temperature, v, trafficLm1, windSnapshot);
    }

    public ProjectLoadInputs withTrafficLm1(TrafficLm1Inputs v) {
        return new ProjectLoadInputs(seismic, wind, temperature, selfWeight, v, windSnapshot);
    }

    public ProjectLoadInputs withWindSnapshot(WindSnapshot v) {
        return new ProjectLoadInputs(seismic, wind, temperature, selfWeight, trafficLm1, v);
    }
}
