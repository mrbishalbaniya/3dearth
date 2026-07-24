package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"golang.org/x/crypto/bcrypt"

	"github.com/mrbishalbaniya/3dearth/backend/internal/domain"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrEmailTaken         = errors.New("email already registered")
	ErrUnauthorized       = errors.New("unauthorized")
)

type TokenPair struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	ExpiresIn    int64  `json:"expiresIn"`
}

type Claims struct {
	UserID uuid.UUID   `json:"uid"`
	Role   domain.Role `json:"role"`
	jwt.RegisteredClaims
}

type Service struct {
	db           *pgxpool.Pool
	accessSecret []byte
	refreshSecret []byte
	accessTTL    time.Duration
	refreshTTL   time.Duration
}

func NewService(db *pgxpool.Pool, accessSecret, refreshSecret string, accessTTL, refreshTTL time.Duration) *Service {
	return &Service{
		db:            db,
		accessSecret:  []byte(accessSecret),
		refreshSecret: []byte(refreshSecret),
		accessTTL:     accessTTL,
		refreshTTL:    refreshTTL,
	}
}

type RegisterInput struct {
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=8,max=128"`
	DisplayName string `json:"displayName" validate:"required,min=2,max=64"`
}

func (s *Service) Register(ctx context.Context, in RegisterInput) (*domain.User, *TokenPair, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, nil, err
	}
	var id uuid.UUID
	err = s.db.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, display_name)
		VALUES ($1, $2, $3)
		RETURNING id
	`, in.Email, string(hash), in.DisplayName).Scan(&id)
	if err != nil {
		if isUniqueViolation(err) {
			return nil, nil, ErrEmailTaken
		}
		return nil, nil, err
	}
	_, _ = s.db.Exec(ctx, `
		INSERT INTO pilot_profiles (user_id, callsign)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`, id, fmt.Sprintf("N%d", time.Now().Unix()%100000))

	user := &domain.User{
		ID: id, Email: in.Email, DisplayName: in.DisplayName, Role: domain.RolePilot,
	}
	tokens, err := s.issueTokens(ctx, user, "", nil)
	return user, tokens, err
}

type LoginInput struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

func (s *Service) Login(ctx context.Context, in LoginInput, ua string, ip *string) (*domain.User, *TokenPair, error) {
	var u domain.User
	var hash string
	err := s.db.QueryRow(ctx, `
		SELECT id, email, COALESCE(email_verified,false), password_hash, display_name, COALESCE(avatar_url,''), role, created_at, updated_at
		FROM users WHERE email = $1
	`, in.Email).Scan(&u.ID, &u.Email, &u.EmailVerified, &hash, &u.DisplayName, &u.AvatarURL, &u.Role, &u.CreatedAt, &u.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil, ErrInvalidCredentials
		}
		return nil, nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(in.Password)) != nil {
		return nil, nil, ErrInvalidCredentials
	}
	_, _ = s.db.Exec(ctx, `UPDATE users SET last_login_at = now() WHERE id = $1`, u.ID)
	tokens, err := s.issueTokens(ctx, &u, ua, ip)
	return &u, tokens, err
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (*TokenPair, error) {
	sum := sha256.Sum256([]byte(refreshToken))
	tokenHash := hex.EncodeToString(sum[:])
	var userID uuid.UUID
	var role domain.Role
	var expires time.Time
	err := s.db.QueryRow(ctx, `
		SELECT rt.user_id, u.role, rt.expires_at
		FROM refresh_tokens rt
		JOIN users u ON u.id = rt.user_id
		WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL
	`, tokenHash).Scan(&userID, &role, &expires)
	if err != nil {
		return nil, ErrUnauthorized
	}
	if time.Now().After(expires) {
		return nil, ErrUnauthorized
	}
	_, _ = s.db.Exec(ctx, `UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1`, tokenHash)
	u := &domain.User{ID: userID, Role: role}
	return s.issueTokens(ctx, u, "", nil)
}

func (s *Service) ParseAccess(token string) (*Claims, error) {
	parsed, err := jwt.ParseWithClaims(token, &Claims{}, func(t *jwt.Token) (any, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method")
		}
		return s.accessSecret, nil
	})
	if err != nil {
		return nil, ErrUnauthorized
	}
	claims, ok := parsed.Claims.(*Claims)
	if !ok || !parsed.Valid {
		return nil, ErrUnauthorized
	}
	return claims, nil
}

func (s *Service) issueTokens(ctx context.Context, u *domain.User, ua string, ip *string) (*TokenPair, error) {
	now := time.Now()
	accessClaims := Claims{
		UserID: u.ID,
		Role:   u.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   u.ID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(s.accessTTL)),
			Issuer:    "orbit-earth",
		},
	}
	access, err := jwt.NewWithClaims(jwt.SigningMethodHS256, accessClaims).SignedString(s.accessSecret)
	if err != nil {
		return nil, err
	}

	rawRefresh := make([]byte, 32)
	if _, err := rand.Read(rawRefresh); err != nil {
		return nil, err
	}
	refresh := hex.EncodeToString(rawRefresh)
	sum := sha256.Sum256([]byte(refresh))
	_, err = s.db.Exec(ctx, `
		INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
		VALUES ($1, $2, $3, $4, $5::inet)
	`, u.ID, hex.EncodeToString(sum[:]), now.Add(s.refreshTTL), ua, ip)
	if err != nil {
		return nil, err
	}
	return &TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		ExpiresIn:    int64(s.accessTTL.Seconds()),
	}, nil
}

func isUniqueViolation(err error) bool {
	return err != nil && (contains(err.Error(), "duplicate key") || contains(err.Error(), "unique"))
}

func contains(s, sub string) bool {
	return len(s) >= len(sub) && (s == sub || len(sub) == 0 ||
		(func() bool {
			for i := 0; i+len(sub) <= len(s); i++ {
				if s[i:i+len(sub)] == sub {
					return true
				}
			}
			return false
		})())
}
