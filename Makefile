.PHONY: default test coverage coverage_minimal

NODE_VERSION := $(shell node -v | awk -F. '{sub(/v/,""); print $$1}')

default: test

coverage:
	-rm -rf coverage
	npm run coverage:run
	npm run coverage:html

coverage_minimal:
	-rm -rf coverage
	npm run coverage:minimal
	npm run coverage:html

test:
	npm run clean
	npm run build
	npm run coverage:run
	npm run coverage:html

