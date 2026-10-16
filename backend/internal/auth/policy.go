package auth

import (
	"crypto/rand"
	"errors"
	"math/big"
	"unicode"
)

// Shared temporary passwords assigned to provisioned accounts. Users holding one of these
// are flagged must_change_password and cannot pick them again.
const (
	DefaultSetupInvitePassword = "Welcome123!"
	DefaultNewEmployeePassword = "AttendEase2026!"
)

var (
	ErrPasswordTooShort    = errors.New("password must be at least 8 characters long")
	ErrPasswordTooLong     = errors.New("password must be at most 128 characters long")
	ErrPasswordNoUpper     = errors.New("password must contain at least one uppercase letter")
	ErrPasswordNoLower     = errors.New("password must contain at least one lowercase letter")
	ErrPasswordNoDigit     = errors.New("password must contain at least one number")
	ErrPasswordIsTemporary = errors.New("password cannot be one of the shared temporary passwords")
)

// ValidatePasswordStrength applies the same rule the registration form enforces:
// 8+ characters with at least one uppercase letter, one lowercase letter, and one number.
func ValidatePasswordStrength(password string) error {
	if len(password) < 8 {
		return ErrPasswordTooShort
	}
	if len(password) > 128 {
		return ErrPasswordTooLong
	}
	if password == DefaultSetupInvitePassword || password == DefaultNewEmployeePassword {
		return ErrPasswordIsTemporary
	}

	var hasUpper, hasLower, hasDigit bool
	for _, r := range password {
		switch {
		case unicode.IsUpper(r):
			hasUpper = true
		case unicode.IsLower(r):
			hasLower = true
		case unicode.IsDigit(r):
			hasDigit = true
		}
	}

	if !hasUpper {
		return ErrPasswordNoUpper
	}
	if !hasLower {
		return ErrPasswordNoLower
	}
	if !hasDigit {
		return ErrPasswordNoDigit
	}
	return nil
}

const (
	tempUpper  = "ABCDEFGHJKLMNPQRSTUVWXYZ"
	tempLower  = "abcdefghijkmnpqrstuvwxyz"
	tempDigits = "23456789"
)

// GenerateTemporaryPassword returns a random 12-character password that satisfies
// ValidatePasswordStrength. Ambiguous characters (0/O, 1/l/I) are excluded so it can be
// read aloud or copied by hand.
func GenerateTemporaryPassword() (string, error) {
	const length = 12
	all := tempUpper + tempLower + tempDigits

	pick := func(set string) (byte, error) {
		n, err := rand.Int(rand.Reader, big.NewInt(int64(len(set))))
		if err != nil {
			return 0, err
		}
		return set[n.Int64()], nil
	}

	buf := make([]byte, 0, length)
	for _, set := range []string{tempUpper, tempLower, tempDigits} {
		c, err := pick(set)
		if err != nil {
			return "", err
		}
		buf = append(buf, c)
	}
	for len(buf) < length {
		c, err := pick(all)
		if err != nil {
			return "", err
		}
		buf = append(buf, c)
	}

	// Fisher-Yates shuffle so the guaranteed characters are not always first.
	for i := len(buf) - 1; i > 0; i-- {
		j, err := rand.Int(rand.Reader, big.NewInt(int64(i+1)))
		if err != nil {
			return "", err
		}
		buf[i], buf[j.Int64()] = buf[j.Int64()], buf[i]
	}
	return string(buf), nil
}
