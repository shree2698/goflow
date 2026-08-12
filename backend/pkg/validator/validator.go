package validator

import (
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/go-playground/validator/v10"
	"github.com/shree2698/goflow/backend/internal/domain"
)

var validate *validator.Validate

func init() {
	validate = validator.New()
}

func Validate(s interface{}) *domain.AppError {
	err := validate.Struct(s)
	if err != nil {
		var details []domain.FieldError
		for _, err := range err.(validator.ValidationErrors) {
			details = append(details, domain.FieldError{
				Field: err.Field(),
				Issue: fmt.Sprintf("failed on the '%s' tag", err.Tag()),
			})
		}
		return domain.NewValidationError("Validation failed", details)
	}
	return nil
}

func DecodeAndValidate(r *http.Request, dst interface{}) *domain.AppError {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return domain.NewBadRequest("Invalid JSON body")
	}
	defer r.Body.Close()

	return Validate(dst)
}
