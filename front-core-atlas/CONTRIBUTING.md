# Welcome to Proteo Front Core contributing guide

First of all thank you for contributing on Proteo Core project, we really appreciate it.

Before you start to contribute, you must read the [Proteo 4 contribution guidelines](http://repos.bancsabadell.com/bitbucket/projects/PP4/repos/docs-eds/browse/docs/05.%20Contributing).

You must follow the next steps for local project installation

- Clone the repo

```cmd
git clone https://bitbucket.apps.devops.aws.bancsabadell.com/scm/p4des/front-core-atlas.git
```

- Install project dependencies

```cmd
pnpm run ci:install
```

- Building the library

```cmd
pnpm run build
```

- Testing your code

```cmd
# To run all the workspace tests:
pnpm ci:test

# To run only the tests for a specific package (ng-bootstrap on this example):
pnpm -F @proteo/ng-bootstrap run test:full
```

## New contributor guide

To get an overview of the project, read the [README](./README.md) file. Here are some resource to help you get started with our technology stack:

- [NPM](https://www.npmjs.com/)
- [PNPM](https://pnpm.io/)
- [Git Feature Branch Workflow](https://www.atlassian.com/git/tutorials/comparing-workflows/feature-branch-workflow)
- [Typescript](https://www.typescriptlang.org/docs/handbook/2/basic-types.html)

## Branch Model

- [See docs](https://developer-portal-int-ns-docs.apps.int.aws.bancsabadell.com/Development/06-Global/software-development-lifecycle)

## Getting started

To start working on the project, you need to make sure you have yarn 2 o upper installed (`yarn -v`). Once you have it, you can install the project dependencies with `yarn install`.

1. Clone the repository
2. Install or update to Node.js v24
3. Install Yarn v2 or higher

## Make a pull request

1. Fork the repository
2. Create a new branch with the Jira ID in the name, like `feature/<Jira-id>` or `bugfix/<Jira-id>`
3. Make the changes you want to commit
4. Commit the changes
5. Rebase the brach on master
6. Push the branch to the remote repository
7. Create a pull request

## Bump versions

First check if exists consistency in the packages, with this command:

```cmd
pnpm run dependency:check
```

If need fix errors:

```cmd
pnpm run dependency:fix
```

Add packages modifies with `changeset` and follow cli steps

```cmd
pnpm run version:add
```

Choose one of the following commands depending on the type of version you want to release in order to bump version of all packages modifications and dependencies:

Regular bump:

```cmd
pnpm run version:bump
```

Snapshot bump:

```cmd
pnpm run version:snapshot --name:EARCH-XXXX
```
