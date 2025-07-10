
TS_SOURCES = main.ts
OUT_FILE = main.js
TSC = tsc

# ---- OS Detection ----
ifeq ($(OS),Windows_NT)
    # Windows
    RM = powershell -Command "Remove-Item -ErrorAction Ignore -Force"
    OPEN = cmd /c start
    NULL = nul
else
    # Linux/Mac
    RM = rm -f
    OPEN = open
    NULL = /dev/null
endif

.PHONY: all build clean run watch help

all: build

build:
	@echo "Compiling TypeScript..."
	@$(TSC)
	@echo "Build complete $(OUT_FILE)"

clean:
	@echo "Cleaning project..."
	@$(RM) $(OUT_FILE) 2> $(NULL)
	@$(RM) *.map 2> $(NULL)
	@echo "Project cleaned"

run: build
	@echo "Starting game..."
	@$(OPEN) index.html

help:
	@echo "Available targets:"
	@echo "  build    - Compile TypeScript (default)"
	@echo "  clean    - Remove all generated files"
	@echo "  run      - Build and open game in browser"
	@echo "  help     - Show this help message"