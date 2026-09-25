package com.kopruq.api.kernel;

import com.kopruq.bridgecore.DesignSpace;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

/**
 * Direct unit test (no Spring context needed - the controller method is
 * a plain function) proving the P02 request -> bridge-core -> response
 * round trip actually goes through {@code Bridge}/{@code DesignSpace},
 * not just an echo of the request.
 */
class KernelStateControllerTest {

    @Test
    void buildKernelState_constructsARealBridgeAndDesignSpace() {
        var controller = new KernelStateController();
        var request = new KernelStateRequest("VIA-35", 210, 13.80, 30, 45, 4, 8, 1.8, 2.5);

        var response = controller.buildKernelState(request);

        assertEquals("VIA-35", response.bridge().bridgeName());
        assertEquals(210, response.bridge().totalLengthM());
        assertEquals(13.80, response.bridge().deckWidthM());
        assertEquals(30, response.designSpace().minSpanM());
        assertEquals(45, response.designSpace().maxSpanM());
        assertEquals(4, response.designSpace().minGirderCount());
        assertEquals(8, response.designSpace().maxGirderCount());
        assertEquals(1.8, response.designSpace().minGirderDepthM());
        assertEquals(2.5, response.designSpace().maxGirderDepthM());
        assertEquals(DesignSpace.DEFAULT_GIRDER_DEPTH_STEP_M, response.designSpace().girderDepthStepM());
    }
}
