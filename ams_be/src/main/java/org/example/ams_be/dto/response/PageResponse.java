package org.example.ams_be.dto.response;


import java.util.List;

public class PageResponse<T> {
    public List<T> items;
    public int page;
    public int size;
    public long totalItems;
    public int totalPages;
    public boolean hasNext;
    public boolean hasPrev;

    public PageResponse() {
    }

    public PageResponse(List<T> items, int page, int size, long totalItems) {
        this.items = items;
        this.page = page;
        this.size = size;
        this.totalItems = totalItems;

        this.totalPages = (int) Math.ceil((double) totalItems / (double) size);
        this.hasPrev = page > 1;
        this.hasNext = page < totalPages;
    }
}
