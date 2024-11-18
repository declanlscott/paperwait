package utils

import (
	"math/rand"
	"strings"
)

const charset = "2346789abcdefghijkmnpqrtwxyz"

func RandomString(length int) string {
	var sb strings.Builder
	for i := 0; i < length; i++ {
		sb.WriteByte(charset[rand.Intn(len(charset))])
	}
	return sb.String()
}
