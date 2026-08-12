package handler

import (
	"net/http"

	"github.com/shree2698/goflow/backend/internal/domain"
	"github.com/shree2698/goflow/backend/pkg/response"
)

type AnalyticsHandler struct {
	analyticsService domain.AnalyticsService
}

func NewAnalyticsHandler(as domain.AnalyticsService) *AnalyticsHandler {
	return &AnalyticsHandler{analyticsService: as}
}

func (h *AnalyticsHandler) GetSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.analyticsService.GetSummary(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, summary, nil)
}

func (h *AnalyticsHandler) GetProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := h.analyticsService.GetProjectAnalytics(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, projects, nil)
}

func (h *AnalyticsHandler) GetProductivity(w http.ResponseWriter, r *http.Request) {
	metrics, err := h.analyticsService.GetProductivityMetrics(r.Context())
	if err != nil {
		response.Error(w, err)
		return
	}
	response.JSON(w, http.StatusOK, metrics, nil)
}
