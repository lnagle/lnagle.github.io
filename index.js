const collections = require("metalsmith-collections"),
    layouts = require("metalsmith-layouts"),
    less = require("metalsmith-less"),
    markdown = require("metalsmith-markdown"),
    metalsmith = require("metalsmith"),
    permalinks = require("metalsmith-permalinks"),
    serve = require("metalsmith-serve");

metalsmith(__dirname)
    .metadata({
        title: "Lucas Nagle"
    })
    .source("./src")
    .destination("./build")
    .clean(true)
    .use(collections({
        cases: {
            pattern: "cases/**/*.md",
            sortBy: "order",
            reverse: true
        },
        certifications: {
            pattern: "certifications/**/*.md",
            reverse: true
        }
    }))
    .use(markdown())
    .use(permalinks())
    .use(layouts({
        engine: "handlebars",
        directory: "./layouts",
        default: "index.html",
        partials: {
            about: "partials/about"
        },
        pattern: [
            "*/*/*html",
            "*/*html",
            "*html"
        ]
    }))
    .use(less({
        pattern: "less/*.less",
        render: {
            paths: [
                "./src/less"
            ]
        }
    }))
    .use(serve({
        port: 8080,
        verbose: true
    }))
    .build((err) => {
        if (err) {
            throw err;
        }

        // console.log("Files from index.js:");
        // console.log(files);
    });

