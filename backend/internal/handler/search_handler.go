package handler

import (
	"net/http"
	"strconv"

	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/pkg/response"
)

type SearchHandler struct {
	searchService domain.SearchService
}

func NewSearchHandler(ss domain.SearchService) *SearchHandler {
	return &SearchHandler{searchService: ss}
}

func (h *SearchHandler) SearchTasks(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	page, _ := strconv.Atoi(q.Get("page"))
	limit, _ := strconv.Atoi(q.Get("limit"))

	params := domain.SearchParams{
		Query:     q.Get("q"),
		Status:    q.Get("status"),
		Priority:  q.Get("priority"),
		ProjectID: q.Get("project_id"),
		SortBy:    q.Get("sort_by"),
		SortOrder: q.Get("sort_order"),
		Page:      page,
		Limit:     limit,
	}

	result, err := h.searchService.SearchTasks(r.Context(), params)
	if err != nil {
		response.Error(w, err)
		return
	}

	response.JSON(w, http.StatusOK, result, nil)
}
