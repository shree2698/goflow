package eventbus

import (
	"sync"
	"github.com/shree2698/goflow/backend/internal/domain"
)

type EventBus interface {
	Publish(event domain.Event)
	Subscribe(eventType string) <-chan domain.Event
}

type InMemoryEventBus struct {
	mu          sync.RWMutex
	subscribers map[string][]chan domain.Event
}

func NewInMemoryEventBus() *InMemoryEventBus {
	return &InMemoryEventBus{
		subscribers: make(map[string][]chan domain.Event),
	}
}

func (b *InMemoryEventBus) Publish(event domain.Event) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if chans, found := b.subscribers[event.Type]; found {
		for _, ch := range chans {
			// Non-blocking send
			select {
			case ch <- event:
			default:
			}
		}
	}
}

func (b *InMemoryEventBus) Subscribe(eventType string) <-chan domain.Event {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan domain.Event, 100) // Buffer of 100
	b.subscribers[eventType] = append(b.subscribers[eventType], ch)
	return ch
}
