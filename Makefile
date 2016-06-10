# Project target files
#
TARGETS = \
	lib/client.min.js    \
	lib/endpoints.min.js \
	lib/auth.min.js      \
	lib/errors.min.js    \
	lib/spec.min.js

# Project source files
#
SOURCE = \
	lib/client.js    \
	lib/endpoints.js \
	lib/auth.js      \
	lib/errors.js    \
	lib/spec.js

.PHONY: all clean fake publish test test-util test-extended test-kubernetes test-oshift

all : $(TARGETS)

# Publish the project to NPM
#
publish : all
	npm publish

# Create a tar file of the project
#
tar :
	npm pack

# Run project unit tests
#
test : test-util test-kubernetes test-extended

# Test utility methods
#
test-util : all
	node_modules/.bin/mocha --timeout $(TIMEOUT) --recursive test/util

# Test extended methods
#
test-extended : all
	node_modules/.bin/mocha --timeout $(TIMEOUT) --recursive test/extended

# Test core Kubernetes methods
#
test-kubernetes : all
	node_modules/.bin/mocha --timeout $(TIMEOUT) --recursive test/kubernetes

# Test core OpenShift methods
#
test-oshift : all
	node_modules/.bin/mocha --timeout $(TIMEOUT) --recursive test/oshift

# Generate project documentation using JSDoc and the jsdoc-oblivion theme
#
docs : node_modules/.bin/jsdoc $(SOURCE) jsdoc.conf.json
	node_modules/.bin/jsdoc -c jsdoc.conf.json --verbose

# Pretend to minimize by creating symbolic links
#
fake :
	ln -sf client.js lib/client.min.js
	ln -sf endpoints.js lib/endpoints.min.js
	ln -sf auth.js lib/auth.min.js

# Remove target files and documentation
#
clean :
	rm -rf $(TARGETS) docs/*.html docs/scripts docs/styles

# Minimize the target javascript file using uglifyjs
#
%.min.js : %.js node_modules/.bin/uglifyjs
	node_modules/.bin/uglifyjs $< -o $@ -cmv

# Install a missing npm package
#
node_modules/.bin/uglifyjs :
	npm install uglify-js

node_modules/.bin/jsdoc :
	npm install jsdoc

node_modules/.bin/mocha :
	npm install mocha should
