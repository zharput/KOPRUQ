package com.kopruq.api.kernel;

import com.kopruq.bridgecore.Bridge;
import com.kopruq.bridgecore.DesignSpace;

/**
 * Echoes back the real {@link Bridge} and {@link DesignSpace} objects
 * bridge-core constructed from the request - this response body IS the
 * proof for P02's success criterion ("UI data correctly reaches the
 * Bridge Kernel / DesignSpace"), not a hand-rolled summary string.
 */
public record KernelStateResponse(Bridge bridge, DesignSpace designSpace) {
}
