package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env          string
	Port         int
	AppURL       string
	FrontendURLs []string

	// MySQL Database
	DBHost            string
	DBPort            int
	DBUser            string
	DBPassword        string
	DBName            string
	DBMaxOpenConns    int
	DBMaxIdleConns    int
	DBConnMaxLifetime time.Duration

	// Authentication & Security
	JWTSecret       string
	TokenDuration   time.Duration
	SessionCookie   string
	SecureCookies   bool
	Argon2Memory    uint32
	Argon2Time      uint32
	Argon2Threads   uint8
	Argon2KeyLen    uint32

	// Biometrics & AI Service
	// BiometricEnabled is false until a face-matching service is deployed. While false,
	// face results are treated as demo data and never cause a check-in to be rejected.
	BiometricEnabled    bool
	BiometricServiceURL string
	BiometricTimeout    time.Duration
	FaceScoreThreshold  float64

	// Mailer
	MailDriver string
	MailFrom   string

	// Storage & Logging
	LogLevel string
}

func Load() (*Config, error) {
	cfg := &Config{
		Env:          getEnv("APP_ENV", "development"),
		Port:         getEnvAsInt("APP_PORT", 8080),
		AppURL:       getEnv("APP_URL", "http://localhost:8080"),
		FrontendURLs: strings.Split(getEnv("FRONTEND_URLS", "http://localhost:3000,http://127.0.0.1:3000"), ","),

		DBHost:            getEnv("DB_HOST", "localhost"),
		DBPort:            getEnvAsInt("DB_PORT", 3306),
		DBUser:            getEnv("DB_USER", "attend_ease_user"),
		DBPassword:        getEnv("DB_PASSWORD", "attend_ease_dev_secret_2026"),
		DBName:            getEnv("DB_NAME", "attend_ease"),
		DBMaxOpenConns:    getEnvAsInt("DB_MAX_OPEN_CONNS", 25),
		DBMaxIdleConns:    getEnvAsInt("DB_MAX_IDLE_CONNS", 10),
		DBConnMaxLifetime: time.Duration(getEnvAsInt("DB_CONN_MAX_LIFETIME_MINUTES", 15)) * time.Minute,

		JWTSecret:     getEnv("JWT_SECRET", "attend-ease-dev-super-secure-jwt-secret-key-32chars"),
		TokenDuration: time.Duration(getEnvAsInt("TOKEN_DURATION_HOURS", 24)) * time.Hour,
		SessionCookie: getEnv("SESSION_COOKIE_NAME", "attend_ease_session"),
		SecureCookies: getEnvAsBool("SECURE_COOKIES", false),

		// Standard Argon2id OWASP recommended parameters for interactive logins
		Argon2Memory:  64 * 1024, // 64 MB
		Argon2Time:    3,         // 3 iterations
		Argon2Threads: 2,         // 2 threads
		Argon2KeyLen:  32,

		BiometricEnabled:    getEnvAsBool("BIOMETRIC_ENABLED", false),
		BiometricServiceURL: getEnv("BIOMETRIC_SERVICE_URL", "http://localhost:5001"),
		BiometricTimeout:    time.Duration(getEnvAsInt("BIOMETRIC_TIMEOUT_SECONDS", 5)) * time.Second,
		FaceScoreThreshold:  getEnvAsFloat("FACE_SCORE_THRESHOLD", 0.85),

		MailDriver: getEnv("MAIL_DRIVER", "log"), // "log", "smtp"
		MailFrom:   getEnv("MAIL_FROM", "noreply@attendease.internal"),

		LogLevel: getEnv("LOG_LEVEL", "debug"),
	}

	if err := cfg.validate(); err != nil {
		return nil, fmt.Errorf("config validation error: %w", err)
	}

	return cfg, nil
}

func (c *Config) DSN() string {
	return fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?charset=utf8mb4&parseTime=true&loc=Local",
		c.DBUser,
		c.DBPassword,
		c.DBHost,
		c.DBPort,
		c.DBName,
	)
}

func (c *Config) validate() error {
	if c.Port < 1 || c.Port > 65535 {
		return fmt.Errorf("invalid APP_PORT: %d", c.Port)
	}
	if len(c.JWTSecret) < 32 && c.Env == "production" {
		return fmt.Errorf("JWT_SECRET must be at least 32 characters in production")
	}
	if c.DBName == "" {
		return fmt.Errorf("DB_NAME is required")
	}
	return nil
}

func getEnv(key, defaultVal string) string {
	if val, ok := os.LookupEnv(key); ok && val != "" {
		return val
	}
	return defaultVal
}

func getEnvAsInt(key string, defaultVal int) int {
	valStr := getEnv(key, "")
	if val, err := strconv.Atoi(valStr); err == nil {
		return val
	}
	return defaultVal
}

func getEnvAsFloat(key string, defaultVal float64) float64 {
	valStr := getEnv(key, "")
	if val, err := strconv.ParseFloat(valStr, 64); err == nil {
		return val
	}
	return defaultVal
}

func getEnvAsBool(key string, defaultVal bool) bool {
	valStr := getEnv(key, "")
	if val, err := strconv.ParseBool(valStr); err == nil {
		return val
	}
	return defaultVal
}
