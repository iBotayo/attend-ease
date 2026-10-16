package middleware

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"attendease/internal/http/responses"
)

type clientRecord struct {
	tokens     float64
	lastRefill time.Time
}

type RateLimiter struct {
	mu      sync.Mutex
	clients map[string]*clientRecord
	rate    float64 // tokens per second
	capacity float64
}

func NewRateLimiter(rate float64, capacity float64) *RateLimiter {
	rl := &RateLimiter{
		clients:  make(map[string]*clientRecord),
		rate:     rate,
		capacity: capacity,
	}

	// Clean up stale clients periodically
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		for range ticker.C {
			rl.mu.Lock()
			now := time.Now()
			for ip, record := range rl.clients {
				if now.Sub(record.lastRefill) > 10*time.Minute {
					delete(rl.clients, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl
}

func (rl *RateLimiter) Limit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ip := getIP(r)

		rl.mu.Lock()
		record, exists := rl.clients[ip]
		now := time.Now()

		if !exists {
			record = &clientRecord{
				tokens:     rl.capacity - 1,
				lastRefill: now,
			}
			rl.clients[ip] = record
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		elapsed := now.Sub(record.lastRefill).Seconds()
		record.tokens += elapsed * rl.rate
		if record.tokens > rl.capacity {
			record.tokens = rl.capacity
		}
		record.lastRefill = now

		if record.tokens < 1 {
			rl.mu.Unlock()
			w.Header().Set("Retry-After", "5")
			responses.Error(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "Too many requests. Please wait a few seconds before retrying.", nil)
			return
		}

		record.tokens -= 1
		rl.mu.Unlock()

		next.ServeHTTP(w, r)
	})
}

func getIP(r *http.Request) string {
	forwarded := r.Header.Get("X-Forwarded-For")
	if forwarded != "" {
		parts := strings.Split(forwarded, ",")
		return strings.TrimSpace(parts[0])
	}
	realIP := r.Header.Get("X-Real-IP")
	if realIP != "" {
		return realIP
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
