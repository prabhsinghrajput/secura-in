const fs = require('fs');
const path = require('path');

function processDir(dir) {
    fs.readdirSync(dir, { withFileTypes: true }).forEach(dirent => {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') && !fullPath.includes('node_modules')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            
            // Regex to find <input, <textarea, <select without a text-[color] class
            content = content.replace(/<(input|textarea|select)([^>]*)className="([^"]*)"/g, (match, tag, beforeClass, classStr) => {
                if (!classStr.includes('text-slate-') && !classStr.includes('text-stone-') && !classStr.includes('text-black')) {
                    modified = true;
                    return `<${tag}${beforeClass}className="${classStr} text-stone-900"`;
                }
                return match;
            });

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Updated', fullPath);
            }
        }
    });
}

processDir('./src/app');
