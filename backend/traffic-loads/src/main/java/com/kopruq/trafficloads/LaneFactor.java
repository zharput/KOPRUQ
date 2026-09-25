package com.kopruq.trafficloads;

/**
 * One LM1 row (e.g. "Lane 1 - Tandem System") - a characteristic value
 * (Qik/qik, EN 1991-2 Table 4.2) times an adjustment factor (alphaQi/
 * alphaqi). {@link #effectiveValue()} is {@code null} whenever either
 * input is unconfirmed - never silently computed from a missing value.
 */
public record LaneFactor(String label, ParameterValue<Double> characteristicValue, ParameterValue<Double> adjustmentFactor) {

    public Double effectiveValue() {
        Double characteristic = characteristicValue.value();
        Double factor = adjustmentFactor.value();
        if (characteristic == null || factor == null) {
            return null;
        }
        return characteristic * factor;
    }
}
