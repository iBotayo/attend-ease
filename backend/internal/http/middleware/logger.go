package middleware

import (
	"log"
	"net/http"
	"runtime/debug"
	"time"

	"attendease/internal/http/responses"
)

type responseRecorder struct {
	http.ResponseWriter
	statusCode int
	bytesWritten int
}

func (rec *responseRecorder) WriteHeader(code int) {
	rec.statusCode = code
	rec.ResponseWriter.WriteHeader(code)
}

func (rec *responseRecorder) Write(b []byte) (int, error) {
	if rec.statusCode == 0 {
		rec.statusCode = http.StatusOK
	}
	n, err := rec.ResponseWriter.Write(b)
	rec.bytesWritten += n
	return n, err
}

func Logger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &responseRecorder{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(rec, r)

		duration := time.Since(start)
		log.Printf("[HTTP] %s %s %d %s %s",
			r.Method,
			r.URL.Path,
			rec.statusCode,
			duration,
			r.RemoteAddr,
		)
	})
}

func Recovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("[PANIC RECOVERED] %v\nStack trace:\n%s", rec, debug.Stack())
				responses.InternalServerError(w, "A fatal server error occurred while processing your request.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
