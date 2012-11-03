BIN = node_modules/.bin
TESTS = test/*.test.coffee


all: docs squel.min.js


squel.js: src/squel.coffee
	$(BIN)/coffee -c -o . $?

squel.min.js: squel.js
	$(BIN)/uglifyjs -o $@ $?

docs/squel.html: src/squel.coffee
	$(BIN)/docco $?


test:
	$(BIN)/mocha $(TESTS)

docs: docs/squel.html

clean_docs:
	rm -rf docs

clean_js:
	rm *.js

clean: clean_docs clean_js


.PHONY: test docs all clean clean_docs clean_js

