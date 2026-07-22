const { src, dest } = require('gulp');

// Copies node/credential SVG icons into the compiled dist folder so n8n can
// serve them alongside the JavaScript.
function buildIcons() {
	return src('nodes/**/*.{png,svg}').pipe(dest('dist/nodes'));
}

exports['build:icons'] = buildIcons;
