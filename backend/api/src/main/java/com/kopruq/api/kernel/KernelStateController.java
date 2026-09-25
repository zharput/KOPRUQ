package com.kopruq.api.kernel;

import com.kopruq.bridgecore.Bridge;
import com.kopruq.bridgecore.DesignSpace;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * P02 (spec section 20): builds a real bridge-core {@link Bridge} +
 * {@link DesignSpace} from the frontend's 9 fields and returns them
 * back as JSON. Deliberately does nothing else - no persistence.
 *
 * <p>{@code @CrossOrigin} is a P02 convenience for the Vite dev server
 * (default port 5173) talking to this API (default port 8080) during
 * local development - revisit with a real CORS policy or a dev proxy
 * once the frontend's actual deployment shape is decided.
 */
@RestController
@RequestMapping("/api/kernel-state")
@CrossOrigin(origins = "http://localhost:5173")
public class KernelStateController {

    @PostMapping
    public KernelStateResponse buildKernelState(@RequestBody KernelStateRequest request) {
        return new KernelStateResponse(request.toBridge(), request.toDesignSpace());
    }
}
