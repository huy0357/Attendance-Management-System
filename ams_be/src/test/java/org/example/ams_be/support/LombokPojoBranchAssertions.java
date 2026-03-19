package org.example.ams_be.support;

import java.util.List;
import java.util.function.Supplier;
import java.util.function.UnaryOperator;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

public final class LombokPojoBranchAssertions {

    private LombokPojoBranchAssertions() {
    }

    public static <T> void assertEqualsAndHashCodeBranches(
            Supplier<T> populatedSupplier,
            Supplier<T> emptySupplier,
            List<UnaryOperator<T>> populatedMismatchMutators,
            List<UnaryOperator<T>> emptyMismatchMutators,
            UnaryOperator<T> canEqualFalseMutator
    ) {
        T populated = populatedSupplier.get();
        T populatedCopy = populatedSupplier.get();
        T empty = emptySupplier.get();
        T emptyCopy = emptySupplier.get();

        assertEquals(populated, populated);
        assertNotEquals(populated, null);
        assertNotEquals(populated, new Object());
        assertEquals(populated, populatedCopy);
        assertEquals(populatedCopy, populated);
        assertEquals(populated.hashCode(), populatedCopy.hashCode());
        assertNotNull(populated.toString());
        assertFalse(populated.toString().isBlank());

        assertEquals(empty, emptyCopy);
        assertEquals(emptyCopy, empty);
        assertEquals(empty.hashCode(), emptyCopy.hashCode());
        assertNotNull(empty.toString());

        for (UnaryOperator<T> mutator : populatedMismatchMutators) {
            assertNotEquals(populatedSupplier.get(), mutator.apply(populatedSupplier.get()));
        }

        for (UnaryOperator<T> mutator : emptyMismatchMutators) {
            assertNotEquals(emptySupplier.get(), mutator.apply(emptySupplier.get()));
        }

        if (canEqualFalseMutator != null) {
            assertNotEquals(populatedSupplier.get(), canEqualFalseMutator.apply(populatedSupplier.get()));
        }

        assertTrue(populated.equals(populatedCopy));
        assertTrue(empty.equals(emptyCopy));
    }
}
