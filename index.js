#!/usr/bin/env node
"use strict";

const fs = require("fs");
const util = require("util");
const child_process = require("child_process");
const CleanCSS = require("clean-css");

const pkg = require("./package");
const fontVersion = pkg.version.split(".")[2];

const styles = ["1p", "2p", "1c", "2c", "1m", "2m", "1mn"];
const weights = Object.entries({
	thin: 100,
	light: 300,
	regular: 400,
	medium: 500,
	bold: 700,
	heavy: 800,
	black: 900,
});

const write = util.promisify(fs.writeFile);
const spawn = (...args) => new Promise((resolve, reject) => {
	const child = child_process.spawn(...args);
	child.on("exit", resolve);
	child.on("error", reject);
});

const writeCSS = style => ([weightName, weight]) => `
@font-face {
  font-family: 'mplus-${style}';
  font-style: normal;
  font-weight: ${weight};
  src: url(fonts/mplus-${style}-${weightName}.eot);
  src: url(fonts/mplus-${style}-${weightName}.eot?#iefix) format('embedded-opentype'),
       url(fonts/mplus-${style}-${weightName}.woff2) format('woff2'),
       url(fonts/mplus-${style}-${weightName}.woff) format('woff'),
       url(fonts/mplus-${style}-${weightName}.ttf) format('truetype');
}
`;

void async function main() {
	await spawn(
		"sh",
		["-c", `curl http://jaist.dl.osdn.jp/mplus-fonts/62344/mplus-TESTFLIGHT-${fontVersion}.tar.xz | tar Jxvf - && mv mplus-TESTFLIGHT-${fontVersion} mplus`],
		{stdio: "inherit"}
	);

	for(const style of styles){
		const dir = `packages/mplus-${style}`;
		await spawn("sh", ["-c", `mkdir -p ${dir}/fonts`], {stdio: "inherit"});

		const wl = weights.slice(0, /m/.test(style) ? 5 : 7)
		const css = wl.map(writeCSS(style)).reduce((a, b) => a + b, "");

		const pkgInfo = Object.assign({}, pkg);
		delete pkgInfo.devDependencies;
		pkgInfo.name += `-${style}`;
		pkgInfo.description += ` (${style})`;

		await Promise.all(
			wl.map(([weightName]) => spawn("fontforge", ["-script", "../../convert_fonts.pe", `mplus-${style}-${weightName}.ttf`], {stdio: "inherit", cwd: dir}))
			.concat([
				write(`${dir}/index.css`, css),
				write(`${dir}/index.min.css`, new CleanCSS().minify(css).styles),
				write(`${dir}/package.json`, JSON.stringify(pkgInfo, null, 2)),
				spawn("sh", ["-c", `sed -E 's/ (mplus-${style}) / **\\1** /' README.md > ${dir}/README.md`], {stdio: "inherit"}),
			])
		);

		await spawn("sh", ["-c", `rm ${dir}/fonts/*.afm`], {stdio: "inherit"});
	}
}();
