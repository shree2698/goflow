package domain

type FieldError struct {
	Field string `json:"field"`
	Issue string `json:"issue"`
}

type AppError struct {
	Code       string       `json:"code"`
	Message    string       `json:"message"`
	StatusCode int          `json:"-"`
	Details    []FieldError `json:"details,omitempty"`
}

func (e *AppError) Error() string {
	return e.Message
}

const (
	VALIDATION_FAILED = "VALIDATION_FAILED"
	NOT_FOUND         = "NOT_FOUND"
	UNAUTHORIZED      = "UNAUTHORIZED"
	FORBIDDEN         = "FORBIDDEN"
	CONFLICT          = "CONFLICT"
	INTERNAL_ERROR    = "INTERNAL_ERROR"
)

func NewBadRequest(message string) *AppError {
	return &AppError{
		Code:       VALIDATION_FAILED,
		Message:    message,
		StatusCode: 400,
	}
}

func NewNotFound(message string) *AppError {
	return &AppError{
		Code:       NOT_FOUND,
		Message:    message,
		StatusCode: 404,
	}
}

func NewUnauthorized(message string) *AppError {
	return &AppError{
		Code:       UNAUTHORIZED,
		Message:    message,
		StatusCode: 401,
	}
}

func NewForbidden(message string) *AppError {
	return &AppError{
		Code:       FORBIDDEN,
		Message:    message,
		StatusCode: 403,
	}
}

func NewConflict(message string) *AppError {
	return &AppError{
		Code:       CONFLICT,
		Message:    message,
		StatusCode: 409,
	}
}

func NewInternal(message string) *AppError {
	return &AppError{
		Code:       INTERNAL_ERROR,
		Message:    message,
		StatusCode: 500,
	}
}

func NewValidationError(message string, details []FieldError) *AppError {
	return &AppError{
		Code:       VALIDATION_FAILED,
		Message:    message,
		StatusCode: 400,
		Details:    details,
	}
}
