# sutysisku-reporter

[![Build Status](https://travis-ci.org/microfeedback/microfeedback-github.svg?branch=master)](https://travis-ci.org/microfeedback/microfeedback-github)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLa-Lojban%2Fsutysisku-reporter.git&env=GH_TOKEN,ALLOWED_REPOS,REPO&project-name=sutysisku-reporter)
[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

An easily-deployable microservice for collecting user feedback from la sutysisku as GitHub issues.

## Documentation

https://microfeedback.js.org/backends/microfeedback-github/

## Development

* Fork and clone this repo. `cd` into the project directory.
* `npm install`
* Copy `.env.example`: `cp .env.example .env`
* (Optional) Update `GH_TOKEN`, `REPO` in `.env`.
* To run tests: `npm test`
* To run the server with auto-reloading and request logging: `npm run dev`

### Debugging in tests with iron-node

Add `debugger` statements, then run the following:

```
npm i -g iron-node
npm run test:debug
```

## Related

- [microfeedback-jira](https://github.com/microfeedback/microfeedback-jira)
- [microfeedback-core](https://github.com/microfeedback/microfeedback-core)

## License

MIT Licensed.
