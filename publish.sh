#!/bin/sh -xe

cd packages

for style in 1p 2p 1c 2c 1m 2m 1mn
do
	cd mplus-$style
	yarn publish --new-version $(cat package.json | grep version | sed -E 's/[^.0-9]//g') || true
	cd ..
done
