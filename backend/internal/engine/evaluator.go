package engine

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type Evaluator struct{}

func NewEvaluator() *Evaluator {
	return &Evaluator{}
}

func (e *Evaluator) Evaluate(conditionsJSON []byte, payload map[string]any) (bool, error) {
	if len(conditionsJSON) == 0 || string(conditionsJSON) == "null" {
		return true, nil // No conditions = always matches
	}

	var group domain.LogicalGroup
	if err := json.Unmarshal(conditionsJSON, &group); err != nil {
		return false, fmt.Errorf("failed to parse conditions: %w", err)
	}

	return e.evaluateGroup(group, payload)
}

func (e *Evaluator) evaluateGroup(group domain.LogicalGroup, payload map[string]any) (bool, error) {
	if len(group.Conditions) == 0 && len(group.Groups) == 0 {
		return true, nil
	}

	isOr := strings.ToUpper(group.Logic) == "OR"
	
	if isOr {
		// OR logic: return true if ANY condition/group is true
		for _, cond := range group.Conditions {
			matched, err := e.evaluateCondition(cond, payload)
			if err != nil {
				return false, err
			}
			if matched {
				return true, nil
			}
		}
		for _, g := range group.Groups {
			matched, err := e.evaluateGroup(g, payload)
			if err != nil {
				return false, err
			}
			if matched {
				return true, nil
			}
		}
		return false, nil
	} else {
		// AND logic: return false if ANY condition/group is false
		for _, cond := range group.Conditions {
			matched, err := e.evaluateCondition(cond, payload)
			if err != nil {
				return false, err
			}
			if !matched {
				return false, nil
			}
		}
		for _, g := range group.Groups {
			matched, err := e.evaluateGroup(g, payload)
			if err != nil {
				return false, err
			}
			if !matched {
				return false, nil
			}
		}
		return true, nil
	}
}

func (e *Evaluator) evaluateCondition(cond domain.Condition, payload map[string]any) (bool, error) {
	payloadVal, exists := payload[cond.Field]
	
	switch cond.Operator {
	case "IS_EMPTY":
		return !exists || payloadVal == nil || payloadVal == "", nil
	case "IS_NOT_EMPTY":
		return exists && payloadVal != nil && payloadVal != "", nil
	}

	if !exists {
		return false, nil // For other operators, if field is missing, it doesn't match
	}

	strPayloadVal := fmt.Sprintf("%v", payloadVal)
	strCondVal := fmt.Sprintf("%v", cond.Value)

	switch cond.Operator {
	case "EQUALS":
		return strPayloadVal == strCondVal, nil
	case "NOT_EQUALS":
		return strPayloadVal != strCondVal, nil
	case "CONTAINS":
		return strings.Contains(strPayloadVal, strCondVal), nil
	case "IN":
		condVals, ok := cond.Value.([]interface{})
		if !ok {
			return false, fmt.Errorf("IN operator requires an array value, got %T", cond.Value)
		}
		for _, val := range condVals {
			if strPayloadVal == fmt.Sprintf("%v", val) {
				return true, nil
			}
		}
		return false, nil
	default:
		return false, fmt.Errorf("unknown operator: %s", cond.Operator)
	}
}
