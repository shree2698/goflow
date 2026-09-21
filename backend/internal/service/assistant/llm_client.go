package assistant

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/shree2698/goflow/backend/internal/config"
	"github.com/shree2698/goflow/backend/internal/domain"
)

// LLMClient interacts with external LLM providers (OpenAI, Gemini, Ollama, etc.)
type LLMClient interface {
	IsConfigured() bool
	DetectToolCall(ctx context.Context, message string, history []domain.AssistantMessage, systemPrompt string) (*DetectedIntent, string, error)
}

type llmClient struct {
	cfg        config.AIConfig
	httpClient *http.Client
}

func NewLLMClient(cfg config.AIConfig) LLMClient {
	return &llmClient{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *llmClient) IsConfigured() bool {
	provider := strings.ToLower(strings.TrimSpace(c.cfg.Provider))
	if provider == "local" || provider == "mock" || provider == "" {
		return false
	}
	apiKey := c.getAPIKey()
	return apiKey != "" || provider == "ollama"
}

func (c *llmClient) getAPIKey() string {
	if c.cfg.APIKey != "" {
		return c.cfg.APIKey
	}
	if c.cfg.OpenAIKey != "" {
		return c.cfg.OpenAIKey
	}
	if c.cfg.GeminiKey != "" {
		return c.cfg.GeminiKey
	}
	return ""
}

// Tool definitions in standard JSON schema format for OpenAI-compatible and function-calling endpoints
var ToolsSchema = []map[string]any{
	{
		"type": "function",
		"function": map[string]any{
			"name":        "search_tasks",
			"description": "Search, filter, or list tasks. Use for finding overdue tasks, priorities for today, query matches, status filters, or assignee tasks.",
			"parameters": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"query": map[string]any{
						"type":        "string",
						"description": "Text query to search in task title or description",
					},
					"assignee": map[string]any{
						"type":        "string",
						"description": "Filter by assignee. Use 'me' for current user, or full name/UUID",
					},
					"overdue": map[string]any{
						"type":        "boolean",
						"description": "Filter tasks that are past their due date and not completed",
					},
					"prioritize_today": map[string]any{
						"type":        "boolean",
						"description": "True if user asks what to work on today or recommends priority focus",
					},
					"status": map[string]any{
						"type":        "string",
						"enum":        []string{"todo", "in_progress", "in_review", "done", "archived"},
						"description": "Filter by task status",
					},
					"priority": map[string]any{
						"type":        "string",
						"enum":        []string{"low", "medium", "high", "urgent"},
						"description": "Filter by task priority",
					},
					"project_name": map[string]any{
						"type":        "string",
						"description": "Name of the project to search in",
					},
					"limit": map[string]any{
						"type":        "integer",
						"description": "Maximum number of tasks to return",
					},
				},
			},
		},
	},
	{
		"type": "function",
		"function": map[string]any{
			"name":        "create_task",
			"description": "Create a new task in a project with title, priority, due date, tags, and description.",
			"parameters": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"title": map[string]any{
						"type":        "string",
						"description": "The title of the task",
					},
					"description": map[string]any{
						"type":        "string",
						"description": "Detailed description of the task",
					},
					"priority": map[string]any{
						"type":        "string",
						"enum":        []string{"low", "medium", "high", "urgent"},
						"description": "Task priority level",
					},
					"due_date": map[string]any{
						"type":        "string",
						"description": "Due date in natural language (e.g. 'Friday', 'tomorrow') or ISO format (YYYY-MM-DD)",
					},
					"project_name": map[string]any{
						"type":        "string",
						"description": "Name or ID of the project to create the task in",
					},
					"assignee": map[string]any{
						"type":        "string",
						"description": "'me', full name, or user UUID",
					},
					"tags": map[string]any{
						"type":        "array",
						"items":       map[string]any{"type": "string"},
						"description": "List of tags",
					},
				},
				"required": []string{"title"},
			},
		},
	},
	{
		"type": "function",
		"function": map[string]any{
			"name":        "update_task",
			"description": "Update an existing task or batch update multiple tasks (e.g. moving all completed tasks in Project A to archived).",
			"parameters": map[string]any{
				"type": "object",
				"properties": map[string]any{
					"task_id": map[string]any{
						"type":        "string",
						"description": "UUID of the task to update",
					},
					"task_title": map[string]any{
						"type":        "string",
						"description": "Title of the task to update (if ID is unknown)",
					},
					"status": map[string]any{
						"type":        "string",
						"enum":        []string{"todo", "in_progress", "in_review", "done", "archived"},
						"description": "New status for the task",
					},
					"priority": map[string]any{
						"type":        "string",
						"enum":        []string{"low", "medium", "high", "urgent"},
						"description": "New priority for the task",
					},
					"batch": map[string]any{
						"type":        "boolean",
						"description": "True if performing batch operation on multiple tasks",
					},
					"project_name": map[string]any{
						"type":        "string",
						"description": "Project name for batch operations or context",
					},
					"filter_status": map[string]any{
						"type":        "string",
						"description": "Source status for batch operations (e.g. 'completed' or 'done')",
					},
					"target_status": map[string]any{
						"type":        "string",
						"description": "Target status for batch operations (e.g. 'archived')",
					},
				},
			},
		},
	},
}

type openAIChatRequest struct {
	Model       string                 `json:"model"`
	Messages    []openAIChatMessage    `json:"messages"`
	Tools       []map[string]any       `json:"tools,omitempty"`
	ToolChoice  string                 `json:"tool_choice,omitempty"`
	Temperature float32                `json:"temperature"`
}

type openAIChatMessage struct {
	Role       string               `json:"role"`
	Content    string               `json:"content,omitempty"`
	ToolCalls  []openAIToolCallItem `json:"tool_calls,omitempty"`
}

type openAIToolCallItem struct {
	ID       string `json:"id"`
	Type     string `json:"type"`
	Function struct {
		Name      string `json:"name"`
		Arguments string `json:"arguments"`
	} `json:"function"`
}

type openAIChatResponse struct {
	Choices []struct {
		Message struct {
			Role      string               `json:"role"`
			Content   string               `json:"content"`
			ToolCalls []openAIToolCallItem `json:"tool_calls"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func (c *llmClient) DetectToolCall(
	ctx context.Context,
	message string,
	history []domain.AssistantMessage,
	systemPrompt string,
) (*DetectedIntent, string, error) {
	if !c.IsConfigured() {
		return nil, "", fmt.Errorf("llm client is not configured")
	}

	endpoint := "https://api.openai.com/v1/chat/completions"
	if c.cfg.ServiceURL != "" {
		endpoint = strings.TrimSuffix(c.cfg.ServiceURL, "/")
		if !strings.HasSuffix(endpoint, "/chat/completions") {
			endpoint += "/chat/completions"
		}
	}

	model := c.cfg.Model
	if model == "" {
		model = "gpt-4o-mini"
	}

	messages := []openAIChatMessage{
		{
			Role:    "system",
			Content: systemPrompt,
		},
	}

	for _, h := range history {
		role := h.Role
		if role != "user" && role != "assistant" && role != "system" {
			role = "user"
		}
		messages = append(messages, openAIChatMessage{
			Role:    role,
			Content: h.Content,
		})
	}

	messages = append(messages, openAIChatMessage{
		Role:    "user",
		Content: message,
	})

	reqBody := openAIChatRequest{
		Model:       model,
		Messages:    messages,
		Tools:       ToolsSchema,
		ToolChoice:  "auto",
		Temperature: 0.2,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return nil, "", err
	}

	req, err := http.NewRequestWithContext(ctx, "POST", endpoint, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return nil, "", err
	}

	req.Header.Set("Content-Type", "application/json")
	apiKey := c.getAPIKey()
	if apiKey != "" {
		req.Header.Set("Authorization", "Bearer "+apiKey)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, "", err
	}
	defer resp.Body.Close()

	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", err
	}

	var chatResp openAIChatResponse
	if err := json.Unmarshal(bodyBytes, &chatResp); err != nil {
		return nil, "", err
	}

	if chatResp.Error != nil && chatResp.Error.Message != "" {
		return nil, "", fmt.Errorf("llm api error: %s", chatResp.Error.Message)
	}

	if len(chatResp.Choices) == 0 {
		return nil, "", fmt.Errorf("empty response from llm")
	}

	choice := chatResp.Choices[0].Message

	// If the LLM selected a tool call:
	if len(choice.ToolCalls) > 0 {
		tc := choice.ToolCalls[0]
		args := make(map[string]any)
		if tc.Function.Arguments != "" {
			_ = json.Unmarshal([]byte(tc.Function.Arguments), &args)
		}

		intentType := IntentSearchTasks
		switch tc.Function.Name {
		case "create_task":
			intentType = IntentCreateTask
		case "update_task":
			if isBatch, _ := args["batch"].(bool); isBatch {
				intentType = IntentBatchUpdate
			} else {
				intentType = IntentUpdateTask
			}
		case "search_tasks":
			if prio, _ := args["prioritize_today"].(bool); prio {
				intentType = IntentPrioritize
			} else {
				intentType = IntentSearchTasks
			}
		}

		return &DetectedIntent{
			Type:      intentType,
			ToolName:  tc.Function.Name,
			Arguments: args,
		}, choice.Content, nil
	}

	// No tool call was generated; regular conversation
	return &DetectedIntent{
		Type:      IntentHelpOrGeneral,
		ToolName:  "",
		Arguments: map[string]any{},
	}, choice.Content, nil
}
