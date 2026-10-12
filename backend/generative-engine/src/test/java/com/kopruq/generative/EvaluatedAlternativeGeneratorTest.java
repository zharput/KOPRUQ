package com.kopruq.generative;

import com.kopruq.bridgecore.Bridge;
import com.kopruq.bridgecore.BridgeAlternative;
import com.kopruq.bridgecore.DesignSpace;
import com.kopruq.rules.EngineeringRule;
import com.kopruq.rules.RuleEngine;
import com.kopruq.rules.RuleEvaluation;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class EvaluatedAlternativeGeneratorTest {

    private static Bridge bridge() {
        return new Bridge("P03-example", 210, 13.80);
    }

    private static DesignSpace designSpace() {
        return new DesignSpace(30, 45, 4, 8, 0, 0, 1.8, 2.5, 0, 0, 0, 0, 0, 0, 0.1);
    }

    @Test
    void withAnEmptyRuleEngine_keepsTheGenerationOrder_andEveryAlternativeIsFeasible() {
        List<BridgeAlternative> plain = new AlternativeGenerator().generate(bridge(), designSpace());
        List<EvaluatedAlternative> evaluated =
                new EvaluatedAlternativeGenerator(new AlternativeGenerator(), new RuleEngine()).generate(bridge(), designSpace());

        assertEquals(plain.size(), evaluated.size());
        for (int i = 0; i < plain.size(); i++) {
            // ids are random per run, so the order is checked on the layout and the girder
            assertEquals(plain.get(i).spanLayout(), evaluated.get(i).alternative().spanLayout());
            assertEquals(plain.get(i).girder(), evaluated.get(i).alternative().girder());
            assertTrue(evaluated.get(i).feasible());
        }
    }

    @Test
    void aFailingRuleMarksTheAlternativeInfeasible() {
        // Test-only rule (not an engineering rule): rejects exactly the alternatives with 4 girders.
        EngineeringRule rejectFourGirders = new EngineeringRule() {
            @Override
            public String id() {
                return "TEST-REJECT-4-GIRDERS";
            }

            @Override
            public String description() {
                return "test only";
            }

            @Override
            public RuleEvaluation evaluate(BridgeAlternative alternative, Bridge bridge, DesignSpace designSpace) {
                return alternative.girder().count() == 4 ? RuleEvaluation.fail("four girders") : RuleEvaluation.pass();
            }
        };
        List<EvaluatedAlternative> evaluated = new EvaluatedAlternativeGenerator(new AlternativeGenerator(),
                new RuleEngine(List.of(rejectFourGirders))).generate(bridge(), designSpace());

        assertTrue(evaluated.stream().anyMatch(e -> e.alternative().girder().count() == 4));
        assertTrue(evaluated.stream().anyMatch(e -> e.alternative().girder().count() != 4));
        for (EvaluatedAlternative e : evaluated) {
            assertEquals(e.alternative().girder().count() != 4, e.feasible());
            assertFalse(e.ruleResult().outcomes().isEmpty());
        }
    }
}
