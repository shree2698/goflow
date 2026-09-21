package assistant

import (
	"testing"
	"time"
)

func TestParseNaturalDate(t *testing.T) {
	// Fix reference time: Monday, Sep 21, 2026, 10:00:00 UTC
	now := time.Date(2026, time.September, 21, 10, 0, 0, 0, time.UTC)

	tests := []struct {
		input    string
		expected time.Time
		hasMatch bool
	}{
		{
			input:    "today",
			expected: time.Date(2026, time.September, 21, 18, 0, 0, 0, time.UTC),
			hasMatch: true,
		},
		{
			input:    "tomorrow",
			expected: time.Date(2026, time.September, 22, 18, 0, 0, 0, time.UTC),
			hasMatch: true,
		},
		{
			input:    "due tomorrow",
			expected: time.Date(2026, time.September, 22, 18, 0, 0, 0, time.UTC),
			hasMatch: true,
		},
		{
			input:    "Friday",
			// Monday Sep 21 + 4 days = Friday Sep 25
			expected: time.Date(2026, time.September, 25, 18, 0, 0, 0, time.UTC),
			hasMatch: true,
		},
		{
			input:    "due Friday",
			expected: time.Date(2026, time.September, 25, 18, 0, 0, 0, time.UTC),
			hasMatch: true,
		},
		{
			input:    "in 3 days",
			expected: time.Date(2026, time.September, 24, 18, 0, 0, 0, time.UTC),
			hasMatch: true,
		},
		{
			input:    "next week",
			expected: time.Date(2026, time.September, 28, 18, 0, 0, 0, time.UTC),
			hasMatch: true,
		},
	}

	for _, tc := range tests {
		result := ParseNaturalDate(tc.input, now)
		if tc.hasMatch {
			if result == nil {
				t.Errorf("Expected date for input %q, got nil", tc.input)
				continue
			}
			if !result.Equal(tc.expected) {
				t.Errorf("For input %q: expected %v, got %v", tc.input, tc.expected, *result)
			}
		} else if result != nil {
			t.Errorf("Expected nil for input %q, got %v", tc.input, *result)
		}
	}
}
