package com.kopruq.api.kernel.api;

import com.kopruq.bridgecore.Bridge;
import com.kopruq.bridgecore.DesignSpace;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * P02 (spec section 20): builds a real bridge-core {@link Bridge} +
 * {@link DesignSpace} from the frontend's 9 fields and returns them
 * back as JSON. Deliberately does nothing else - no persistence.
 *
 * <p>Cross-origin access for the Vite dev server (port 5173) is configured
 * centrally in {@code WebCorsConfiguration}, not per controller.
 */
@RestController
@RequestMapping("/api/kernel-state")
public class KernelStateController {

    @PostMapping
    public KernelStateResponse buildKernelState(@RequestBody KernelStateRequest request) {
        return new KernelStateResponse(request.toBridge(), request.toDesignSpace());
    }
}
