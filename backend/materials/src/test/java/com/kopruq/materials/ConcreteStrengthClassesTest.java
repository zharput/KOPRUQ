package com.kopruq.materials;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.OptionalInt;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ConcreteStrengthClassesTest {

    private static final List<String> IDS = List.of("C12/15", "C16/20", "C20/25", "C25/30", "C30/37", "C35/45", "C40/50",
            "C45/55", "C50/60", "C55/67", "C60/75", "C70/85", "C80/95", "C90/105");
    private static final int[] FCK = {12, 16, 20, 25, 30, 35, 40, 45, 50, 55, 60, 70, 80, 90};

    @Test
    void parsesFckOfEveryOfTheFourteenSupportedClasses() {
        assertEquals(14, IDS.size());
        for (int i = 0; i < IDS.size(); i++) {
            assertEquals(OptionalInt.of(FCK[i]), ConcreteStrengthClasses.characteristicStrengthMpa(IDS.get(i)), IDS.get(i));
        }
    }

    @Test
    void unknownIdentifiersGiveEmpty() {
        for (String id : List.of("C999/999", "C31/37", "", "30", "c30/37", "C30", "C30/", "/")) {
            assertEquals(OptionalInt.empty(), ConcreteStrengthClasses.characteristicStrengthMpa(id), id);
        }
    }
}
