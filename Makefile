REPORTER = spec

test:
	@QUILT_TEST=1 ./node_modules/.bin/mocha -R $(REPORTER)

test-cov: lib-cov
	@mkdir -p report
	@QUILT_COV=1 $(MAKE) test REPORTER=html-cov >report/coverage.html

lib-cov: clean
	@jscoverage --no-highlight lib lib-cov

clean:
	@rm -rf report lib-cov

.PHONY: test
