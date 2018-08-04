.PHONY: default test test_fast coverage coverage_fast

NODE_VERSION := $(shell node -v | awk -F. '{sub(/v/,""); print $$1}')

default: test

coverage:
	-rm -rf coverage
	npm run coverage:run
	npm run coverage:html

coverage_fast:
	-rm -rf coverage
	npm run coverage:run -- --grep imported --invert
	npm run coverage:html


test_fast:
	npm run test:run -- --grep imported --invert

test:
	npm run clean
	npm run build
	npm run test:run
	@echo nodejs=$(NODE_VERSION)
	@if [ "$(NODE_VERSION)" -gt 6 ]; then npm run coverage:run; fi

