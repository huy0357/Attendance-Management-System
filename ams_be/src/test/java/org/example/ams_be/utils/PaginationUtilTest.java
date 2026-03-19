package org.example.ams_be.utils;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class PaginationUtilTest {

    @Test
    void resolvePageReturnsDefaultWhenPageIsNull() {
        assertEquals(1, PaginationUtil.resolvePage(null));
    }

    @Test
    void resolvePageReturnsDefaultWhenPageIsLessThanOne() {
        assertEquals(1, PaginationUtil.resolvePage(0));
    }

    @Test
    void resolvePageReturnsProvidedPageWhenValid() {
        assertEquals(3, PaginationUtil.resolvePage(3));
    }

    @Test
    void resolveSizeReturnsDefaultWhenSizeIsNull() {
        assertEquals(10, PaginationUtil.resolveSize(null));
    }

    @Test
    void resolveSizeReturnsDefaultWhenSizeIsLessThanOne() {
        assertEquals(10, PaginationUtil.resolveSize(-5));
    }

    @Test
    void resolveSizeCapsValueAtMaximum() {
        assertEquals(100, PaginationUtil.resolveSize(150));
    }

    @Test
    void resolveSizeReturnsProvidedSizeWhenWithinRange() {
        assertEquals(25, PaginationUtil.resolveSize(25));
    }

    @Test
    void resolveSortByReturnsDefaultWhenSortByIsNull() {
        assertEquals("createdAt", PaginationUtil.resolveSortBy(null, "createdAt"));
    }

    @Test
    void resolveSortByReturnsDefaultWhenSortByIsBlank() {
        assertEquals("createdAt", PaginationUtil.resolveSortBy("   ", "createdAt"));
    }

    @Test
    void resolveSortByReturnsProvidedSortByWhenNotBlank() {
        assertEquals("name", PaginationUtil.resolveSortBy("name", "createdAt"));
    }

    @Test
    void resolveSortDirReturnsAscWhenIgnoringCase() {
        assertEquals("asc", PaginationUtil.resolveSortDir("ASC"));
    }

    @Test
    void resolveSortDirReturnsDescForAnyOtherValue() {
        assertEquals("desc", PaginationUtil.resolveSortDir("invalid"));
    }
}
