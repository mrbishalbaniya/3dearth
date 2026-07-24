package docs

import (
	_ "embed"
	"net/http"

	"github.com/gin-gonic/gin"
)

//go:embed openapi.yaml
var OpenAPISpec []byte

//go:embed swagger.html
var SwaggerHTML []byte

// Mount registers Swagger UI at /docs and the raw spec at /openapi.yaml.
func Mount(r gin.IRoutes) {
	r.GET("/openapi.yaml", func(c *gin.Context) {
		c.Data(http.StatusOK, "application/yaml; charset=utf-8", OpenAPISpec)
	})
	r.GET("/docs", func(c *gin.Context) {
		c.Data(http.StatusOK, "text/html; charset=utf-8", SwaggerHTML)
	})
	r.GET("/docs/", func(c *gin.Context) {
		c.Redirect(http.StatusFound, "/docs")
	})
}
