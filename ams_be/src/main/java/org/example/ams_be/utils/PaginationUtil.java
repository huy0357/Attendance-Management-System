package org.example.ams_be.utils;

public class PaginationUtil {

    private PaginationUtil() {}

    public static int resolvePage(Integer page) {
        return (page == null || page < 1) ? 1 : page;
    }

    public static int resolveSize(Integer size) {
        return (size == null || size < 1) ? 10 : Math.min(size, 100);
    }

    public static String resolveSortBy(String sortBy, String defaultSort) {
        return (sortBy == null || sortBy.isBlank()) ? defaultSort : sortBy;
    }

    public static String resolveSortDir(String sortDir) {
        return "asc".equalsIgnoreCase(sortDir) ? "asc" : "desc";
    }
}
