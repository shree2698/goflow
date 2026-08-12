package worker

import (
	"context"
	"fmt"
	"math"
	"sync"
	"time"

	"github.com/rs/zerolog"
)

type JobHandler func(ctx context.Context, job *Job) error

type WorkerPool struct {
	queue    *RedisQueue
	handlers map[string]JobHandler
	logger   *zerolog.Logger
	concurrency int
	wg       sync.WaitGroup
	ctx      context.Context
	cancel   context.CancelFunc
}

func NewWorkerPool(queue *RedisQueue, logger *zerolog.Logger, concurrency int) *WorkerPool {
	ctx, cancel := context.WithCancel(context.Background())
	return &WorkerPool{
		queue:       queue,
		handlers:    make(map[string]JobHandler),
		logger:      logger,
		concurrency: concurrency,
		ctx:         ctx,
		cancel:      cancel,
	}
}

func (p *WorkerPool) RegisterHandler(jobType string, handler JobHandler) {
	p.handlers[jobType] = handler
}

func (p *WorkerPool) Start() {
	p.logger.Info().Msgf("Starting worker pool with %d workers", p.concurrency)
	
	for i := 0; i < p.concurrency; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

func (p *WorkerPool) Stop() {
	p.logger.Info().Msg("Stopping worker pool...")
	p.cancel()
	p.wg.Wait()
	p.logger.Info().Msg("Worker pool stopped")
}

func (p *WorkerPool) worker(id int) {
	defer p.wg.Done()
	
	// Process critical, default, and low queues in order of priority
	priorities := []string{PriorityCritical, PriorityDefault, PriorityLow}
	
	for {
		select {
		case <-p.ctx.Done():
			p.logger.Info().Msgf("Worker %d shutting down", id)
			return
		default:
			// Fetch job from queue with 2 seconds timeout to allow graceful shutdown
			job, err := p.queue.Dequeue(p.ctx, priorities, 2*time.Second)
			if err != nil {
				if err != context.Canceled {
					p.logger.Error().Err(err).Msgf("Worker %d error dequeuing job", id)
				}
				time.Sleep(1 * time.Second)
				continue
			}
			
			if job == nil {
				continue // timeout, no job
			}
			
			p.processJob(job)
		}
	}
}

func (p *WorkerPool) processJob(job *Job) {
	handler, exists := p.handlers[job.Type]
	if !exists {
		p.logger.Error().Msgf("No handler registered for job type: %s", job.Type)
		job.LastError = "no handler registered"
		p.handleJobFailure(job)
		return
	}
	
	job.Status = StatusRunning
	job.UpdatedAt = time.Now()
	
	err := handler(p.ctx, job)
	if err != nil {
		p.logger.Error().Err(err).Msgf("Job %s failed", job.ID)
		job.LastError = err.Error()
		p.handleJobFailure(job)
		return
	}
	
	p.logger.Info().Msgf("Job %s completed successfully", job.ID)
}

func (p *WorkerPool) handleJobFailure(job *Job) {
	job.Retries++
	if job.Retries >= job.MaxRetries {
		p.logger.Warn().Msgf("Job %s failed after %d retries, moving to DLQ", job.ID, job.Retries)
		err := p.queue.PushDLQ(p.ctx, job)
		if err != nil {
			p.logger.Error().Err(err).Msgf("Failed to push job %s to DLQ", job.ID)
		}
		return
	}
	
	job.Status = StatusRetrying
	job.UpdatedAt = time.Now()
	
	// Exponential backoff
	backoffSecs := math.Pow(2, float64(job.Retries))
	time.Sleep(time.Duration(backoffSecs) * time.Second) // In a real system, delay enqueue
	
	p.logger.Info().Msgf("Requeueing job %s (retry %d/%d)", job.ID, job.Retries, job.MaxRetries)
	err := p.queue.Requeue(p.ctx, job)
	if err != nil {
		p.logger.Error().Err(err).Msgf("Failed to requeue job %s", job.ID)
	}
}
