package assistant

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

var weekdaysMap = map[string]time.Weekday{
	"sunday":    time.Sunday,
	"sun":       time.Sunday,
	"monday":    time.Monday,
	"mon":       time.Monday,
	"tuesday":   time.Tuesday,
	"tue":       time.Tuesday,
	"wednesday": time.Wednesday,
	"wed":       time.Wednesday,
	"thursday":  time.Thursday,
	"thu":       time.Thursday,
	"friday":    time.Friday,
	"fri":       time.Friday,
	"saturday":  time.Saturday,
	"sat":       time.Saturday,
}

// ParseNaturalDate parses relative and natural date strings into a time.Time pointer
func ParseNaturalDate(text string, now time.Time) *time.Time {
	clean := strings.ToLower(strings.TrimSpace(text))
	clean = strings.TrimPrefix(clean, "due ")
	clean = strings.TrimPrefix(clean, "by ")
	clean = strings.TrimPrefix(clean, "on ")
	clean = strings.TrimSuffix(clean, ".")
	clean = strings.TrimSpace(clean)

	if clean == "" {
		return nil
	}

	// 1. "today"
	if clean == "today" || clean == "tonight" {
		t := time.Date(now.Year(), now.Month(), now.Day(), 18, 0, 0, 0, now.Location())
		return &t
	}

	// 2. "tomorrow"
	if clean == "tomorrow" {
		t := time.Date(now.Year(), now.Month(), now.Day()+1, 18, 0, 0, 0, now.Location())
		return &t
	}

	// 3. "day after tomorrow"
	if clean == "day after tomorrow" {
		t := time.Date(now.Year(), now.Month(), now.Day()+2, 18, 0, 0, 0, now.Location())
		return &t
	}

	// 4. "in X days"
	inDaysRegex := regexp.MustCompile(`in\s+(\d+)\s+days?`)
	if matches := inDaysRegex.FindStringSubmatch(clean); len(matches) > 1 {
		days, err := strconv.Atoi(matches[1])
		if err == nil {
			t := time.Date(now.Year(), now.Month(), now.Day()+days, 18, 0, 0, 0, now.Location())
			return &t
		}
	}

	// 5. "next week" / "in a week"
	if clean == "next week" || clean == "in a week" || clean == "in 1 week" {
		t := time.Date(now.Year(), now.Month(), now.Day()+7, 18, 0, 0, 0, now.Location())
		return &t
	}

	// 6. Day of week e.g. "friday", "this friday", "next friday"
	for name, targetWeekday := range weekdaysMap {
		if strings.Contains(clean, name) {
			currentWeekday := now.Weekday()
			daysAhead := int(targetWeekday - currentWeekday)
			if daysAhead <= 0 {
				daysAhead += 7
			}
			if strings.Contains(clean, "next "+name) && daysAhead <= 7 {
				// "next friday" when today is monday might mean either upcoming friday or week after
				// standard colloquial convention: if upcoming is within 7 days, that's the intended target
			}
			t := time.Date(now.Year(), now.Month(), now.Day()+daysAhead, 18, 0, 0, 0, now.Location())
			return &t
		}
	}

	// 7. Explicit standard date formats (YYYY-MM-DD, MM/DD/YYYY, etc.)
	formats := []string{
		"2006-01-02",
		"2006-01-02T15:04:05Z",
		"2006-01-02T15:04:05",
		"01/02/2006",
		"Jan 2",
		"Jan 2 2006",
		"January 2",
		"January 2 2006",
		"2 Jan",
		"2 January",
	}

	for _, layout := range formats {
		parsed, err := time.ParseInLocation(layout, clean, now.Location())
		if err == nil {
			// If layout lacked a year, set to current year
			if parsed.Year() == 0 {
				parsed = time.Date(now.Year(), parsed.Month(), parsed.Day(), 18, 0, 0, 0, now.Location())
				// If date has already passed this year, shift to next year
				if parsed.Before(now) {
					parsed = parsed.AddDate(1, 0, 0)
				}
			}
			return &parsed
		}
	}

	return nil
}
