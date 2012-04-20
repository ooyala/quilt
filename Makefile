REPORTER = spec

test:
	@./node_modules/.bin/mocha -R $(REPORTER)

test-cov: lib-cov
	@mkdir -p report
	@QUILT_COV=1 $(MAKE) test REPORTER=html-cov >report/coverage.html

lib-cov:
	@jscoverage --no-highlight lib lib-cov

clean:
	@rm -rf report lib-cov

.PHONY: test
