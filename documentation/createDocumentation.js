const fs = require('fs');
const jsdoc2md = require('jsdoc-to-markdown')


var renderOptions = {
    template: fs.readFileSync('documentation/README.hbs', 'utf8'),
    configure: 'documentation/documentation.conf',
    files: ['*']
};


jsdoc2md.render(renderOptions).then(function(renderedMarkdown) {
    fs.writeFile('README.md', renderedMarkdown, (err) => {
        // throws an error, you could also catch it here
        if (err) throw err;
    
        // success case, the file was saved
    });
});

