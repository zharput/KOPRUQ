package com.spanova.api.kernel;

import com.spanova.bridgecore.Bridge;
import com.spanova.bridgecore.DesignSpace;

/**
 * Echoes back the real {@link Bridge} and {@link DesignSpace} objects
 * bridge-core constructed from the request - this response body IS the
 * proof for P02's success criterion ("UI data correctly reaches the
 * Bridge Kernel / DesignSpace"), not a hand-rolled summary string.
 */
public record KernelStateResponse(Bridge bridge, DesignSpace designSpace) {
}
