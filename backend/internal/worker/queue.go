package worker

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

type QueueProducer interface {
	Enqueue(ctx context.Context, jobType string, priority string, payload interface{}, maxRetries int) (*Job, error)
}

type RedisQueue struct {
	client *redis.Client
}

func NewRedisQueue(client *redis.Client) *RedisQueue {
	return &RedisQueue{client: client}
}

func (q *RedisQueue) Enqueue(ctx context.Context, jobType string, priority string, payload interface{}, maxRetries int) (*Job, error) {
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	job := &Job{
		ID:         uuid.New().String(),
		Type:       jobType,
		Priority:   priority,
		Status:     StatusPending,
		Payload:    payloadBytes,
		CreatedAt:  time.Now(),
		UpdatedAt:  time.Now(),
		MaxRetries: maxRetries,
		Retries:    0,
	}

	jobBytes, err := json.Marshal(job)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal job: %w", err)
	}

	queueKey := getQueueKey(priority)
	if err := q.client.LPush(ctx, queueKey, jobBytes).Err(); err != nil {
		return nil, fmt.Errorf("failed to push job to redis: %w", err)
	}

	return job, nil
}

func (q *RedisQueue) Dequeue(ctx context.Context, priorities []string, timeout time.Duration) (*Job, error) {
	keys := make([]string, len(priorities))
	for i, p := range priorities {
		keys[i] = getQueueKey(p)
	}

	result, err := q.client.BRPop(ctx, timeout, keys...).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return nil, nil // timeout, no jobs
		}
		return nil, err
	}

	// result[0] is the key, result[1] is the value
	var job Job
	if err := json.Unmarshal([]byte(result[1]), &job); err != nil {
		return nil, fmt.Errorf("failed to unmarshal job: %w", err)
	}

	return &job, nil
}

func (q *RedisQueue) PushDLQ(ctx context.Context, job *Job) error {
	job.Status = StatusDLQ
	job.UpdatedAt = time.Now()
	
	jobBytes, err := json.Marshal(job)
	if err != nil {
		return err
	}
	
	return q.client.LPush(ctx, "queue:dlq", jobBytes).Err()
}

func (q *RedisQueue) Requeue(ctx context.Context, job *Job) error {
	jobBytes, err := json.Marshal(job)
	if err != nil {
		return err
	}
	
	queueKey := getQueueKey(job.Priority)
	return q.client.RPush(ctx, queueKey, jobBytes).Err() // put at the end
}

func getQueueKey(priority string) string {
	switch priority {
	case PriorityCritical:
		return "queue:critical"
	case PriorityLow:
		return "queue:low"
	default:
		return "queue:default"
	}
}
