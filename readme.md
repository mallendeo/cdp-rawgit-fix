# CodePen rawgit fix

This scans all your pens and tells you if any is using a rawgit asset or library.
Then it tries to find a jsdelivr alternative link.

*From https://rawgit.com/*

> GitHub repositories that served content through RawGit within the last month will continue to be served until at least October of 2019. URLs for other repositories are no longer being served. If you're currently using RawGit, please stop using it as soon as you can.

## Usage

Install with `npm i -g cdp-rawgit-fix` or `yarn global add cdp-rawgit-fix`

```bash
$ cdp-rawgit-fix your_username
```

e.g

```bash
$ cdp-rawgit-fix mallendeo
```

## License

MIT